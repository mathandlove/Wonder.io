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
import { buildNavigationGraph } from '@core/navigation/navigationGraphBuilder';
import type { NavigationGraph, NodeId, FrozenNodeSnapshot } from '@core/navigation/navigationGraphTypes';
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
  // Scene source data (backward compatibility - scenes are source, nodes are derived)
  allScenes: Scene[];
  scenes: Scene[]; // Filtered visible scenes

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
  insertScene: (previousSceneId: string | null, scene: Scene) => void;
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
  const [allScenes, setAllScenes] = useState<Scene[]>([]);

  // NAVIGATION GRAPH: Single source of truth for navigation
  const [navigationGraph, setNavigationGraph] = useState<NavigationGraph>({
    byId: {},
    order: [],
    currentId: null,
    lastFrozenNode: null,
    historyVersion: 0,
  });

  // Ref for latest navigation graph (for synchronous access in callbacks)
  const navigationGraphRef = React.useRef<NavigationGraph>(navigationGraph);


  // Build navigation graph from allScenes (single source of truth)
  const baseNavigationGraph = useMemo(() => {
    const state = buildNavigationGraph(allScenes);

    // Apply initialSceneId if provided and valid
    if (initialSceneId && state.sceneRegistry?.byId[initialSceneId]) {
      const sceneInfo = state.sceneRegistry.byId[initialSceneId];
      state.currentId = sceneInfo.firstNodeId;
    }

    return state;
  }, [allScenes, initialSceneId]);

  // Derive visible scenes for backward compatibility
  const visibleScenes = useMemo(
    () => allScenes.filter(scene => !scene.hidden),
    [allScenes]
  );

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

  // Sync navigationGraph with baseNavigationGraph when scenes change
  React.useEffect(() => {
    setNavigationGraphWithRef(baseNavigationGraph);
  }, [baseNavigationGraph, setNavigationGraphWithRef]);

  // Update ref to always have the latest navigationGraph
  React.useEffect(() => {
    navigationGraphRef.current = navigationGraph;
  }, [navigationGraph]);

  // =============================================================================
  // HELPER FUNCTIONS: Node access via pointers
  // =============================================================================

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
  // SCENE COLLECTION MANAGEMENT
  // (Scenes are the source data - nodes are built from scenes)
  // =============================================================================

  const setScenes = useCallback((scenes: Scene[]) => {
    setAllScenes(scenes);
  }, []);

  /**
   * Insert a scene after a specific scene (sceneId-based)
   * This will rebuild the node graph to include the new scene's nodes
   */
  const insertScene = useCallback((previousSceneId: string | null, scene: Scene) => {
    setAllScenes(prevScenes => {
      // Find the index of the previous scene
      const previousIndex = previousSceneId
        ? prevScenes.findIndex(s => {
            const sceneWithId = s as Scene & { sceneId?: string };
            return sceneWithId.sceneId === previousSceneId;
          })
        : -1;

      if (previousSceneId && previousIndex === -1) {
        console.warn('[NodeManager] insertScene: previousSceneId not found:', previousSceneId);
        return prevScenes;
      }

      // Insert after the previous scene (or at beginning if previousSceneId is null)
      const insertIndex = previousIndex + 1;
      const newScenes = [...prevScenes];
      newScenes.splice(insertIndex, 0, scene);

      return newScenes;
    });
  }, []);

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
      };
    });

    return insertAfter ? newNodeId : currentNode.id;
  }, [navigationGraph, setNavigationGraphWithRef]);

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
    setNavigationGraphWithRef(newState);

    // Phase 2: Schedule compaction after animation duration
    const TRANSITION_DURATION_MS = 2000;
    const BUFFER_MS = 500;

    window.setTimeout(() => {
      setNavigationGraphWithRef(prevState => compactNode(prevState, nodeId));
    }, TRANSITION_DURATION_MS + BUFFER_MS);
  }, [setNavigationGraphWithRef]);

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

    // Find next active node based on direction
    const nextActiveNode = direction === 'forward'
      ? findNextActiveNode(currentState, currentNodeId)
      : findPrevActiveNode(currentState, currentNodeId);

    if (!nextActiveNode) {
      console.warn('[forceAdvanceNavigation] ⚠️  No active node in direction:', direction);
      return; // At head or tail
    }

    // CRITICAL: Capture frozen snapshot FIRST, before any mutations
    // This preserves character data for exit animations, even if node gets deleted
    const frozenSnapshot = createFrozenSnapshot(currentNodeId);

    // SKIP-BACK REWIRING: Only mark for removal when navigating forward within the same scene
    // This collapses intra-scene states (e.g., quest-basic → quest-showing → quest-accepted)
    // Cross-scene navigation preserves history for backward navigation
    if (direction === 'forward') {
      const isSameScene = currentNode.sceneId === nextActiveNode.sceneId;

      if (isSameScene) {
        // Delete the current node (rewires neighbors + schedules compaction)
        deleteNode(currentNodeId);
      }
      // Cross-scene: do NOT mark for removal - preserve for backward navigation
    }

    // Update currentId to point to the new node, save frozen snapshot
    setNavigationGraphWithRef(prevState => ({
      ...prevState,
      currentId: nextActiveNode.id,
      lastFrozenNode: frozenSnapshot,
      historyVersion: prevState.historyVersion + 1,
    }));

  }, [
    createFrozenSnapshot,
    deleteNode,
    setNavigationGraphWithRef,
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
    // Scene collection
    allScenes,
    scenes: visibleScenes,

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
    insertScene,
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
    allScenes,
    visibleScenes,
    navigationGraph,
    getCurrentNodeId,
    getCurrentNode,
    getCurrentScene,
    getCurrentSceneId,
    createFrozenSnapshot,
    setScenes,
    insertScene,
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
