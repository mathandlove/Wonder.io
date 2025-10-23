/**
 * NodeManager - Navigation graph with double-linked nodes
 *
 * Responsibilities:
 * - Node graph management (navigationGraph with pointer-based traversal)
 * - Current position tracking (currentId for active node)
 * - Navigation helpers (advance forward/backward via pointers)
 * - Scene source data management (scenes are source, nodes are navigation units)
 * - Scene visibility filtering
 * - Automatic node deletion via rewiring (no manual cleanup needed)
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Scene } from '@core/types/scene';
import type { Node, SceneState } from '@core/navigation/types';
import { buildNavigationGraph, expandSceneToNodes } from '@core/navigation/navigationGraphBuilder';
import type { NavigationGraph, NodeId, FrozenNodeSnapshot, SceneId } from '@core/navigation/navigationGraphTypes';
import {
  markNodeForRemoval,
  compactNode,
  findNextActiveNode,
  findPrevActiveNode,
} from '@core/navigation/navigationGraphOperations';
import { getNodeById } from '@core/navigation/navigationGraphBuilder';
import { ulid } from 'ulid';

/**
 * Determine scroll locks based purely on the current node's state
 * Locks are state-dependent, not preserved from previous states
 *
 * Export this so dynamically created navigation items can use it
 */
// eslint-disable-next-line react-refresh/only-export-components
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

export interface NodeManagerType {
  // Node graph navigation (primary system)
  navigationGraph: NavigationGraph;
  getCurrentNodeId: () => NodeId | null;
  getCurrentNode: () => Node | null;
  getCurrentScene: () => Scene | null;
  getCurrentSceneId: () => string | null;

  // Frozen snapshots for animations (pure data, no navigation metadata)
  createFrozenSnapshot: (nodeId: NodeId) => FrozenNodeSnapshot | null;

  // Node management (scenes are source data, nodes are built from scenes)
  setScenes: (scenes: Scene[]) => void;
  insertSceneNodes: (afterNodeId: NodeId | null, scene: Scene) => NodeId | null;
  addStateToCurrentNode: (newState: SceneState, insertAfter?: boolean) => NodeId | null;
  updateNodeState: (nodeId: NodeId, newState: SceneState) => void;
  updateSceneTextByRecordingId: (recordingId: string, newText: string) => void;
  deleteNode: (nodeId: NodeId) => void;

  // Navigation methods (pointer-based)
  advanceNavigation: (direction: 'forward' | 'backward') => void;
  forceAdvanceNavigation: (direction: 'forward' | 'backward') => void;

  // Derived state
  currentBackgroundId: string | null;
}

const NodeManagerContext = createContext<NodeManagerType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useNodeManager(): NodeManagerType {
  const context = useContext(NodeManagerContext);
  if (!context) {
    throw new Error("useNodeManager must be used within NodeManagerProvider");
  }
  return context;
}

interface NodeManagerProviderProps {
  children: React.ReactNode;
  initialSceneId?: string; // Optional: start at specific scene
}

export function NodeManagerProvider({ children, initialSceneId }: NodeManagerProviderProps) {
  // NAVIGATION GRAPH: Single source of truth for navigation
  const [navigationGraph, setNavigationGraph] = useState<NavigationGraph>(() => {
    const graph: NavigationGraph = {
      byId: {},
      order: [],
      currentId: null,
      lastFrozenNode: null,
      historyVersion: 0,
      navigationHistory: [],
      lifecycleEvents: [],
    };

    // Apply initialSceneId if provided and valid
    if (initialSceneId && graph.sceneRegistry?.byId[initialSceneId]) {
      const sceneInfo = graph.sceneRegistry.byId[initialSceneId];
      graph.currentId = sceneInfo.firstNodeId;
    }

    return graph;
  });

  // Ref for latest navigation graph (for synchronous access in callbacks)
  const navigationGraphRef = React.useRef<NavigationGraph>(navigationGraph);

  // Wrapper for setNavigationGraph that keeps ref in sync synchronously
  const setNavigationGraphWithRef = React.useCallback((
    update: NavigationGraph | ((prev: NavigationGraph) => NavigationGraph)
  ) => {
    setNavigationGraph(prev => {
      const newState = typeof update === 'function' ? update(prev) : update;
      // Update ref synchronously so it's immediately available
      navigationGraphRef.current = newState;
      return newState;
    });
  }, []);

  // Update ref to always have the latest navigationGraph
  React.useEffect(() => {
    navigationGraphRef.current = navigationGraph;
  }, [navigationGraph]);

  // =============================================================================
  // HELPER FUNCTIONS: Node access via pointers
  // =============================================================================

  /**
   * Helper to add a navigation history entry
   */
  const addNavigationHistory = useCallback((
    nodeId: NodeId,
    node: { sceneId: SceneId; stateKey: string },
    trigger: 'forward' | 'backward' | 'force-forward' | 'force-backward' | 'initial' | 'scene-change',
    description?: string
  ) => {
    const entry = {
      timestamp: Date.now(),
      nodeId,
      sceneId: node.sceneId,
      stateKey: node.stateKey,
      trigger,
      description,
    };
    return entry;
  }, []);

  /**
   * Helper to add a lifecycle event
   */
  const addLifecycleEvent = useCallback((
    type: 'created' | 'deleted' | 'marked-for-deletion',
    nodeId: NodeId,
    node: { sceneId: SceneId; stateKey: string },
    context?: string
  ) => {
    const event = {
      timestamp: Date.now(),
      type,
      nodeId,
      sceneId: node.sceneId,
      stateKey: node.stateKey,
      context,
    };
    return event;
  }, []);

  const getCurrentNodeId = useCallback((): NodeId | null => {
    return navigationGraph.currentId;
  }, [navigationGraph.currentId]);

  const getCurrentNode = useCallback((): Node | null => {
    const currentNodeId = navigationGraph.currentId;
    if (!currentNodeId) return null;

    const node = getNodeById(navigationGraph, currentNodeId);
    if (!node) return null;


    return {
      nodeId: node.id,
      scene: node.scene as Scene,
      sceneId: node.sceneId,
      sceneState: node.sceneState,
      status: node.status,
    };
  }, [navigationGraph]);

  const getCurrentScene = useCallback((): Scene | null => {
    const node = getCurrentNode();
    return node?.scene || null;
  }, [getCurrentNode]);

  const getCurrentSceneId = useCallback((): string | null => {
    const node = getCurrentNode();
    return node?.sceneId || null;
  }, [getCurrentNode]);

  /**
   * Create a frozen snapshot of a node (pure data, no navigation metadata)
   *
   * This strips out navigation-specific fields (locks, status, pointers, index)
   * and returns only the essential scene/state data needed for animations.
   *
   * @param nodeId - The node to snapshot
   * @returns Frozen snapshot or null if node not found
   */
  const createFrozenSnapshot = useCallback((nodeId: NodeId): FrozenNodeSnapshot | null => {
    const node = getNodeById(navigationGraph, nodeId);
    if (!node) return null;

    return {
      nodeId: node.id,
      sceneId: node.sceneId,
      stateKey: node.stateKey,
      sceneState: node.sceneState,
      scene: node.scene,
    };
  }, [navigationGraph]);

  // Compute current background from current node
  const currentBackgroundId = useMemo(() => {
    const currentScene = getCurrentScene();
    if (!currentScene) return null;

    // Only return background if explicitly defined and not empty
    if ('background' in currentScene &&
        currentScene.background &&
        currentScene.background.trim() !== '') {
      return currentScene.background;
    }

    return null;
  }, [getCurrentScene]);

  // =============================================================================
  // SCENE MANAGEMENT
  // (Scenes are now managed directly through the navigation graph)
  // =============================================================================

  const setScenes = useCallback((scenes: Scene[]) => {
    // Build a fresh navigation graph from scenes
    const newGraph = buildNavigationGraph(scenes);

    setNavigationGraphWithRef(prevState => {
      // Try to preserve current position by sceneId
      let preservedCurrentId = newGraph.currentId; // Default to first node

      if (prevState.currentId) {
        const prevNode = prevState.byId[prevState.currentId];
        if (prevNode) {
          // Find the same scene in the new graph
          const newSceneInfo = newGraph.sceneRegistry?.byId[prevNode.sceneId];
          if (newSceneInfo) {
            // Navigate to the first node of that scene in the new graph
            preservedCurrentId = newSceneInfo.firstNodeId;
          }
        }
      }

      return {
        ...newGraph,
        currentId: preservedCurrentId,
        // Preserve accumulated history across graph rebuilds
        navigationHistory: prevState.navigationHistory || [],
        lifecycleEvents: prevState.lifecycleEvents || [],
      };
    });
  }, [setNavigationGraphWithRef]);

  /**
   * Insert a scene's nodes directly into the navigation graph (synchronous)
   *
   * This directly manipulates the navigation graph without triggering a full rebuild.
   * Use this when you need to navigate immediately after insertion.
   *
   * Pattern similar to addStateToCurrentNode and deleteNode - directly mutates graph.
   *
   * @param afterNodeId - Insert after this node (or at beginning if null)
   * @param scene - Scene to insert (will be expanded into nodes)
   * @returns The first nodeId of the inserted scene, or null if failed
   */
  const insertSceneNodes = useCallback((afterNodeId: NodeId | null, scene: Scene): NodeId | null => {
    // Generate or use existing sceneId
    const newSceneId: SceneId = scene.sceneId || ulid();

    // Ensure the scene has the sceneId set
    if (!scene.sceneId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (scene as any).sceneId = newSceneId;
    }

    // Expand the scene into nodes
    const newNodes = expandSceneToNodes(scene, newSceneId);

    if (newNodes.length === 0) {
      console.warn('[NodeManager] insertSceneNodes: Scene expanded to 0 nodes:', scene);
      return null;
    }

    // Get current graph state
    const graphState = navigationGraphRef.current;

    // Validate and get the insertion point node
    if (afterNodeId && !graphState.byId[afterNodeId]) {
      console.warn('[NodeManager] insertSceneNodes: afterNodeId not found in graph:', afterNodeId);
      return null;
    }

    // Get the insertion point node (or null if inserting at beginning)
    const insertAfterNode = afterNodeId ? getNodeById(graphState, afterNodeId) : null;
    const insertAfterNodeId = afterNodeId;

    // Link the new nodes together (internal scene linking)
    for (let i = 0; i < newNodes.length; i++) {
      const node = newNodes[i];
      node.prevId = i === 0
        ? insertAfterNodeId  // First node links to previous scene's tail
        : newNodes[i - 1].id; // Or previous node in this scene
      node.nextId = i === newNodes.length - 1
        ? (insertAfterNode?.nextId || null) // Last node links to what previous tail pointed to
        : newNodes[i + 1].id; // Or next node in this scene
    }

    const firstNewNodeId = newNodes[0].id;
    const lastNewNodeId = newNodes[newNodes.length - 1].id;

    // Build the new graph state synchronously (use graphState from above)
    const newById = { ...graphState.byId };
    const newOrder = [...graphState.order];
    const newSceneRegistry = {
      byId: { ...graphState.sceneRegistry?.byId },
      order: [...(graphState.sceneRegistry?.order || [])],
    };
    const newLifecycleEvents = [...(graphState.lifecycleEvents || [])];

    // Add all new nodes to byId and track creation
    for (const node of newNodes) {
      newById[node.id] = node;
      newLifecycleEvents.push(addLifecycleEvent('created', node.id, node, 'insertSceneNodes'));
    }

    // Rewire the insertion point's next pointer
    if (insertAfterNodeId && newById[insertAfterNodeId]) {
      console.log('[insertSceneNodes] Rewiring node:', insertAfterNodeId);
      console.log('[insertSceneNodes] Old nextId:', newById[insertAfterNodeId].nextId);
      console.log('[insertSceneNodes] New nextId (recording):', firstNewNodeId);

      newById[insertAfterNodeId] = {
        ...newById[insertAfterNodeId],
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
    const insertIndex = insertAfterNodeId
      ? newOrder.indexOf(insertAfterNodeId) + 1
      : 0;

    newOrder.splice(insertIndex, 0, ...newNodes.map(n => n.id));

    // Update scene registry
    newSceneRegistry.byId[newSceneId] = {
      id: newSceneId,
      firstNodeId: firstNewNodeId,
      lastNodeId: lastNewNodeId,
      nodeCount: newNodes.length,
    };

    // Insert scene into registry order - insert after the scene that contains insertAfterNode
    let sceneInsertIndex = 0;
    if (insertAfterNode) {
      const afterSceneId = insertAfterNode.sceneId;
      const afterSceneIndex = newSceneRegistry.order.indexOf(afterSceneId);
      sceneInsertIndex = afterSceneIndex >= 0 ? afterSceneIndex + 1 : newSceneRegistry.order.length;
    }
    newSceneRegistry.order.splice(sceneInsertIndex, 0, newSceneId);

    // Build the complete new state
    const newState: NavigationGraph = {
      ...graphState,
      byId: newById,
      order: newOrder,
      sceneRegistry: newSceneRegistry,
      historyVersion: graphState.historyVersion + 1,
      lifecycleEvents: newLifecycleEvents,
    };

    // Update both the React state AND the ref synchronously
    navigationGraphRef.current = newState;
    setNavigationGraph(newState);

    return firstNewNodeId;
  }, [addLifecycleEvent]);

  /**
   * Add a new state to the current node
   * Inserts a new node after (or replacing) the current node
   *
   * @param newState - The new state to add
   * @param insertAfter - If true, inserts after current. If false, replaces current.
   * @returns The nodeId of the newly created node, or null if failed
   */
  const addStateToCurrentNode = useCallback((
    newState: SceneState,
    insertAfter: boolean = true
  ): NodeId | null => {
    const currentNodeId = navigationGraph.currentId;
    if (!currentNodeId) {
      console.warn('⚠️ NodeManager.addStateToCurrentNode: No current node');
      return null;
    }

    const currentNode = getNodeById(navigationGraph, currentNodeId);
    if (!currentNode) {
      console.warn('⚠️ NodeManager.addStateToCurrentNode: Current node not found in graph');
      return null;
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

    setNavigationGraphWithRef(prevState => {
      const newById = { ...prevState.byId };
      const newOrder = [...prevState.order];
      const newLifecycleEvents = [...(prevState.lifecycleEvents || [])];

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
        newLifecycleEvents.push(addLifecycleEvent('created', newNodeId, newNode, 'addStateToCurrentNode'));
      } else {
        // Replace current node's state
        newById[currentNode.id] = {
          ...newById[currentNode.id],
          sceneState: newState,
          stateKey,
          lockForward: locks.lockForward,
          lockBackward: locks.lockBackward,
        };
      }

      return {
        ...prevState,
        byId: newById,
        order: newOrder,
        historyVersion: prevState.historyVersion + 1,
        lifecycleEvents: newLifecycleEvents,
      };
    });

    return insertAfter ? newNodeId : currentNode.id;
  }, [navigationGraph, setNavigationGraphWithRef, addLifecycleEvent]);

  /**
   * Update the state of a specific node by nodeId
   */
  const updateNodeState = useCallback((nodeId: NodeId, newState: SceneState) => {
    setNavigationGraphWithRef(prevState => {
      const node = getNodeById(prevState, nodeId);
      if (!node) {
        console.warn('[NodeManager] updateNodeState: node not found:', nodeId);
        return prevState;
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
        ...prevState.byId,
        [nodeId]: {
          ...node,
          sceneState: newState,
          stateKey,
          lockForward: locks.lockForward,
          lockBackward: locks.lockBackward,
        },
      };

      return {
        ...prevState,
        byId: newById,
        historyVersion: prevState.historyVersion + 1,
      };
    });
  }, [setNavigationGraphWithRef]);

  /**
   * Update node's scene text by recordingId (for live transcript updates during recording)
   */
  const updateSceneTextByRecordingId = useCallback((recordingId: string, newText: string) => {
    setNavigationGraphWithRef(prevState => {
      const newById = { ...prevState.byId };
      let updated = false;

      for (const nodeId of prevState.order) {
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

      if (!updated) return prevState;

      return {
        ...prevState,
        byId: newById,
        historyVersion: prevState.historyVersion + 1,
      };
    });
  }, [setNavigationGraphWithRef]);



  // =============================================================================
  // NODE DELETION: Two-phase deletion with rewiring
  // =============================================================================

  /**
   * Delete a node with two-phase removal
   *
   * Phase 1 (Immediate): Mark node as pendingRemoval, rewire neighbors (prev ← next)
   * Phase 2 (Deferred): Compact (physically remove) after 2000ms animation completes
   */
  const deleteNode = useCallback((nodeId: NodeId) => {
    const currentState = navigationGraphRef.current;
    const node = getNodeById(currentState, nodeId);

    if (!node) {
      console.warn('[NodeManager] deleteNode: node not found:', nodeId);
      return;
    }

    // Phase 1: Mark node and rewire neighbors immediately
    const { state: newState } = markNodeForRemoval(currentState, nodeId);

    // Track the marking for deletion
    const markEvent = addLifecycleEvent('marked-for-deletion', nodeId, node, 'skip-back navigation');

    setNavigationGraphWithRef({
      ...newState,
      lifecycleEvents: [...(newState.lifecycleEvents || []), markEvent],
    });

    // Phase 2: Schedule compaction after animation duration
    const TRANSITION_DURATION_MS = 2000;
    const BUFFER_MS = 500;

    window.setTimeout(() => {
      setNavigationGraphWithRef(prevState => {
        // Track the actual deletion
        const deleteEvent = addLifecycleEvent('deleted', nodeId, node, 'compaction after animation');
        return {
          ...compactNode(prevState, nodeId),
          lifecycleEvents: [...(prevState.lifecycleEvents || []), deleteEvent],
        };
      });
    }, TRANSITION_DURATION_MS + BUFFER_MS);
  }, [setNavigationGraphWithRef, addLifecycleEvent]);

  // =============================================================================
  // NODE NAVIGATION: Pointer-based traversal with skip-back rewiring
  // =============================================================================

  /**
   * Force advance navigation with node skip-back rewiring
   *
   * Implements the full skip-back deletion behavior:
   * 1. Begin transition (capture frozen snapshot FIRST)
   * 2. Process pending compactions (clean up before move)
   * 3. Find next/prev active node (skip pendingRemoval nodes)
   * 4. If moving FORWARD within same scene: mark current node for removal + rewire
   * 5. If moving BACKWARD: navigate via prev pointers (already rewired)
   * 6. Update currentId to the new node
   *
   * Bypasses locks but respects the node graph structure.
   */
  const forceAdvanceNavigation = useCallback((direction: 'forward' | 'backward') => {
    const currentState = navigationGraphRef.current;
    const currentNodeId = currentState.currentId;

    console.log('[forceAdvanceNavigation] 📍 Starting navigation');
    console.log('[forceAdvanceNavigation] Direction:', direction);
    console.log('[forceAdvanceNavigation] Current node ID:', currentNodeId);

    if (!currentNodeId) {
      console.warn('[forceAdvanceNavigation] ⚠️  No current node ID');
      return;
    }

    // Get current node from graph
    const currentNode = getNodeById(currentState, currentNodeId);
    if (!currentNode) {
      console.error('[forceAdvanceNavigation] ❌ Current node not found:', currentNodeId);
      return;
    }

    console.log('[forceAdvanceNavigation] Current node:', currentNode);
    console.log('[forceAdvanceNavigation] Current scene ID:', currentNode.sceneId);

    // Find next active node based on direction
    const nextActiveNode = direction === 'forward'
      ? findNextActiveNode(currentState, currentNodeId)
      : findPrevActiveNode(currentState, currentNodeId);

    if (!nextActiveNode) {
      console.warn('[forceAdvanceNavigation] ⚠️  No active node in direction:', direction);
      return; // At head or tail
    }

    console.log('[forceAdvanceNavigation] ✅ Next node found:', nextActiveNode.id);
    console.log('[forceAdvanceNavigation] Next scene ID:', nextActiveNode.sceneId);
    console.log('[forceAdvanceNavigation] Next node:', nextActiveNode);

    // CRITICAL: Capture frozen snapshot FIRST, before any mutations
    // This preserves character data for exit animations, even if node gets deleted
    const frozenSnapshot = createFrozenSnapshot(currentNodeId);

    // SKIP-BACK REWIRING: Only mark for removal when navigating forward within the same scene
    // This collapses intra-scene states (e.g., quest-basic → quest-showing → quest-accepted)
    // Cross-scene navigation preserves history for backward navigation
    if (direction === 'forward') {
      const isSameScene = currentNode.sceneId === nextActiveNode.sceneId;
      console.log('[forceAdvanceNavigation] Same scene?', isSameScene, `(${currentNode.sceneId} === ${nextActiveNode.sceneId})`);

      if (isSameScene) {
        // Delete the current node (rewires neighbors + schedules compaction)
        console.log('[forceAdvanceNavigation] 🗑️  Deleting current node (intra-scene collapse)');
        deleteNode(currentNodeId);
      } else {
        console.log('[forceAdvanceNavigation] ⏭️  Cross-scene navigation - preserving history');
      }
      // Cross-scene: do NOT mark for removal - preserve for backward navigation
    }

    console.log('[forceAdvanceNavigation] 🎯 Navigating to:', nextActiveNode.id);

    // Create navigation history entry
    const trigger = direction === 'forward' ? 'force-forward' : 'force-backward';
    const historyEntry = addNavigationHistory(
      nextActiveNode.id,
      nextActiveNode,
      trigger,
      direction === 'forward'
        ? (currentNode.sceneId === nextActiveNode.sceneId ? 'Same scene (skip-back)' : 'New scene')
        : 'Backward navigation'
    );

    // Update currentId to point to the new node, save frozen snapshot, and record history
    setNavigationGraphWithRef(prevState => ({
      ...prevState,
      currentId: nextActiveNode.id,
      lastFrozenNode: frozenSnapshot,
      historyVersion: prevState.historyVersion + 1,
      navigationHistory: [...(prevState.navigationHistory || []), historyEntry],
    }));

  }, [
    createFrozenSnapshot,
    deleteNode,
    setNavigationGraphWithRef,
    addNavigationHistory,
  ]);

  /**
   * Advance navigation (respects locks)
   */
  const advanceNavigation = useCallback((direction: 'forward' | 'backward') => {
    const currentNodeId = navigationGraph.currentId;
    if (currentNodeId) {
      const currentNode = getNodeById(navigationGraph, currentNodeId);

      if (currentNode) {
        if (direction === 'forward' && currentNode.lockForward) {
          return;
        }
        if (direction === 'backward' && currentNode.lockBackward) {
          return;
        }
      }
    }

    // Delegate to forceAdvanceNavigation for the actual logic
    forceAdvanceNavigation(direction);
  }, [navigationGraph, forceAdvanceNavigation]);

  const contextValue = useMemo((): NodeManagerType => ({
    // Node graph navigation
    navigationGraph,
    getCurrentNodeId,
    getCurrentNode,
    getCurrentScene,
    getCurrentSceneId,

    // Frozen snapshots
    createFrozenSnapshot,

    // Scene management
    setScenes,
    insertSceneNodes,
    addStateToCurrentNode,
    updateNodeState,
    updateSceneTextByRecordingId,
    deleteNode,

    // Navigation methods
    advanceNavigation,
    forceAdvanceNavigation,

    // Derived state
    currentBackgroundId,
  }), [
    navigationGraph,
    getCurrentNodeId,
    getCurrentNode,
    getCurrentScene,
    getCurrentSceneId,
    createFrozenSnapshot,
    setScenes,
    insertSceneNodes,
    addStateToCurrentNode,
    updateNodeState,
    updateSceneTextByRecordingId,
    deleteNode,
    advanceNavigation,
    forceAdvanceNavigation,
    currentBackgroundId,
  ]);

  return (
    <NodeManagerContext.Provider value={contextValue}>
      {children}
    </NodeManagerContext.Provider>
  );
}
