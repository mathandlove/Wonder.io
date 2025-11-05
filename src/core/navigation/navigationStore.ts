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
 *           updateSceneTextByRecordingId, deleteNode, advance
 * - Middlewares: devtools → subscribeWithSelector
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { ulid } from 'ulid';
import type { Scene } from '@core/types/scene';
import type {
  NavigationGraph,
  Node,
  NodeId,
  FrozenNodeSnapshot,
  NavigationHistoryEntry,
  NodeLifecycleEvent,
  Phase,
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
 * Helper to build a navigation history entry
 */
function buildHistoryEntry(
  nodeId: NodeId,
  trigger: 'forward' | 'backward' | 'force-forward' | 'force-backward' | 'initial' | 'scene-change',
  description?: string
): NavigationHistoryEntry {
  return {
    timestamp: Date.now(),
    nodeId,
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
  updateNodePhase: (nodeId: NodeId, phase: Phase) => void;
  updateSceneProperties: (nodeId: NodeId, updates: Partial<Scene>) => void;
  updateSceneTextByRecordingId: (recordingId: string, newText: string) => void;
  deleteNode: (nodeId: NodeId) => void;
  advance: (direction: 'forward' | 'backward') => void;

  // Convenience methods (assume currentId)
  updateCurrentPhase: (phase: Phase) => void;
  updateCurrentSceneProperties: (updates: Partial<Scene>) => void;
  getCurrentNode: () => Node | null;
  getCurrentSceneType: () => string | null;

  // Phase management (NEW - for phaseSteps navigation)
  advancePhase: (direction: 1 | -1) => boolean;
  canAdvancePhase: (direction: 1 | -1) => boolean;
  getCurrentPhaseInfo: () => { phase: Phase; index: number; steps: readonly Phase[]; canGoNext: boolean; canGoPrev: boolean } | null;
  getCurrentPhase: () => Phase | null;
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
              console.error('[navigationStore] insertSceneNodes: Scene expanded to 0 nodes:', scene);
              return state;
            }

            // Validate insertion point
            if (afterNodeId && !state.graph.byId[afterNodeId]) {
              console.error('[navigationStore] insertSceneNodes: afterNodeId not found:', afterNodeId);
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
              console.error('[navigationStore] insertNode: afterNodeId not found:', afterNodeId);
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
              console.error('[navigationStore] replaceNode: oldNodeId not found:', oldNodeId);
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
      // Action: updateNodePhase
      // Update the phase field of a specific node
      // =============================================================================
      updateNodePhase: (nodeId: NodeId, phase: Phase) => {
        set(
          (state) => {
            const node = getNodeById(state.graph, nodeId);
            if (!node) {
              console.error('[navigationStore] updateNodePhase: node not found:', nodeId);
              return state;
            }

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
      // Action: updateSceneProperties
      // Immutably update scene properties (questionText, answerText, etc.)
      // =============================================================================
      updateSceneProperties: (nodeId: NodeId, updates: Partial<Scene>) => {
        set(
          (state) => {
            const node = getNodeById(state.graph, nodeId);
            if (!node) {
              console.error('[navigationStore] updateSceneProperties: node not found:', nodeId);
              return state;
            }

            // Create new scene object with updates (immutable)
            const updatedScene = {
              ...node.scene,
              ...updates,
            };

            const newById = {
              ...state.graph.byId,
              [nodeId]: {
                ...node,
                scene: updatedScene,
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
          'nav/updateSceneProperties'
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
                  } as Scene,
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
          console.error('[navigationStore] deleteNode: node not found:', nodeId);
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
      // Phase-aware navigation for forward, node-only navigation for backward
      // - Forward: cycles through phases within a node before moving to next node
      // - Backward: skips phase cycling and jumps directly to previous nodes
      // =============================================================================
      advance: (direction: 'forward' | 'backward') => {
        const state = get();
        const currentNodeId = state.currentId;

        if (!currentNodeId) {
          console.error('[navigationStore] advance: No current node ID');
          return;
        }

        // STEP 1: Try to advance phase within current node (ONLY for forward direction)
        if (direction === 'forward') {
          const phaseAdvanced = get().advancePhase(1);

          if (phaseAdvanced) {
            // Successfully advanced phase - stay on current node
            return;
          }
        }

        // STEP 2: Move to next/previous node
        // For forward: phase at boundary - move to next node
        // For backward: skip phases entirely - move to previous node

        const currentNode = getNodeById(state.graph, currentNodeId);
        if (!currentNode) {
          console.error('[navigationStore] advance: Current node not found:', currentNodeId);
          return;
        }

        // Find next active node based on direction
        const nextActiveNode =
          direction === 'forward'
            ? findNextActiveNode(state.graph, currentNodeId)
            : findPrevActiveNode(state.graph, currentNodeId);

        if (!nextActiveNode) {
          // Get the immediate next node (even if not active) for debugging
          const immediateNextNode = currentNode.nextId ? state.graph.byId[currentNode.nextId] : null;
          console.error('[navigationStore] advance: No active node in direction:', direction, {
            currentNodeId,
            currentNodeType: currentNode.scene?.type,
            currentNodeNextId: currentNode.nextId,
            currentNodePrevId: currentNode.prevId,
            immediateNextNode: immediateNextNode ? {
              id: immediateNextNode.id,
              type: immediateNextNode.scene?.type,
              status: immediateNextNode.status,
              phase: immediateNextNode.phase,
            } : null,
            direction,
          });
          return;
        }

        // Capture frozen snapshot for animations
        const frozenSnapshot: FrozenNodeSnapshot = {
          nodeId: currentNode.id,
          scene: currentNode.scene,
        };

        // Create navigation history entry
        const trigger = direction === 'forward' ? 'forward' : 'backward';
        const historyEntry = buildHistoryEntry(
          nextActiveNode.id,
          trigger,
          `${direction} navigation`
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
          direction === 'forward' ? 'nav/advance/forward' : 'nav/advance/backward'
        );


      },


      // =============================================================================
      // Convenience Methods - Assume currentId
      // These methods operate on the current node without requiring explicit nodeId
      // =============================================================================

      /**
       * Update phase of the current node
       * Convenience wrapper around updateNodePhase that assumes currentId
       * Example: updateCurrentPhase('basic')
       */
      updateCurrentPhase: (phase: Phase) => {
        const state = get();
        if (!state.currentId) {
          console.error('[navigationStore] updateCurrentPhase: No current node');
          return;
        }
        get().updateNodePhase(state.currentId, phase);
      },

      /**
       * Update scene properties of the current node
       * Convenience wrapper around updateSceneProperties that assumes currentId
       * Example: updateCurrentSceneProperties({ questionText: 'Hello?', answerText: 'World!' })
       */
      updateCurrentSceneProperties: (updates: Partial<Scene>) => {
        const state = get();
        if (!state.currentId) {
          console.error('[navigationStore] updateCurrentSceneProperties: No current node');
          return;
        }
        get().updateSceneProperties(state.currentId, updates);
      },

      /**
       * Get the current node
       * Convenience method to read the current node without selector
       */
      getCurrentNode: () => {
        const state = get();
        if (!state.currentId) return null;
        return getNodeById(state.graph, state.currentId);
      },

      /**
       * Get the type of the current scene
       * Convenience method for routing decisions
       */
      getCurrentSceneType: () => {
        const node = get().getCurrentNode();
        return node?.scene?.type || null;
      },

      // =============================================================================
      // Phase Management - For phaseSteps navigation
      // =============================================================================

      /**
       * Advance the current node's phase by one step
       * @param direction 1 for forward (next phase), -1 for backward (previous phase)
       * @returns true if phase was advanced, false if at boundary
       */
      advancePhase: (direction: 1 | -1) => {
        const state = get();
        const node = state.getCurrentNode();

        if (!node) {
          console.error('[navigationStore] advancePhase: No current node');
          return false;
        }

        const newIndex = node.phaseIndex + direction;

        // Check bounds
        if (newIndex < 0 || newIndex >= node.phaseSteps.length) {
          return false; // Can't advance in this direction
        }

        const newPhase = node.phaseSteps[newIndex];

        // Update both phase and phaseIndex atomically
        set(
          (prevState) => ({
            ...prevState,
            graph: {
              ...prevState.graph,
              byId: {
                ...prevState.graph.byId,
                [node.id]: {
                  ...node,
                  phase: newPhase,
                  phaseIndex: newIndex
                }
              },
              historyVersion: prevState.graph.historyVersion + 1
            }
          }),
          false,
          `nav/advancePhase/${direction > 0 ? 'forward' : 'backward'}`
        );

        return true;
      },

      /**
       * Check if the current node can advance phase in a direction
       * @param direction 1 for forward, -1 for backward
       * @returns true if advancement is possible
       */
      canAdvancePhase: (direction: 1 | -1) => {
        const node = get().getCurrentNode();
        if (!node) return false;

        const newIndex = node.phaseIndex + direction;
        return newIndex >= 0 && newIndex < node.phaseSteps.length;
      },
      getCurrentPhase: () => {
        const node = get().getCurrentNode();
        if (!node) return null;

        return node.phase
        ;
      },
 

      /**
       * Get current phase information for the current node
       * @returns Phase info object or null if no current node
       */
      getCurrentPhaseInfo: () => {
        const node = get().getCurrentNode();
        if (!node) return null;

        return {
          phase: node.phase,
          index: node.phaseIndex,
          steps: node.phaseSteps,
          canGoNext: node.phaseIndex < node.phaseSteps.length - 1,
          canGoPrev: node.phaseIndex > 0
        };
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
