/**
 * NavigationProvider owns navigation state/APIs and syncs with SnapLayer.
 * Keeps scenes dumb while preserving existing assistantText auto-advance logic.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Scene } from "../types/scene";
import { injectPanelMetaFromFlows } from "../characters/adapters/injectPanelMetaFromFlows";
import { sceneBus } from "../scenes/registry/sceneBus";

export interface NavigationContextType {
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
  registerSnapApi: (api: { scrollTo: (index: number, opts?: ScrollToOptions) => void }) => void;
  currentBackgroundId: string | null;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
}

interface NavigationProviderProps {
  children: React.ReactNode;
  initialIndex?: number;
}

export function NavigationProvider({ children, initialIndex = 0 }: NavigationProviderProps) {
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
  const snapApiRef = useRef<{ scrollTo: (index: number, opts?: ScrollToOptions) => void } | null>(null);

  // Register SnapLayer's API for programmatic control
  const registerSnapApi = useCallback((api: { scrollTo: (index: number, opts?: ScrollToOptions) => void }) => {
    snapApiRef.current = api;
    // Don't auto-scroll on registration to prevent infinite loops
    // The scroll position will be handled by user interactions or explicit navigation calls
  }, []);

  // Auto-scroll to initial index when scenes are loaded and snap API is ready
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);
  useEffect(() => {
    if (snapApiRef.current && visibleScenes.length > 0 && initialIndex > 0 && !hasInitialScrolled) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const clampedIndex = Math.max(0, Math.min(initialIndex, visibleScenes.length - 1));
        snapApiRef.current?.scrollTo(clampedIndex, { behavior: "auto" }); // Use "auto" for instant jump
        setHasInitialScrolled(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visibleScenes.length, initialIndex, hasInitialScrolled]); // Only run when scenes load or initialIndex changes

  const goToIndex = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, visibleScenes.length - 1));
    setCurrentIndex(clampedIndex);
    snapApiRef.current?.scrollTo(clampedIndex, { behavior: "smooth" });
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
      prevScenes.map(scene =>
        (scene as any).sceneId === sceneId ? { ...scene, hidden: true } : scene
      )
    );
  }, []);

  const showScene = useCallback((sceneId: string) => {
    setAllScenes(prevScenes =>
      prevScenes.map(scene =>
        (scene as any).sceneId === sceneId ? { ...scene, hidden: false } : scene
      )
    );
  }, []);

  const goToNext = useCallback(() => {
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex]);

  const nextAndHide = useCallback((sceneId: string) => {
    hideScene(sceneId);
  }, [hideScene]);

  const navigateToNext = useCallback((fromSceneId?: string, onComplete?: () => void, hideFromScene?: boolean) => {
    // Small delay to ensure scroll lock is released before advancing
    setTimeout(() => {
      // Emit scene leave event for current scene
      if (fromSceneId) {
        sceneBus.emit('scene:leave', fromSceneId, 'forward');
      }

      // Find the next scene BEFORE hiding (important for correct index calculation)
      const nextSceneIndex = currentIndex + 1;
      const nextScene = visibleScenes[nextSceneIndex];

      // Calculate the adjusted target index after hiding
      // If we hid a scene before the target, target index decreases by 1
      const adjustedNextIndex = hideFromScene && fromSceneId ? currentIndex : nextSceneIndex;

      // Hide the from scene if requested (this changes visibleScenes indices)
      if (hideFromScene && fromSceneId) {
        hideScene(fromSceneId);
      }

      // Update navigation index IMMEDIATELY after hiding to keep everything in sync
      setCurrentIndex(adjustedNextIndex);

      // Emit scene enter event for the next scene AFTER hiding and index update
      if (nextScene && (nextScene as any).sceneId) {
        sceneBus.emit('scene:enter', (nextScene as any).sceneId, 'forward');
      }

      // Use setTimeout only for the scroll (to let React finish state updates)
      setTimeout(() => {
        // Trigger scroll navigation to the next scene (DOM uses filtered indices)
        const nextSection = document.querySelector(`[data-section-index="${adjustedNextIndex}"]`);
        if (nextSection) {
          nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 0);

      // Call completion callback if provided
      onComplete?.();
    }, 50);
  }, [currentIndex, visibleScenes, setCurrentIndex, hideScene]);

  const contextValue = useMemo((): NavigationContextType => ({
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
    registerSnapApi,
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
    registerSnapApi,
    currentBackgroundId,
  ]);

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

