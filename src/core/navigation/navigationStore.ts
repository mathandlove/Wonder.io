/**
 * Navigation Store - Zustand-based atomic navigation state management
 *
 * This store replaces the React Context + Ref pattern with atomic state transitions.
 * Each action performs exactly ONE `set()` call (except scheduled phase-2 deletions).
 *
 * Key Benefits:
 * - Atomic updates: One state transition = one set call
 * - No ref/context synchronization issues
 * - Selector-based subscriptions: Components only re-render when their slice changes
 * - Time-travel debugging via Redux DevTools
 * - Framework-agnostic: Can be used outside React
 *
 * Architecture:
 * - State: graph, currentId, lastFrozenNode
 * - Actions: setScenes, insertSceneNodes, addStateToCurrentNode, updateNodeState,
 *           updateSceneTextByRecordingId, deleteNode, advance, forceAdvance
 * - Middlewares: devtools → subscribeWithSelector
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { ulid } from 'ulid';
import type { Scene } from '@core/types/scene';
import type {
  NavigationGraph,
  NodeId,
  SceneId,
  FrozenNodeSnapshot,
  NavigationHistoryEntry,
  NodeLifecycleEvent,
} from '@core/navigation/navigationGraphTypes';
import {
  buildNavigationGraph,
  expandSceneToNodes,
  getNodeById,
} from '@core/navigation/navigationGraphBuilder';
import {
  markNodeForRemoval,
  compactNode,
  findNextActiveNode,
  findPrevActiveNode,
} from '@core/navigation/navigationGraphOperations';

/**
 * Determine scroll locks based purely on the current node's state
 * Locks are state-dependent, not preserved from previous states
 */
export function getLocksForState(state: SceneState): { lockForward: boolean; lockBackward: boolean } {
  // Default: no locks
  if (state.type === 'static') {
    return { lockForward: false, lockBackward: false };
  }

  if (state.type === 'image') {
    // Image states allow free scrolling to reveal caption
    return { lockForward: false, lockBackward: false };
  }

  if (state.type === 'dialogue') {
    switch (state.state) {
      // Quest states
      case 'quest-showing':
        return { lockForward: true, lockBackward: true }; // Must accept quest

      // Input states
      case 'input-basic':
        return { lockForward: false, lockBackward: false }; // Can scroll freely
      case 'input-showInput':
        return { lockForward: true, lockBackward: false }; // Must record to continue, can go back
      case 'input-recording':
      case 'input-processing':
      case 'ai-waiting':
        return { lockForward: true, lockBackward: true }; // Cannot navigate during recording/processing/waiting

      // Answer recording states
      case 'record-answer':
      case 'waiting-for-answer-finalize':
      case 'answer-processing':
      case 'answer-waiting':
      case 'answer-right':
      case 'answer-wrong':
        return { lockForward: true, lockBackward: true }; // Cannot navigate during answer feedback

      // Default dialogue states (basic, quest-basic, quest-accepted, etc.)
      default:
        return { lockForward: false, lockBackward: false };
    }
  }

  return { lockForward: false, lockBackward: false };
}

/**
 * Helper to build a navigation history entry
 */
function buildHistoryEntry(
  nodeId: NodeId,
  node: { stateKey: string },
  trigger: 'forward' | 'backward' | 'force-forward' | 'force-backward' | 'initial' | 'scene-change',
  description?: string
): NavigationHistoryEntry {
  return {
    timestamp: Date.now(),
    nodeId,
    stateKey: node.stateKey,
    trigger,
    description,
  };
}

/**
 * Helper to build a lifecycle event
 */
function buildLifecycleEvent(
  type: 'created' | 'deleted' | 'marked-for-deletion',
  nodeId: NodeId,
  node: { stateKey: string },
  context?: string
): NodeLifecycleEvent {
  return {
    timestamp: Date.now(),
    type,
    nodeId,
    stateKey: node.stateKey,
    context,
  };
}

/**
 * Helper to check if two scenes are the same
 */
function sameScene(sceneIdA: SceneId, sceneIdB: SceneId): boolean {
  return sceneIdA === sceneIdB;
}

// =============================================================================
// Store Interface
// =============================================================================

interface NavigationState {
  // Core state
  graph: NavigationGraph;
  currentId: NodeId | null;
  lastFrozenNode: FrozenNodeSnapshot | null;

  // Actions (must match these exact names per spec)
  setScenes: (scenes: Scene[]) => void;
  insertSceneNodes: (afterNodeId: NodeId | null, scene: Scene) => NodeId | null;
  insertNode: (afterNodeId: NodeId | null, node: Omit<Node, 'prevId' | 'nextId'>) => NodeId;
  replaceNode: (oldNodeId: NodeId, newNode: Omit<Node, 'prevId' | 'nextId'>) => NodeId | null;
  addStateToCurrentNode: (newState: SceneState, insertAfter?: boolean) => NodeId | null;
  updateNodeState: (nodeId: NodeId, newState: SceneState) => void;
  updateNodePhase: (nodeId: NodeId, phase: string) => void;
  updateSceneTextByRecordingId: (recordingId: string, newText: string) => void;
  deleteNode: (nodeId: NodeId) => void;
  advance: (direction: 'forward' | 'backward') => void;
  forceAdvance: (direction: 'forward' | 'backward') => void;
}

// =============================================================================
// Store Implementation
// =============================================================================

// Two-phase deletion configuration
const TRANSITION_DURATION_MS = 2000;
const BUFFER_MS = 500;

export const useNavigationStore = create<NavigationState>()(
  subscribeWithSelector(
    devtools((set, get) => ({
      // Initial state
      graph: {
        byId: {},
        order: [],
        currentId: null,
        lastFrozenNode: null,
        historyVersion: 0,
        navigationHistory: [],
        lifecycleEvents: [],
      },
      currentId: null,
      lastFrozenNode: null,

      // =============================================================================
      // Action: setScenes
      // Build a fresh graph from scenes, preserving position by sceneId
      // =============================================================================
      setScenes: (scenes: Scene[]) => {
        set(
          (state) => {
            const newGraph = buildNavigationGraph(scenes);
            let preservedCurrentId = newGraph.currentId;

            // Try to preserve current position by sceneId
            if (state.currentId) {
              const prevNode = state.graph.byId[state.currentId];
              if (prevNode) {
                const newSceneInfo = newGraph.sceneRegistry?.byId[prevNode.sceneId];
                if (newSceneInfo) {
                  preservedCurrentId = newSceneInfo.firstNodeId;
                }
              }
            }

            return {
              graph: {
                ...newGraph,
                currentId: preservedCurrentId,
                navigationHistory: state.graph.navigationHistory || [],
                lifecycleEvents: state.graph.lifecycleEvents || [],
              },
              currentId: preservedCurrentId,
              lastFrozenNode: state.lastFrozenNode,
            };
          },
          false,
          'nav/setScenes'
        );
      },

      // =============================================================================
      // Action: insertSceneNodes
      // Expand scene into nodes, wire pointers, update byId, order, sceneRegistry
      // =============================================================================
      insertSceneNodes: (afterNodeId: NodeId | null, scene: Scene): NodeId | null => {
        let firstNewNodeId: NodeId | null = null;

        set(
          (state) => {
            // Generate or use existing sceneId
            const newSceneId: SceneId = scene.sceneId || ulid();
            if (!scene.sceneId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (scene as any).sceneId = newSceneId;
            }

            // Expand the scene into nodes
            const newNodes = expandSceneToNodes(scene, newSceneId);
            if (newNodes.length === 0) {
              console.warn('[navigationStore] insertSceneNodes: Scene expanded to 0 nodes:', scene);
              return state;
            }

            // Validate insertion point
            if (afterNodeId && !state.graph.byId[afterNodeId]) {
              console.warn('[navigationStore] insertSceneNodes: afterNodeId not found:', afterNodeId);
              return state;
            }

            const insertAfterNode = afterNodeId ? getNodeById(state.graph, afterNodeId) : null;

            // Link the new nodes together (internal scene linking)
            for (let i = 0; i < newNodes.length; i++) {
              const node = newNodes[i];
              node.prevId = i === 0 ? afterNodeId : newNodes[i - 1].id;
              node.nextId =
                i === newNodes.length - 1 ? insertAfterNode?.nextId || null : newNodes[i + 1].id;
            }

            firstNewNodeId = newNodes[0].id;
            const lastNewNodeId = newNodes[newNodes.length - 1].id;

            // Build new graph state (atomic update)
            const newById = { ...state.graph.byId };
            const newOrder = [...state.graph.order];
            const newSceneRegistry = {
              byId: { ...state.graph.sceneRegistry?.byId },
              order: [...(state.graph.sceneRegistry?.order || [])],
            };
            const newLifecycleEvents = [...(state.graph.lifecycleEvents || [])];

            // Add all new nodes to byId and track creation
            for (const node of newNodes) {
              newById[node.id] = node;
              newLifecycleEvents.push(buildLifecycleEvent('created', node.id, node, 'insertSceneNodes'));
            }

            // Rewire the insertion point's next pointer
            if (afterNodeId && newById[afterNodeId]) {
              newById[afterNodeId] = {
                ...newById[afterNodeId],
                nextId: firstNewNodeId,
              };
            }

            // Rewire the next node's prev pointer (if exists)
            const nextNodeId = insertAfterNode?.nextId;
            if (nextNodeId && newById[nextNodeId]) {
              newById[nextNodeId] = {
                ...newById[nextNodeId],
                prevId: lastNewNodeId,
              };
            }

            // Insert into order array
            const insertIndex = afterNodeId ? newOrder.indexOf(afterNodeId) + 1 : 0;
            newOrder.splice(insertIndex, 0, ...newNodes.map((n) => n.id));

            // Update scene registry
            newSceneRegistry.byId[newSceneId] = {
              id: newSceneId,
              firstNodeId: firstNewNodeId,
              lastNodeId: lastNewNodeId,
              nodeCount: newNodes.length,
            };

            // Insert scene into registry order
            let sceneInsertIndex = 0;
            if (insertAfterNode) {
              const afterSceneId = insertAfterNode.sceneId;
              const afterSceneIndex = newSceneRegistry.order.indexOf(afterSceneId);
              sceneInsertIndex =
                afterSceneIndex >= 0 ? afterSceneIndex + 1 : newSceneRegistry.order.length;
            }
            newSceneRegistry.order.splice(sceneInsertIndex, 0, newSceneId);

            return {
              ...state,
              graph: {
                ...state.graph,
                byId: newById,
                order: newOrder,
                sceneRegistry: newSceneRegistry,
                historyVersion: state.graph.historyVersion + 1,
                lifecycleEvents: newLifecycleEvents,
              },
            };
          },
          false,
          'nav/insertSceneNodes'
        );

        return firstNewNodeId;
      },

      // =============================================================================
      // Action: insertNode
      // Insert a single node after a specific node (or at beginning if null)
      // =============================================================================
      insertNode: (afterNodeId: NodeId | null, node: Omit<Node, 'prevId' | 'nextId'>): NodeId => {
        const newNodeId = node.id;

        set(
          (state) => {
            // Validate insertion point
            if (afterNodeId && !state.graph.byId[afterNodeId]) {
              console.warn('[navigationStore] insertNode: afterNodeId not found:', afterNodeId);
              return state;
            }

            const insertAfterNode = afterNodeId ? getNodeById(state.graph, afterNodeId) : null;

            // Build the complete node with prev/next pointers
            const completeNode: Node = {
              ...node,
              prevId: afterNodeId,
              nextId: insertAfterNode?.nextId || null,
            };

            // Build new graph state (atomic update)
            const newById = { ...state.graph.byId };
            const newOrder = [...state.graph.order];
            const newLifecycleEvents = [...(state.graph.lifecycleEvents || [])];

            // Add node to byId and track creation
            newById[newNodeId] = completeNode;
            newLifecycleEvents.push(buildLifecycleEvent('created', newNodeId, completeNode, 'insertNode'));

            // Rewire the insertion point's next pointer
            if (afterNodeId && newById[afterNodeId]) {
              newById[afterNodeId] = {
                ...newById[afterNodeId],
                nextId: newNodeId,
              };
            }

            // Rewire the next node's prev pointer (if exists)
            const nextNodeId = insertAfterNode?.nextId;
            if (nextNodeId && newById[nextNodeId]) {
              newById[nextNodeId] = {
                ...newById[nextNodeId],
                prevId: newNodeId,
              };
            }

            // Insert into order array
            const insertIndex = afterNodeId ? newOrder.indexOf(afterNodeId) + 1 : 0;
            newOrder.splice(insertIndex, 0, newNodeId);

            return {
              ...state,
              graph: {
                ...state.graph,
                byId: newById,
                order: newOrder,
                historyVersion: state.graph.historyVersion + 1,
                lifecycleEvents: newLifecycleEvents,
              },
            };
          },
          false,
          'nav/insertNode'
        );

        return newNodeId;
      },

      // =============================================================================
      // Action: replaceNode
      // Replace an existing node with a new node, preserving all pointer connections
      // The old node is removed and the new node takes its place in the graph
      // =============================================================================
      replaceNode: (oldNodeId: NodeId, newNode: Omit<Node, 'prevId' | 'nextId'>): NodeId | null => {
        const newNodeId = newNode.id;

        set(
          (state) => {
            // Validate old node exists
            const oldNode = getNodeById(state.graph, oldNodeId);
            if (!oldNode) {
              console.warn('[navigationStore] replaceNode: oldNodeId not found:', oldNodeId);
              return state;
            }

            // Build the complete new node with the same prev/next pointers as the old node
            const completeNewNode: Node = {
              ...newNode,
              prevId: oldNode.prevId,
              nextId: oldNode.nextId,
            };

            // Build new graph state (atomic update)
            const newById = { ...state.graph.byId };
            const newOrder = [...state.graph.order];
            const newLifecycleEvents = [...(state.graph.lifecycleEvents || [])];

            // Replace the old node with the new node in byId
            delete newById[oldNodeId];
            newById[newNodeId] = completeNewNode;

            // Track lifecycle events
            newLifecycleEvents.push(buildLifecycleEvent('removed', oldNodeId, oldNode, 'replaceNode'));
            newLifecycleEvents.push(buildLifecycleEvent('created', newNodeId, completeNewNode, 'replaceNode'));

            // Rewire the previous node's next pointer (if exists)
            if (oldNode.prevId && newById[oldNode.prevId]) {
              newById[oldNode.prevId] = {
                ...newById[oldNode.prevId],
                nextId: newNodeId,
              };
            }

            // Rewire the next node's prev pointer (if exists)
            if (oldNode.nextId && newById[oldNode.nextId]) {
              newById[oldNode.nextId] = {
                ...newById[oldNode.nextId],
                prevId: newNodeId,
              };
            }

            // Replace in order array
            const oldIndex = newOrder.indexOf(oldNodeId);
            if (oldIndex !== -1) {
              newOrder[oldIndex] = newNodeId;
            }

            // Update currentId if we're replacing the current node
            const newCurrentId = state.currentId === oldNodeId ? newNodeId : state.currentId;

            return {
              ...state,
              currentId: newCurrentId,
              graph: {
                ...state.graph,
                byId: newById,
                order: newOrder,
                currentId: newCurrentId,
                historyVersion: state.graph.historyVersion + 1,
                lifecycleEvents: newLifecycleEvents,
              },
            };
          },
          false,
          'nav/replaceNode'
        );

        return newNodeId;
      },

      // =============================================================================
      // Action: addStateToCurrentNode
      // Create a new node and rewire, OR replace current node's state
      // =============================================================================
      addStateToCurrentNode: (newState: SceneState, insertAfter: boolean = true): NodeId | null => {
        let resultNodeId: NodeId | null = null;

        set(
          (state) => {
            const currentNodeId = state.currentId;
            if (!currentNodeId) {
              console.warn('[navigationStore] addStateToCurrentNode: No current node');
              return state;
            }

            const currentNode = getNodeById(state.graph, currentNodeId);
            if (!currentNode) {
              console.warn('[navigationStore] addStateToCurrentNode: Current node not found');
              return state;
            }

            const locks = getLocksForState(newState);
            const newNodeId = ulid();

            // Extract stateKey from newState
            let stateKey = 'unknown';
            if (newState.type === 'dialogue') {
              stateKey = `dialogue:${newState.state}`;
            } else if (newState.type === 'image') {
              stateKey = `image:${newState.state}`;
            } else {
              stateKey = newState.type;
            }

            const newById = { ...state.graph.byId };
            const newOrder = [...state.graph.order];
            const newLifecycleEvents = [...(state.graph.lifecycleEvents || [])];

            if (insertAfter) {
              // Create new node
              const newNode = {
                id: newNodeId,
                sceneId: currentNode.sceneId,
                stateKey,
                sceneState: newState,
                scene: currentNode.scene,
                stateMeta: {},
                prevId: currentNode.id,
                nextId: currentNode.nextId,
                status: 'active' as const,
                lockForward: locks.lockForward,
                lockBackward: locks.lockBackward,
              };

              // Update current node's nextId to point to new node
              newById[currentNode.id] = {
                ...newById[currentNode.id],
                nextId: newNodeId,
              };

              // Update next node's prevId to point to new node (if exists)
              if (currentNode.nextId) {
                newById[currentNode.nextId] = {
                  ...newById[currentNode.nextId],
                  prevId: newNodeId,
                };
              }

              // Add new node to byId
              newById[newNodeId] = newNode;

              // Insert into order array
              const currentOrderIndex = newOrder.indexOf(currentNode.id);
              if (currentOrderIndex !== -1) {
                newOrder.splice(currentOrderIndex + 1, 0, newNodeId);
              } else {
                newOrder.push(newNodeId);
              }

              // Track node creation
              newLifecycleEvents.push(buildLifecycleEvent('created', newNodeId, newNode, 'addStateToCurrentNode'));

              resultNodeId = newNodeId;
            } else {
              // Replace current node's state
              newById[currentNode.id] = {
                ...newById[currentNode.id],
                sceneState: newState,
                stateKey,
                lockForward: locks.lockForward,
                lockBackward: locks.lockBackward,
              };

              resultNodeId = currentNode.id;
            }

            return {
              ...state,
              graph: {
                ...state.graph,
                byId: newById,
                order: newOrder,
                historyVersion: state.graph.historyVersion + 1,
                lifecycleEvents: newLifecycleEvents,
              },
            };
          },
          false,
          'nav/addStateToCurrentNode'
        );

        return resultNodeId;
      },

      // =============================================================================
      // Action: updateNodeState
      // Update sceneState, stateKey, and locks for the node
      // =============================================================================
      updateNodeState: (nodeId: NodeId, newState: SceneState) => {
        set(
          (state) => {
            const node = getNodeById(state.graph, nodeId);
            if (!node) {
              console.warn('[navigationStore] updateNodeState: node not found:', nodeId);
              return state;
            }

            const locks = getLocksForState(newState);

            // Extract stateKey from newState
            let stateKey = 'unknown';
            if (newState.type === 'dialogue') {
              stateKey = `dialogue:${newState.state}`;
            } else if (newState.type === 'image') {
              stateKey = `image:${newState.state}`;
            } else {
              stateKey = newState.type;
            }

            const newById = {
              ...state.graph.byId,
              [nodeId]: {
                ...node,
                sceneState: newState,
                stateKey,
                lockForward: locks.lockForward,
                lockBackward: locks.lockBackward,
              },
            };

            return {
              ...state,
              graph: {
                ...state.graph,
                byId: newById,
                historyVersion: state.graph.historyVersion + 1,
              },
            };
          },
          false,
          'nav/updateNodeState'
        );
      },

      // =============================================================================
      // Action: updateNodePhase
      // Update the phase field of a specific node
      // =============================================================================
      updateNodePhase: (nodeId: NodeId, phase: string) => {
        set(
          (state) => {
            const node = getNodeById(state.graph, nodeId);
            if (!node) {
              console.warn('[navigationStore] updateNodePhase: node not found:', nodeId);
              console.warn('[navigationStore] Available node IDs:', state.graph.order.slice(0, 5).map(id => id.substring(0, 8)));
              console.warn('[navigationStore] Current node ID:', state.currentId?.substring(0, 8));
              return state;
            }

            console.log('[navigationStore] Updating node phase:', nodeId.substring(0, 8), '→', phase);

            const newById = {
              ...state.graph.byId,
              [nodeId]: {
                ...node,
                phase,
              },
            };

            return {
              ...state,
              graph: {
                ...state.graph,
                byId: newById,
                historyVersion: state.graph.historyVersion + 1,
              },
            };
          },
          false,
          'nav/updateNodePhase'
        );
      },

      // =============================================================================
      // Action: updateSceneTextByRecordingId
      // Find node whose scene.recordingId === recordingId, update scene.text
      // =============================================================================
      updateSceneTextByRecordingId: (recordingId: string, newText: string) => {
        set(
          (state) => {
            const newById = { ...state.graph.byId };
            let updated = false;

            for (const nodeId of state.graph.order) {
              const node = newById[nodeId];
              const scene = node.scene as Scene & { recordingId?: string };

              if (scene && 'recordingId' in scene && scene.recordingId === recordingId) {
                newById[nodeId] = {
                  ...node,
                  scene: {
                    ...scene,
                    text: newText,
                  },
                };
                updated = true;
                break;
              }
            }

            if (!updated) return state;

            return {
              ...state,
              graph: {
                ...state.graph,
                byId: newById,
                historyVersion: state.graph.historyVersion + 1,
              },
            };
          },
          false,
          'nav/updateSceneTextByRecordingId'
        );
      },

      // =============================================================================
      // Action: deleteNode (two-phase)
      // Phase 1 (immediate): markNodeForRemoval + rewire neighbors, append lifecycle event
      // Phase 2 (deferred): after TRANSITION_DURATION_MS + BUFFER_MS, call compactNode
      // =============================================================================
      deleteNode: (nodeId: NodeId) => {
        const state = get();
        const node = getNodeById(state.graph, nodeId);

        if (!node) {
          console.warn('[navigationStore] deleteNode: node not found:', nodeId);
          return;
        }

        // Phase 1: Mark node and rewire neighbors immediately
        set(
          (prevState) => {
            const { state: newState } = markNodeForRemoval(prevState.graph, nodeId);
            const markEvent = buildLifecycleEvent('marked-for-deletion', nodeId, node, 'deleteNode');

            return {
              ...prevState,
              graph: {
                ...newState,
                lifecycleEvents: [...(newState.lifecycleEvents || []), markEvent],
              },
            };
          },
          false,
          'nav/deleteNode/phase1'
        );

        // Phase 2: Schedule compaction after animation duration
        window.setTimeout(() => {
          set(
            (prevState) => {
              const deleteEvent = buildLifecycleEvent('deleted', nodeId, node, 'compaction after animation');
              return {
                ...prevState,
                graph: {
                  ...compactNode(prevState.graph, nodeId),
                  lifecycleEvents: [...(prevState.graph.lifecycleEvents || []), deleteEvent],
                },
              };
            },
            false,
            'nav/deleteNode/phase2'
          );
        }, TRANSITION_DURATION_MS + BUFFER_MS);
      },

      // =============================================================================
      // Action: advance
      // Read current node; if locked in that direction, return early
      // Delegate to forceAdvance
      // =============================================================================
      advance: (direction: 'forward' | 'backward') => {
        const state = get();
        const currentNodeId = state.currentId;

        if (currentNodeId) {
          const currentNode = getNodeById(state.graph, currentNodeId);

          if (currentNode) {
            if (direction === 'forward' && currentNode.lockForward) {
              return;
            }
            if (direction === 'backward' && currentNode.lockBackward) {
              return;
            }
          }
        }

        // Delegate to forceAdvance for the actual logic
        get().forceAdvance(direction);
      },

      // =============================================================================
      // Action: forceAdvance
      // Snapshot first, compute next, delete current if forward + same scene, update currentId
      // =============================================================================
      forceAdvance: (direction: 'forward' | 'backward') => {
        const state = get();
        const currentNodeId = state.currentId;

        if (!currentNodeId) {
          console.warn('[navigationStore] forceAdvance: No current node ID');
          return;
        }

        const currentNode = getNodeById(state.graph, currentNodeId);
        if (!currentNode) {
          console.error('[navigationStore] forceAdvance: Current node not found:', currentNodeId);
          return;
        }

        // Find next active node based on direction
        const nextActiveNode =
          direction === 'forward'
            ? findNextActiveNode(state.graph, currentNodeId)
            : findPrevActiveNode(state.graph, currentNodeId);

        if (!nextActiveNode) {
          console.warn('[navigationStore] forceAdvance: No active node in direction:', direction);
          return;
        }

        // CRITICAL: Capture frozen snapshot FIRST, before any mutations
        const frozenSnapshot: FrozenNodeSnapshot = {
          nodeId: currentNode.id,
          sceneId: currentNode.sceneId,
          stateKey: currentNode.stateKey,
          scene: currentNode.scene,
        };

        // SKIP-BACK REWIRING: Only mark for removal when navigating forward within the same scene
        if (direction === 'forward') {
          const isSameScene = sameScene(currentNode.sceneId, nextActiveNode.sceneId);

          if (isSameScene) {
            // Delete the current node (rewires neighbors + schedules compaction)
            get().deleteNode(currentNodeId);
          }
        }

        // Create navigation history entry
        const trigger = direction === 'forward' ? 'force-forward' : 'force-backward';
        const historyEntry = buildHistoryEntry(
          nextActiveNode.id,
          nextActiveNode,
          trigger,
          direction === 'forward'
            ? sameScene(currentNode.sceneId, nextActiveNode.sceneId)
              ? 'Same scene (skip-back)'
              : 'New scene'
            : 'Backward navigation'
        );

        // Update currentId, save frozen snapshot, record history (atomic update)
        set(
          (prevState) => ({
            ...prevState,
            currentId: nextActiveNode.id,
            lastFrozenNode: frozenSnapshot,
            graph: {
              ...prevState.graph,
              currentId: nextActiveNode.id,
              lastFrozenNode: frozenSnapshot,
              historyVersion: prevState.graph.historyVersion + 1,
              navigationHistory: [...(prevState.graph.navigationHistory || []), historyEntry],
            },
          }),
          false,
          direction === 'forward' ? 'nav/forceAdvance/forward' : 'nav/forceAdvance/backward'
        );
      },
    }),
    {
      name: 'navigation-store',
    })
  )
);

// =============================================================================
// Selectors (for optimized component subscriptions)
// =============================================================================

/**
 * Selector: Get current node ID
 */
export const selectCurrentNodeId = (state: NavigationState) => state.currentId;

/**
 * Selector: Get current node
 */
export const selectCurrentNode = (state: NavigationState) => {
  if (!state.currentId) return null;
  return getNodeById(state.graph, state.currentId);
};

/**
 * Selector: Get current scene
 */
export const selectCurrentScene = (state: NavigationState) => {
  const node = selectCurrentNode(state);
  return node?.scene as Scene | null;
};

/**
 * Selector: Get current scene ID
 */
export const selectCurrentSceneId = (state: NavigationState) => {
  const node = selectCurrentNode(state);
  return node?.sceneId || null;
};

/**
 * Selector: Get current background ID
 */
export const selectCurrentBackgroundId = (state: NavigationState) => {
  const currentScene = selectCurrentScene(state);
  if (!currentScene) return null;

  if ('background' in currentScene && currentScene.background && currentScene.background.trim() !== '') {
    return currentScene.background;
  }

  return null;
};

/**
 * Selector: Get navigation graph
 */
export const selectNavigationGraph = (state: NavigationState) => state.graph;

/**
 * Selector: Get last frozen node
 */
export const selectLastFrozenNode = (state: NavigationState) => state.lastFrozenNode;
