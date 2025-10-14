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
export function getLocksForState(state: SceneState): { lockForward: boolean; lockBackward: boolean } {
  // Default: no locks
  if (state.type === 'static') {
    return { lockForward: false, lockBackward: false };
  }

  if (state.type === 'image') {
    // Image hidden state blocks forward scroll until image is revealed
    if (state.state === 'hidden') {
      return { lockForward: true, lockBackward: false };
    }
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
      case 'ai-waiting':
        return { lockForward: true, lockBackward: true }; // Cannot navigate during recording/waiting

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
  const [navigationArray, setNavigationArray] = useState<NavigationItem[]>([]);

  // Sync navigationArray with baseNavigationArray when scenes change
  React.useEffect(() => {
    setNavigationArray(baseNavigationArray);
    // Do NOT touch navigationIndex - let it stay where it is
  }, [baseNavigationArray]);

  // Helper functions for navigation array access
  const getCurrentNavigationItem = useCallback((): NavigationItem | null => {
    return navigationArray[navigationIndex] || null;
  }, [navigationArray, navigationIndex]);

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

  // Update the state of a navigation item at a specific index
  // Locks are automatically recalculated based on the new state (no lock memory)
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

  // Navigation array-based navigation with state collapse
  const advanceNavigation = useCallback((direction: 'forward' | 'backward') => {
    // Check if current navigation item locks this direction
    const currentItem = navigationArray[navigationIndex];
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

    const delta = direction === 'forward' ? 1 : -1;
    const next = navigationIndex + delta;
    const clamped = Math.max(0, Math.min(next, navigationArray.length - 1));

    if (clamped === navigationIndex) return;

    // When moving FORWARD, collapse previous states of the same scene
    if (direction === 'forward' && clamped < navigationArray.length) {
      const targetItem = navigationArray[clamped];
      const currentItem = navigationArray[navigationIndex];

      // Check if we're moving to next state of same scene
      if (targetItem && currentItem && targetItem.sceneId === currentItem.sceneId) {
        const newArray = navigationArray.filter((item, idx) => {
          return item.sceneId !== targetItem.sceneId || idx >= clamped;
        });

        setNavigationArray(newArray);
        const newIndex = newArray.findIndex(item => item === targetItem);
        setNavigationIndex(newIndex);
      } else {
        setNavigationIndex(clamped);
      }
    } else {
      setNavigationIndex(clamped);
    }

    // Also update currentIndex for backward compatibility
    const item = navigationArray[clamped];
    if (item) {
      const sceneIndex = visibleScenes.findIndex(s => {
        const sceneWithId = s as Scene & { sceneId?: string };
        return sceneWithId.sceneId === item.sceneId;
      });
      if (sceneIndex !== -1) {
        setCurrentIndex(sceneIndex);
      }
    }
  }, [navigationIndex, navigationArray, visibleScenes]);

  const contextValue = useMemo((): SceneManagerType => ({
    // Legacy scene-based navigation
    currentIndex,
    setCurrentIndex,
    allScenes,
    scenes: visibleScenes, // Backward compatibility alias

    // New navigation array system
    navigationArray,
    navigationIndex,
    setNavigationIndex,
    getCurrentNavigationItem,
    getCurrentScene,
    getCurrentSceneId,

    // Scene management
    setScenes,
    insertScene,
    insertNavigationItem,
    updateNavigationItemState,
    updateSceneTextByRecordingId,
    hideScene,
    showScene,

    // Navigation methods
    nextAndHide,
    goToIndex,
    navigateToNext,
    advanceNavigation,

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
    updateNavigationItemState,
    updateSceneTextByRecordingId,
    hideScene,
    showScene,
    nextAndHide,
    goToIndex,
    navigateToNext,
    advanceNavigation,

    // Derived
    currentBackgroundId,
  ]);

  return (
    <SceneManagerContext.Provider value={contextValue}>
      {children}
    </SceneManagerContext.Provider>
  );
}
