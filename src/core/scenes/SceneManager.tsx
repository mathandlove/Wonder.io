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
import { injectPanelMetaFromFlows } from '@features/characters/adapters/injectPanelMetaFromFlows';
import { buildNavigationArray } from '@core/navigation/buildNavigationArray';
import type { NavigationItem } from '@core/navigation/types';

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
  updateNavigationItemState: (index: number, newState: SceneState) => void; // Update state of navigation item
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
  // Cache built items to avoid rebuilding existing scenes
  const baseNavigationArray = useMemo(() => {
    console.log('🔄 Rebuilding navigation array (scenes changed)');
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
    console.log('➕ Inserting navigation item directly at index:', index);
    setNavigationArray(prevArray => {
      const newArray = [...prevArray];
      newArray.splice(index, 0, item);
      console.log(`✅ Inserted at index ${index}, array length: ${prevArray.length} → ${newArray.length}`);
      return newArray;
    });

    // Do NOT add to allScenes - that would trigger a rebuild!
    // Dynamic scenes only live in navigationArray
  }, []);

  // Update the state of a navigation item at a specific index
  const updateNavigationItemState = useCallback((index: number, newState: SceneState) => {
    console.log(`🔄 Updating navigation item state at index ${index}:`, newState);
    setNavigationArray(prevArray => {
      const newArray = [...prevArray];
      if (newArray[index]) {
        newArray[index] = {
          ...newArray[index],
          sceneState: newState
        };
        console.log(`✅ Updated navigation item state at index ${index}`);
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
    const delta = direction === 'forward' ? 1 : -1;
    const next = navigationIndex + delta;
    const clamped = Math.max(0, Math.min(next, navigationArray.length - 1));

    // Don't advance if already at boundary
    if (clamped === navigationIndex) {
      console.log(`🛑 Already at ${direction === 'forward' ? 'end' : 'start'} - no navigation`);
      return;
    }

    // When moving FORWARD, collapse previous states of the same scene
    if (direction === 'forward' && clamped < navigationArray.length) {
      const targetItem = navigationArray[clamped];
      const currentItem = navigationArray[navigationIndex];

      // Check if we're moving to next state of same scene
      if (targetItem && currentItem && targetItem.sceneId === currentItem.sceneId) {
        // Remove all previous navigation items for this scene
        const newArray = navigationArray.filter((item, idx) => {
          // Keep items that are:
          // 1. Not for this scene, OR
          // 2. The target state we're moving to (or later states)
          return item.sceneId !== targetItem.sceneId || idx >= clamped;
        });

        console.log(`🗑️ Collapsed ${navigationArray.length - newArray.length} previous state(s) for scene ${targetItem.sceneId}`);

        // Update array and adjust index
        setNavigationArray(newArray);
        // New index is now 0 because we removed items before it
        const newIndex = newArray.findIndex(item => item === targetItem);
        setNavigationIndex(newIndex);

        console.log(`📍 Navigation forward with collapse: index ${navigationIndex} → ${newIndex} (array ${navigationArray.length} → ${newArray.length})`);
      } else {
        // Different scene, just advance normally
        console.log(`📍 Navigation ${direction}: ${navigationIndex} → ${clamped}`);
        setNavigationIndex(clamped);
      }
    } else {
      // Moving backward, no collapse needed
      console.log(`📍 Navigation ${direction}: ${navigationIndex} → ${clamped}`);
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
