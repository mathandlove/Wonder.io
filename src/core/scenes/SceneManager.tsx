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
import { buildNavigationArray } from '@core/navigation/buildNavigationArray';
import type { NavigationItem, SceneState } from '@core/navigation/types';

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
  deleteNavigationItem: (index: number) => void; // Delete navigation item at index
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

  // Ref to access latest navigationArray without causing dependency changes
  const navigationArrayRef = React.useRef<NavigationItem[]>([]);

  // Pending deletions: { index: number, timerId: number }[]
  const pendingDeletionsRef = React.useRef<{ index: number; timerId: number }[]>([]);

  // Build navigation array directly from allScenes
  const baseNavigationArray = useMemo(() => {
    return buildNavigationArray(allScenes);
  }, [allScenes]);

  // Derive visible scenes for backward compatibility
  // (scenes that are not hidden - same filtering as buildNavigationArray)
  const visibleScenes = useMemo(
    () => allScenes.filter(scene => !scene.hidden),
    [allScenes]
  );

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
   * Delete a navigation item at the specified index with smart delay
   *
   * Strategy:
   * - Schedules deletion for 3 seconds in the future
   * - If user navigates (forward/backward) before timer expires, delete immediately
   * - This prevents deletion from interfering with ongoing animations/transitions
   * - Safe to call multiple times - won't create duplicate deletions
   */
  const deleteNavigationItem = useCallback((index: number) => {
    // Check if this index is already pending deletion
    const existingPending = pendingDeletionsRef.current.find(p => p.index === index);
    if (existingPending) {
      console.log('[SceneManager] ⏭️  Deletion already pending for index', index);
      return;
    }

    console.log('[SceneManager] ⏰ Scheduling deletion for index', index, 'in 3 seconds');

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
      // This keeps navigationIndex pointing at the same scene after deletion
      setNavigationIndex(prevIndex => {
        if (index < prevIndex) {
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
    const newItem: NavigationItem = {
      scene: currentItem.scene, // Same scene
      sceneId: currentItem.sceneId, // Same sceneId
      sceneState: newState, // New state
      lockForward: locks.lockForward,
      lockBackward: locks.lockBackward,
      index: insertAfterCurrent ? navigationIndex + 1 : navigationIndex,
    };



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

  // Force advance navigation (bypasses locks but still collapses states)
  // Note: Uses navigationArrayRef which is kept in sync synchronously via setNavigationArray wrapper
  const forceAdvanceNavigation = useCallback((direction: 'forward' | 'backward') => {
    // Process any pending deletions before navigating
    processPendingDeletions();

    const currentArray = navigationArrayRef.current;
    const delta = direction === 'forward' ? 1 : -1;
    const next = navigationIndex + delta;
    const clamped = Math.max(0, Math.min(next, currentArray.length - 1));

    if (clamped === navigationIndex) return;

    // Track the actual navigation index we ended up at (for currentIndex sync below)
    let finalNavigationIndex = clamped;

    // When moving FORWARD, collapse previous states of the same scene
    if (direction === 'forward' && clamped < currentArray.length) {
      const targetItem = currentArray[clamped];
      const currentItem = currentArray[navigationIndex];

      // Check if we're moving to next state of same scene
      if (targetItem && currentItem && targetItem.sceneId === currentItem.sceneId) {
        const newArray = currentArray.filter((item, idx) => {
          return item.sceneId !== targetItem.sceneId || idx >= clamped;
        });

        setNavigationArray(newArray);
        const newIndex = newArray.findIndex(item => item === targetItem);
        setNavigationIndex(newIndex);
        finalNavigationIndex = newIndex;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any

      } else {
        setNavigationIndex(clamped);
      }
    } else if (direction === 'backward') {
      // When moving BACKWARD, skip over previous states of the same scene
      // Jump directly to a different scene
      const currentItem = currentArray[navigationIndex];
      const targetItem = currentArray[clamped];

      if (targetItem && currentItem && targetItem.sceneId === currentItem.sceneId) {
        // Same scene - keep going backward until we find a different scene
        let backwardIndex = clamped - 1;
        while (backwardIndex >= 0 && currentArray[backwardIndex].sceneId === currentItem.sceneId) {
          backwardIndex--;
        }

        if (backwardIndex >= 0) {

          setNavigationIndex(backwardIndex);
          finalNavigationIndex = backwardIndex;
        } else {
          // No different scene found, stay at current position

          return; // Don't update anything
        }
      } else {
        setNavigationIndex(clamped);
      }
    } else {
      setNavigationIndex(clamped);
    }

    // Also update currentIndex for backward compatibility
    const item = currentArray[finalNavigationIndex];
    if (item) {
      const sceneIndex = visibleScenes.findIndex(s => {
        const sceneWithId = s as Scene & { sceneId?: string };
        return sceneWithId.sceneId === item.sceneId;
      });
      if (sceneIndex !== -1) {
        setCurrentIndex(sceneIndex);
      }
    }
  }, [navigationIndex, setNavigationIndex, setNavigationArray, visibleScenes, setCurrentIndex, processPendingDeletions]);

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
