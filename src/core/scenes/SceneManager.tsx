/**
 * SceneManager - Manages scene collection, visibility, and progression state
 *
 * Responsibilities:
 * - Scene collection management (allScenes array)
 * - Scene visibility filtering (hidden scenes)
 * - Scene insertion and dynamic scene creation
 * - Current position tracking (navigationIndex for scene/state pairs)
 * - Navigation array (flat array of scene/state combinations built directly from allScenes)
 * - Navigation helpers (goToIndex, advanceNavigation, etc.)
 * - Derived state (currentBackgroundId, visibleScenes, currentScene)
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Scene } from '@core/types/scene';
import type { NavigationItem, SceneState } from '@core/navigation/types';
import { useTransitionManager } from '@core/navigation/useTransitionManager';
import { buildStateNodeGraph } from '@core/navigation/stateNodeBuilder';
import { navigatorStateToArray } from '@core/navigation/navigatorStateToArray';
import type { NavigatorState, StateNodeId } from '@core/navigation/stateNodeTypes';
import {
  markNodeForRemoval,
  compactNode,
  findNextActiveNode,
  findPrevActiveNode,
  markSceneForRemoval,
  batchCompact,
} from '@core/navigation/stateNodeOperations';
import { ulid } from 'ulid';

/**
 * Determine scroll locks based purely on the current state
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
        return { lockForward: true, lockBackward: true }; // Cannot navigate during answer recording

      // Answer feedback states - lock both directions during validation and feedback
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

export interface SceneManagerType {
  // Legacy scene-based navigation (backward compatibility)
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  allScenes: Scene[];
  scenes: Scene[]; // Alias for allScenes (backward compatibility)

  // New navigation array system
  navigationArray: NavigationItem[];
  navigationIndex: number;
  setNavigationIndex: (index: number) => void;
  getCurrentNavigationItem: () => NavigationItem | null;
  getCurrentScene: () => Scene | null;
  getCurrentSceneId: () => string | null;

  // Scene management
  setScenes: (scenes: Scene[]) => void;
  insertScene: (scene: Scene, index: number) => void;
  insertNavigationItem: (item: NavigationItem, index: number) => void; // Insert directly without rebuild
  deleteNavigationItem: (index: number, preserveCurrentIndex?: boolean) => void; // Delete navigation item at index
  scheduleDeletionWithRewiring: (index: number) => void; // Schedule deletion with navigation rewiring (recommended)
  addNavigationStateToCurrentScene: (newState: SceneState, insertAfterCurrent?: boolean) => number; // Add new state to current scene
  updateNavigationItemState: (index: number, newState: SceneState) => void; // Update state of navigation item (locks auto-recalculated)
  updateSceneTextByRecordingId: (recordingId: string, newText: string) => void; // Update scene text during recording
  hideScene: (sceneId: string) => void;
  showScene: (sceneId: string) => void;

  // Navigation methods (legacy scene-based)
  nextAndHide: (sceneId: string) => void;
  goToIndex: (index: number) => void;
  navigateToNext: (fromSceneId?: string, onComplete?: () => void, hideFromScene?: boolean) => void;

  // Navigation methods (new navigation array-based)
  advanceNavigation: (direction: 'forward' | 'backward') => void;
  forceAdvanceNavigation: (direction: 'forward' | 'backward') => void; // Bypass locks but still collapse states

  // Derived state
  currentBackgroundId: string | null;
}

const SceneManagerContext = createContext<SceneManagerType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useSceneManager(): SceneManagerType {
  const context = useContext(SceneManagerContext);
  if (!context) {
    throw new Error("useSceneManager must be used within SceneManagerProvider");
  }
  return context;
}

interface SceneManagerProviderProps {
  children: React.ReactNode;
  initialIndex?: number;
}

export function SceneManagerProvider({ children, initialIndex = 0 }: SceneManagerProviderProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [navigationIndex, setNavigationIndex] = useState(0);
  const [allScenes, setAllScenes] = useState<Scene[]>([]);

  // Access TransitionManager for coordinating animations with navigation
  const transitionManager = useTransitionManager();

  // STATE NODE GRAPH: Single source of truth for navigation
  // This replaces the array-based system with pointer-based traversal
  const [navigatorState, setNavigatorState] = useState<NavigatorState>({
    byId: {},
    order: [],
    currentId: null,
    historyVersion: 0,
  });

  // Ref for latest navigator state (for synchronous access)
  const navigatorStateRef = React.useRef<NavigatorState>(navigatorState);

  // Ref to access latest navigationArray without causing dependency changes
  const navigationArrayRef = React.useRef<NavigationItem[]>([]);

  // Pending deletions for state nodes: { nodeId, timerId, compactAt }[]
  const pendingDeletionsRef = React.useRef<Map<StateNodeId, { timerId: number; compactAt: number }>>(new Map());

  // Build state node graph from allScenes (single source of truth)
  const baseNavigatorState = useMemo(() => {
    const state = buildStateNodeGraph(allScenes);
    console.log('[SceneManager] 🔨 Built state node graph:', {
      nodeCount: state.order.length,
      sceneCount: state.sceneRegistry?.order.length,
      firstNodeId: state.order[0],
      currentId: state.currentId,
    });
    return state;
  }, [allScenes]);

  // Build navigation array FROM navigator state (uses same node IDs)
  const baseNavigationArray = useMemo(() => {
    const array = navigatorStateToArray(baseNavigatorState);
    console.log('[SceneManager] 📋 Converted to navigation array:', {
      length: array.length,
      firstNodeId: array[0]?.nodeId,
      matchesStateNodeCount: array.length === baseNavigatorState.order.length,
    });
    return array;
  }, [baseNavigatorState]);

  // Derive visible scenes for backward compatibility
  // (scenes that are not hidden - same filtering as buildNavigationArray)
  const visibleScenes = useMemo(
    () => allScenes.filter(scene => !scene.hidden),
    [allScenes]
  );

  // Mutable navigator state (can be modified during navigation)
  // This starts from baseNavigatorState and evolves as nodes are marked/compacted

  // Wrapper for setNavigatorState that keeps ref in sync synchronously
  const setNavigatorStateWithRef = React.useCallback((
    update: NavigatorState | ((prev: NavigatorState) => NavigatorState)
  ) => {
    setNavigatorState(prev => {
      const newState = typeof update === 'function' ? update(prev) : update;
      // Update ref synchronously so it's immediately available
      navigatorStateRef.current = newState;
      return newState;
    });
  }, []);

  // Sync navigatorState with baseNavigatorState when scenes change
  React.useEffect(() => {
    console.log('[SceneManager] 🔄 Syncing navigatorState from baseNavigatorState:', {
      nodeCount: baseNavigatorState.order.length,
      currentId: baseNavigatorState.currentId,
      firstNode: baseNavigatorState.order[0],
      sceneCount: baseNavigatorState.sceneRegistry?.order.length,
    });
    setNavigatorStateWithRef(baseNavigatorState);
    // Do NOT touch navigationIndex/currentId - let them stay where they are
  }, [baseNavigatorState, setNavigatorStateWithRef]);

  // Update ref to always have the latest navigatorState
  React.useEffect(() => {
    navigatorStateRef.current = navigatorState;
  }, [navigatorState]);

  // Mutable navigation array that can be collapsed as we progress forward
  const [navigationArray, _setNavigationArray] = useState<NavigationItem[]>([]);

  // Wrapper for setNavigationArray that keeps ref in sync synchronously
  const setNavigationArray = React.useCallback((update: NavigationItem[] | ((prev: NavigationItem[]) => NavigationItem[])) => {
    _setNavigationArray(prev => {
      const newArray = typeof update === 'function' ? update(prev) : update;
      // Update ref synchronously so it's immediately available
      navigationArrayRef.current = newArray;
      return newArray;
    });
  }, []);

  // Sync navigationArray with baseNavigationArray when scenes change
  React.useEffect(() => {
    setNavigationArray(baseNavigationArray);
    // Do NOT touch navigationIndex - let it stay where it is
  }, [baseNavigationArray, setNavigationArray]);

  // Update ref to always have the latest navigationArray
  React.useEffect(() => {
    navigationArrayRef.current = navigationArray;
  }, [navigationArray]);

  // Helper functions for navigation array access
  // Note: Uses navigationArrayRef to avoid triggering cascading re-renders
  // Components that need to react to navigationArray changes should depend on
  // navigationIndex or navigationArrayWithMeta directly, not on this function's return value
  const getCurrentNavigationItem = useCallback((): NavigationItem | null => {
    return navigationArrayRef.current[navigationIndex] || null;
  }, [navigationIndex]);

  const getCurrentScene = useCallback((): Scene | null => {
    const item = getCurrentNavigationItem();
    return item?.scene || null;
  }, [getCurrentNavigationItem]);

  const getCurrentSceneId = useCallback((): string | null => {
    const item = getCurrentNavigationItem();
    return item?.sceneId || null;
  }, [getCurrentNavigationItem]);

  // Compute current background from current navigation item
  const currentBackgroundId = useMemo(() => {
    const currentScene = getCurrentScene();
    if (!currentScene) return null;

    // Only return background if explicitly defined and not empty
    // If no background is specified, return null (no background change)
    if ('background' in currentScene &&
        currentScene.background &&
        currentScene.background.trim() !== '') {
      return currentScene.background;
    }

    return null;
  }, [getCurrentScene]);

  // =============================================================================
  // HELPER FUNCTIONS: Convert between nodeId and navigationIndex
  // =============================================================================

  /**
   * Get nodeId from navigationIndex
   * Uses the current navigationArray (which may have collapsed states)
   */
  const getNodeIdFromIndex = useCallback((index: number): StateNodeId | null => {
    const item = navigationArrayRef.current[index];
    return item?.nodeId || null;
  }, []);

  /**
   * Get navigationIndex from nodeId
   * Returns the current index in the navigationArray
   */
  const getIndexFromNodeId = useCallback((nodeId: StateNodeId): number => {
    return navigationArrayRef.current.findIndex(item => item.nodeId === nodeId);
  }, []);

  /**
   * Get current nodeId (from navigationIndex)
   */
  const getCurrentNodeId = useCallback((): StateNodeId | null => {
    return getNodeIdFromIndex(navigationIndex);
  }, [getNodeIdFromIndex, navigationIndex]);

  // =============================================================================
  // LEGACY NAVIGATION METHODS
  // =============================================================================

  const goToIndex = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, visibleScenes.length - 1));
    setCurrentIndex(clampedIndex);
    // ScrollControl listens to currentIndex and handles the scroll
  }, [visibleScenes.length]);

  const insertScene = useCallback((scene: Scene, index: number) => {
    setAllScenes(prevScenes => {
      const newScenes = [...prevScenes];
      newScenes.splice(index, 0, scene);

      // Do NOT recalculate metadata - just insert the scene as-is
      // Metadata should only be calculated once during initial story load
      return newScenes;
    });
  }, []);

  // Insert a navigation item directly without rebuilding the entire navigation array
  const insertNavigationItem = useCallback((item: NavigationItem, index: number) => {
    setNavigationArray(prevArray => {
      const newArray = [...prevArray];
      newArray.splice(index, 0, item);
      return newArray;
    });
  }, []);

  /**
   * Calculate rewiring information for deleting a scene
   *
   * When deleting scene A at index i:
   * - Find the next scene B (different sceneId)
   * - Find the previous scene C (different sceneId)
   * - Rewiring: B.prevId = C.id (skip A in backward navigation)
   *
   * Edge cases:
   * - If A is at head (no previous): B.prevId = null
   * - If A is at tail (no next): C.nextId = null
   * - If all items have same sceneId: no rewiring needed (internal state collapse)
   */
  const calculateRewiring = useCallback((deleteIndex: number) => {
    const currentArray = navigationArrayRef.current;
    const itemToDelete = currentArray[deleteIndex];

    if (!itemToDelete) {
      console.warn('[SceneManager] Cannot calculate rewiring - invalid index:', deleteIndex);
      return null;
    }

    const sceneIdToDelete = itemToDelete.sceneId;

    // Find next item with different sceneId
    let nextDifferentIndex = deleteIndex + 1;
    while (
      nextDifferentIndex < currentArray.length &&
      currentArray[nextDifferentIndex].sceneId === sceneIdToDelete
    ) {
      nextDifferentIndex++;
    }

    // Find previous item with different sceneId
    let prevDifferentIndex = deleteIndex - 1;
    while (
      prevDifferentIndex >= 0 &&
      currentArray[prevDifferentIndex].sceneId === sceneIdToDelete
    ) {
      prevDifferentIndex--;
    }

    const nextItem = currentArray[nextDifferentIndex];
    const prevItem = currentArray[prevDifferentIndex];

    return {
      targetIndex: nextDifferentIndex,
      newPrevSceneId: prevItem?.sceneId || null,
      newNextSceneId: nextItem?.sceneId || null,
      prevItem,
      nextItem,
    };
  }, []);

  /**
   * Delete a navigation item at the specified index with smart delay
   *
   * Strategy:
   * - Schedules deletion for 3 seconds in the future
   * - If user navigates (forward/backward) before timer expires, delete immediately
   * - This prevents deletion from interfering with ongoing animations/transitions
   * - Safe to call multiple times - won't create duplicate deletions
   */
  const deleteNavigationItem = useCallback((index: number, preserveCurrentIndex: boolean = false) => {
    // Check if this index is already pending deletion
    const existingPending = pendingDeletionsRef.current.find(p => p.index === index);
    if (existingPending) {
      console.log('[SceneManager] ⏭️  Deletion already pending for index', index);
      return;
    }

    console.log('[SceneManager] ⏰ Scheduling deletion for index', index, 'in 3 seconds', preserveCurrentIndex ? '(preserve current index)' : '');

    // Schedule deletion for 3 seconds from now
    const timerId = window.setTimeout(() => {
      console.log('[SceneManager] 🗑️  Timer expired, deleting index', index);

      // Remove from pending list
      pendingDeletionsRef.current = pendingDeletionsRef.current.filter(p => p.index !== index);

      // Perform the actual deletion
      setNavigationArray(prevArray => {
        const newArray = [...prevArray];
        newArray.splice(index, 1);
        return newArray;
      });

      // Adjust navigationIndex if we deleted a scene before the current position
      // UNLESS preserveCurrentIndex is true (when we just navigated away from the deleted scene)
      // This keeps navigationIndex pointing at the same scene after deletion
      setNavigationIndex(prevIndex => {
        if (!preserveCurrentIndex && index < prevIndex) {
          console.log('[SceneManager] 📍 Adjusting navigationIndex from', prevIndex, 'to', prevIndex - 1);
          return prevIndex - 1;
        }
        return prevIndex;
      });
    }, 3000);

    // Track this pending deletion
    pendingDeletionsRef.current.push({ index, timerId });
  }, [setNavigationArray]);

  /**
   * Schedule deletion with navigation rewiring
   *
   * This is the recommended method for deleting scenes during navigation.
   * It handles:
   * 1. Immediate rewiring of navigation pointers (so back nav skips deleted scene)
   * 2. Deferred compaction (actual removal after transition completes)
   *
   * Example: A ← B → C, user navigates A → B
   * - Rewiring: B.prevId = null (B becomes head)
   * - After 2s: Remove A from array
   */
  const scheduleDeletionWithRewiring = useCallback((index: number) => {
    const rewiring = calculateRewiring(index);

    if (!rewiring) {
      console.warn('[SceneManager] Cannot schedule deletion - invalid rewiring');
      return;
    }

    console.log('[SceneManager] 🔗 Rewiring navigation before deletion:', {
      deleteIndex: index,
      targetIndex: rewiring.targetIndex,
      newPrevSceneId: rewiring.newPrevSceneId,
    });

    // NOTE: In a full implementation, we would update the navigation graph here
    // For now, we're working with a flat array, so rewiring is implicit
    // (backward navigation will naturally skip to previous different scene)

    // Schedule the actual deletion after transition duration
    deleteNavigationItem(index, true);
  }, [calculateRewiring, deleteNavigationItem]);

  /**
   * Process pending deletions immediately
   * Called during navigation to clean up before moving
   */
  const processPendingDeletions = useCallback(() => {
    if (pendingDeletionsRef.current.length === 0) return;

    console.log('[SceneManager] 🧹 Processing', pendingDeletionsRef.current.length, 'pending deletions');

    // Cancel all timers
    pendingDeletionsRef.current.forEach(pending => {
      clearTimeout(pending.timerId);
    });

    // Sort deletions by index (descending) to delete from end to start
    // This prevents index shifting issues during the deletion loop
    const sortedDeletions = [...pendingDeletionsRef.current].sort((a, b) => b.index - a.index);

    // Count how many deletions are before the current navigationIndex
    // We need to decrement navigationIndex by this amount
    const currentNavIndex = navigationIndex;
    const deletionsBeforeCurrent = sortedDeletions.filter(d => d.index < currentNavIndex).length;

    // Perform all deletions
    setNavigationArray(prevArray => {
      let newArray = [...prevArray];
      sortedDeletions.forEach(({ index }) => {
        console.log('[SceneManager] 🗑️  Deleting index', index);
        newArray.splice(index, 1);
      });
      return newArray;
    });

    // Adjust navigationIndex to keep it pointing at the same scene
    if (deletionsBeforeCurrent > 0) {
      setNavigationIndex(prevIndex => {
        const newIndex = prevIndex - deletionsBeforeCurrent;
        console.log('[SceneManager] 📍 Adjusting navigationIndex from', prevIndex, 'to', newIndex,
                    `(${deletionsBeforeCurrent} deletions before current)`);
        return newIndex;
      });
    }

    // Clear pending list
    pendingDeletionsRef.current = [];
  }, [setNavigationArray, navigationIndex, setNavigationIndex]);

  /**
   * Add a new navigation state to the current scene
   * This creates a new NavigationItem for the same scene but with a different state
   * Useful for transitions like: input-showInput → record-answer → answer-waiting → answer-right/wrong
   *
   * IMPORTANT: Generates a new stable nodeId for the new state
   *
   * @param newState - The new state to add
   * @param insertAfterCurrent - If true, inserts after current index. If false, replaces current.
   * @returns The index of the newly added navigation item
   */
  const addNavigationStateToCurrentScene = useCallback((
    newState: SceneState,
    insertAfterCurrent: boolean = true
  ): number => {
    const currentItem = getCurrentNavigationItem();
    if (!currentItem) {
      console.warn('⚠️ SceneManager.addNavigationStateToCurrentScene: No current navigation item');
      return navigationIndex;
    }

    const locks = getLocksForState(newState);

    // Generate stable unique nodeId for the new state
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

    const newItem: NavigationItem = {
      nodeId: newNodeId, // CRITICAL: Stable unique ID for React keys
      scene: currentItem.scene, // Same scene
      sceneId: currentItem.sceneId, // Same sceneId
      stateKey, // Semantic state key
      sceneState: newState, // New state
      lockForward: locks.lockForward,
      lockBackward: locks.lockBackward,
      index: insertAfterCurrent ? navigationIndex + 1 : navigationIndex,
      status: 'active',
    };

    console.log('[addNavigationStateToCurrentScene] Creating new state node:', {
      nodeId: newNodeId,
      stateKey,
      insertAfterCurrent,
    });

    if (insertAfterCurrent) {
      // Insert after current position
      setNavigationArray(prevArray => {
        const newArray = [...prevArray];
        newArray.splice(navigationIndex + 1, 0, newItem);
        return newArray;
      });
      return navigationIndex + 1;
    } else {
      // Replace current item
      setNavigationArray(prevArray => {
        const newArray = [...prevArray];
        newArray[navigationIndex] = newItem;
        return newArray;
      });
      return navigationIndex;
    }
  }, [navigationIndex, getCurrentNavigationItem]);

  // Update the state of a navigation item at a specific index
  // Locks are automatically recalculated based on the new state (no lock memoryconsole.log)
  const updateNavigationItemState = useCallback((index: number, newState: SceneState) => {
    setNavigationArray(prevArray => {
      const newArray = [...prevArray];
      if (newArray[index]) {
        const locks = getLocksForState(newState);

        newArray[index] = {
          ...newArray[index],
          sceneState: newState,
          lockForward: locks.lockForward,
          lockBackward: locks.lockBackward,
        };
      }
      return newArray;
    });
  }, []);

  // Update scene text by recordingId (for live transcript updates during recording)
  const updateSceneTextByRecordingId = useCallback((recordingId: string, newText: string) => {
    setNavigationArray(prevArray => {
      const newArray = [...prevArray];

      for (let i = 0; i < newArray.length; i++) {
        const scene = newArray[i].scene;
        if ('recordingId' in scene && scene.recordingId === recordingId) {
          newArray[i] = {
            ...newArray[i],
            scene: {
              ...scene,
              text: newText
            }
          };
          break;
        }
      }

      return newArray;
    });
  }, []);

  const setScenes = useCallback((scenes: Scene[]) => {
    setAllScenes(scenes);
  }, []);

  const hideScene = useCallback((sceneId: string) => {
    setAllScenes(prevScenes =>
      prevScenes.map(scene => {
        const sceneWithId = scene as Scene & { sceneId?: string };
        return sceneWithId.sceneId === sceneId ? { ...scene, hidden: true } : scene;
      })
    );
  }, []);

  const showScene = useCallback((sceneId: string) => {
    setAllScenes(prevScenes =>
      prevScenes.map(scene => {
        const sceneWithId = scene as Scene & { sceneId?: string };
        return sceneWithId.sceneId === sceneId ? { ...scene, hidden: false } : scene;
      })
    );
  }, []);

  const nextAndHide = useCallback((sceneId: string) => {
    hideScene(sceneId);
  }, [hideScene]);

  const navigateToNext = useCallback((fromSceneId?: string, onComplete?: () => void, hideFromScene?: boolean) => {
    // Hide the current scene if requested
    if (hideFromScene && fromSceneId) {
      hideScene(fromSceneId);
      // After hiding, stay on current index (which now shows the next scene)
    } else {
      // Just advance to next scene
      setCurrentIndex(currentIndex + 1);
    }

    // Call completion callback if provided
    onComplete?.();
  }, [currentIndex, hideScene]);

  // =============================================================================
  // STATE-NODE DELETION: Two-phase deletion with rewiring
  // =============================================================================

  /**
   * Mark a state node for removal and schedule compaction
   *
   * Phase 1 (Immediate): Mark node as pendingRemoval, rewire neighbors
   * Phase 2 (Deferred): Compact (physically remove) after animation completes
   *
   * @param nodeId - Node to mark for removal
   */
  const markStateNodeForRemoval = useCallback((nodeId: StateNodeId) => {
    const currentState = navigatorStateRef.current;

    // Mark node and get rewiring operations
    const { state: newState, rewiring } = markNodeForRemoval(currentState, nodeId);

    console.log('[SceneManager] 🔖 Marked node for removal:', {
      nodeId,
      rewiring: rewiring.length,
    });

    // Update navigator state immediately
    setNavigatorStateWithRef(newState);

    // Schedule compaction after transition duration + buffer
    const TRANSITION_DURATION_MS = 2000;
    const BUFFER_MS = 500;
    const compactAt = performance.now() + TRANSITION_DURATION_MS + BUFFER_MS;

    const timerId = window.setTimeout(() => {
      console.log('[SceneManager] ♻️  Compaction timer fired for node:', nodeId);

      // Remove from pending deletions map
      pendingDeletionsRef.current.delete(nodeId);

      // Compact the node
      setNavigatorStateWithRef(prevState => compactNode(prevState, nodeId));
    }, TRANSITION_DURATION_MS + BUFFER_MS);

    // Track pending deletion
    pendingDeletionsRef.current.set(nodeId, { timerId, compactAt });
  }, [setNavigatorStateWithRef]);

  /**
   * Process all pending node compactions immediately
   * Called before navigation to clean up stale nodes
   */
  const processAllPendingCompactions = useCallback(() => {
    if (pendingDeletionsRef.current.size === 0) return;

    console.log('[SceneManager] 🧹 Processing all pending compactions:', pendingDeletionsRef.current.size);

    // Cancel all timers
    for (const [nodeId, { timerId }] of pendingDeletionsRef.current.entries()) {
      clearTimeout(timerId);
      console.log('[SceneManager] ⏹️  Cancelled compaction timer for:', nodeId);
    }

    // Batch compact all pending nodes
    const nodeIds = Array.from(pendingDeletionsRef.current.keys());
    setNavigatorStateWithRef(prevState => batchCompact(prevState, nodeIds));

    // Clear pending map
    pendingDeletionsRef.current.clear();
  }, [setNavigatorStateWithRef]);

  // =============================================================================
  // STATE-NODE NAVIGATION: Pointer-based traversal with skip-back rewiring
  // =============================================================================

  /**
   * Force advance navigation with state-node skip-back rewiring
   *
   * Implements the full skip-back deletion behavior:
   * 1. Begin transition (capture frozen snapshot FIRST)
   * 2. Process pending compactions (clean up before move)
   * 3. Find next/prev active node (skip pendingRemoval nodes)
   * 4. If moving FORWARD: mark current node for removal + rewire
   * 5. If moving BACKWARD: navigate via prev pointers (already rewired)
   * 6. Update navigationIndex to match new currentId
   *
   * Bypasses locks but respects the state-node graph structure.
   */
  const forceAdvanceNavigation = useCallback((direction: 'forward' | 'backward') => {
    const currentArray = navigationArrayRef.current;
    const currentState = navigatorStateRef.current;
    const currentNodeId = getCurrentNodeId();

    console.log('[forceAdvanceNavigation] 🚀 Starting navigation:', {
      direction,
      currentNodeId,
      navigationIndex,
      navigatorStateNodeCount: currentState.order.length,
      navigationArrayLength: currentArray.length,
    });

    if (!currentNodeId) {
      console.warn('[forceAdvanceNavigation] ⚠️  No current node ID');
      return;
    }

    // Get current node from graph
    const currentNode = currentState.byId[currentNodeId];
    if (!currentNode) {
      console.error('[forceAdvanceNavigation] ❌ Current node not found in byId:', currentNodeId);
      return;
    }

    console.log('[forceAdvanceNavigation] 📍 Current node:', {
      id: currentNode.id,
      stateKey: currentNode.stateKey,
      sceneId: currentNode.sceneId,
      prevId: currentNode.prevId,
      nextId: currentNode.nextId,
      status: currentNode.status,
    });

    // Find next active node based on direction
    const nextActiveNode = direction === 'forward'
      ? findNextActiveNode(currentState, currentNodeId)
      : findPrevActiveNode(currentState, currentNodeId);

    if (!nextActiveNode) {
      console.warn('[forceAdvanceNavigation] ⚠️  No active node in direction:', direction);
      console.log('[forceAdvanceNavigation] Graph state:', {
        totalNodes: currentState.order.length,
        currentNodeNextId: currentNode.nextId,
        currentNodePrevId: currentNode.prevId,
      });
      return; // At head or tail
    }

    // Get indices for transition manager (uses current navigationArray)
    const fromIndex = navigationIndex;
    const toIndex = getIndexFromNodeId(nextActiveNode.id);

    if (toIndex === -1) {
      console.warn('[forceAdvanceNavigation] Target node not found in navigationArray:', nextActiveNode.id);
      return;
    }

    // CRITICAL: Begin transition FIRST, before any mutations
    // This captures the frozen snapshot of character data
    transitionManager.beginTransition(fromIndex, toIndex, direction, currentArray);

    // Process any pending compactions after capturing snapshot
    processAllPendingCompactions();

    // SKIP-BACK REWIRING: Only mark for removal when navigating within the same scene
    // This collapses intra-scene states (e.g., quest-basic → quest-showing → quest-accepted)
    // Cross-scene navigation preserves history for backward navigation
    if (direction === 'forward') {
      const isSameScene = currentNode.sceneId === nextActiveNode.sceneId;

      if (isSameScene) {
        console.log('[forceAdvanceNavigation] ⏭️  Same-scene forward - marking current node for removal:', currentNode.stateKey);
        markStateNodeForRemoval(currentNodeId);
      } else {
        console.log('[forceAdvanceNavigation] ➡️  Cross-scene forward - preserving current node for history:', currentNode.stateKey);
        // Do NOT mark for removal - preserve for backward navigation
      }
    }

    // Update navigationIndex to point to the new node
    // Note: toIndex may have changed if nodes were compacted, so recalculate
    const finalIndex = getIndexFromNodeId(nextActiveNode.id);
    if (finalIndex !== -1) {
      setNavigationIndex(finalIndex);
    } else {
      console.warn('[forceAdvanceNavigation] Target node disappeared after compaction');
    }

    // Update currentIndex for backward compatibility with legacy scene-based navigation
    const sceneIndex = visibleScenes.findIndex(s => {
      const sceneWithId = s as Scene & { sceneId?: string };
      return sceneWithId.sceneId === nextActiveNode.sceneId;
    });
    if (sceneIndex !== -1) {
      setCurrentIndex(sceneIndex);
    }

    console.log('[forceAdvanceNavigation] ✅ Navigation complete:', {
      direction,
      from: currentNodeId,
      to: nextActiveNode.id,
      fromIndex,
      toIndex: finalIndex,
    });
  }, [
    navigationIndex,
    getCurrentNodeId,
    getIndexFromNodeId,
    setNavigationIndex,
    setCurrentIndex,
    visibleScenes,
    transitionManager,
    processAllPendingCompactions,
    markStateNodeForRemoval,
  ]);

  // Navigation array-based navigation with state collapse
  // Note: We use navigationArrayRef to access the latest array without causing dependency changes
  const advanceNavigation = useCallback((direction: 'forward' | 'backward') => {
    // Check if current navigation item locks this direction
    const currentItem = navigationArrayRef.current[navigationIndex];
   
    if (currentItem) {
      if (direction === 'forward' && currentItem.lockForward) {
        console.log('🔒 Navigation locked forward at', currentItem.sceneId, currentItem.sceneState);
        return;
      }
      if (direction === 'backward' && currentItem.lockBackward) {
        console.log('🔒 Navigation locked backward at', currentItem.sceneId, currentItem.sceneState);
        return;
      }
    }

    // Delegate to forceAdvanceNavigation for the actual logic
    forceAdvanceNavigation(direction);
  }, [navigationIndex, forceAdvanceNavigation]);


  const contextValue = useMemo((): SceneManagerType => ({
    // Legacy scene-based navigation
    currentIndex,
    setCurrentIndex,
    allScenes,
    scenes: visibleScenes, // Backward compatibility alias

    // New navigation array system
    navigationArray, // Raw navigation array - components check neighbors directly
    navigationIndex,
    setNavigationIndex,
    getCurrentNavigationItem,
    getCurrentScene,
    getCurrentSceneId,

    // Scene management
    setScenes,
    insertScene,
    insertNavigationItem,
    deleteNavigationItem,
    scheduleDeletionWithRewiring,
    addNavigationStateToCurrentScene,
    updateNavigationItemState,
    updateSceneTextByRecordingId,
    hideScene,
    showScene,

    // Navigation methods
    nextAndHide,
    goToIndex,
    navigateToNext,
    advanceNavigation,
    forceAdvanceNavigation,

    // Derived state
    currentBackgroundId,
  }), [
    // Legacy
    currentIndex,
    setCurrentIndex,
    allScenes,
    visibleScenes,

    // New navigation array
    navigationArray,
    navigationIndex,
    setNavigationIndex,
    getCurrentNavigationItem,
    getCurrentScene,
    getCurrentSceneId,

    // Methods
    setScenes,
    insertScene,
    insertNavigationItem,
    deleteNavigationItem,
    scheduleDeletionWithRewiring,
    addNavigationStateToCurrentScene,
    updateNavigationItemState,
    updateSceneTextByRecordingId,
    hideScene,
    showScene,
    nextAndHide,
    goToIndex,
    navigateToNext,
    advanceNavigation,
    forceAdvanceNavigation,

    // Derived
    currentBackgroundId,
  ]);

  return (
    <SceneManagerContext.Provider value={contextValue}>
      {children}
    </SceneManagerContext.Provider>
  );
}
