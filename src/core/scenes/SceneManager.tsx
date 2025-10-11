/**
 * SceneManager - Manages scene collection, visibility, and progression state
 *
 * Responsibilities:
 * - Scene collection management (allScenes array)
 * - Scene visibility filtering (hidden scenes)
 * - Scene insertion and dynamic scene creation
 * - Current position tracking (currentIndex)
 * - Navigation helpers (goToNext, goToIndex, etc.)
 * - Derived state (currentBackgroundId, visibleScenes)
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Scene } from '@core/types/scene';
import { injectPanelMetaFromFlows } from '@features/characters/adapters/injectPanelMetaFromFlows';

export interface SceneManagerType {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  allScenes: Scene[];
  scenes: Scene[]; // Alias for visibleScenes (backward compatibility)
  visibleScenes: Scene[];
  setScenes: (scenes: Scene[]) => void;
  insertScene: (scene: Scene, index: number) => void;
  hideScene: (sceneId: string) => void;
  showScene: (sceneId: string) => void;
  goToNext: () => void;
  nextAndHide: (sceneId: string) => void;
  goToIndex: (index: number) => void;
  navigateToNext: (fromSceneId?: string, onComplete?: () => void, hideFromScene?: boolean) => void;
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
  const [allScenes, setAllScenes] = useState<Scene[]>([]);

  // Filter out hidden scenes for navigation and rendering
  const visibleScenes = useMemo(
    () => allScenes.filter(scene => !scene.hidden),
    [allScenes]
  );

  // Compute current background from current scene (use visibleScenes)
  const currentBackgroundId = useMemo(() => {
    const currentScene = visibleScenes[currentIndex];
    if (!currentScene) return null;

    // Only return background if explicitly defined and not empty
    // If no background is specified, return null (no background change)
    if ('background' in currentScene &&
        currentScene.background &&
        currentScene.background.trim() !== '') {
      return currentScene.background;
    }

    return null;
  }, [visibleScenes, currentIndex]);

  const goToIndex = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, visibleScenes.length - 1));
    setCurrentIndex(clampedIndex);
    // ScrollControl listens to currentIndex and handles the scroll
  }, [visibleScenes.length]);

  const insertScene = useCallback((scene: Scene, index: number) => {
    setAllScenes(prevScenes => {
      const newScenes = [...prevScenes];
      newScenes.splice(index, 0, scene);

      // Recalculate lastInFlow for all scenes after inserting new scene
      const scenesWithUpdatedFlow = injectPanelMetaFromFlows(newScenes);

      return scenesWithUpdatedFlow;
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

  const goToNext = useCallback(() => {
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex]);

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

  const contextValue = useMemo((): SceneManagerType => ({
    currentIndex,
    setCurrentIndex,
    allScenes,
    scenes: visibleScenes, // Backward compatibility alias
    visibleScenes,
    setScenes,
    insertScene,
    hideScene,
    showScene,
    goToNext,
    nextAndHide,
    goToIndex,
    navigateToNext,
    currentBackgroundId,
  }), [
    currentIndex,
    setCurrentIndex,
    allScenes,
    visibleScenes,
    setScenes,
    insertScene,
    hideScene,
    showScene,
    goToNext,
    nextAndHide,
    goToIndex,
    navigateToNext,
    currentBackgroundId,
  ]);

  return (
    <SceneManagerContext.Provider value={contextValue}>
      {children}
    </SceneManagerContext.Provider>
  );
}
