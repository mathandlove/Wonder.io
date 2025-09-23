/**
 * NavigationProvider owns navigation state/APIs and syncs with SnapLayer.
 * Keeps scenes dumb while preserving existing assistantText auto-advance logic.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Scene } from "../types/scene";

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

  // Debug: Log current scene when index changes
  useEffect(() => {
    const currentScene = visibleScenes[currentIndex];
    if (currentScene) {
      const sceneId = (currentScene as any)?.sceneId || 'no-id';
      console.log(`[NavigationContext] Current scene: index ${currentIndex}, sceneId: ${sceneId}, type: ${currentScene.type}`);
    }
  }, [currentIndex, visibleScenes]);


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
    const targetScene = visibleScenes[clampedIndex];
    const sceneId = (targetScene as any)?.sceneId || 'no-id';
    console.log(`[NavigationContext] Scrolling to index ${clampedIndex}, sceneId: ${sceneId}, type: ${targetScene?.type}`);
    setCurrentIndex(clampedIndex);
    snapApiRef.current?.scrollTo(clampedIndex, { behavior: "smooth" });
  }, [visibleScenes.length]);

  const insertScene = useCallback((scene: Scene, index: number) => {
    setAllScenes(prevScenes => {
      const newScenes = [...prevScenes];
      newScenes.splice(index, 0, scene);
      return newScenes;
    });
  }, []);

  const setScenes = useCallback((scenes: Scene[]) => {
    setAllScenes(scenes);
  }, []);

  const hideScene = useCallback((sceneId: string) => {
    console.log(`[NavigationContext] Hiding scene with sceneId: ${sceneId}`);
    setAllScenes(prevScenes => {
      const updated = prevScenes.map(scene => {
        if ((scene as any).sceneId === sceneId) {
          console.log(`[NavigationContext] ✓ Found and hiding scene: ${sceneId}, type: ${scene.type}`);
          return { ...scene, hidden: true };
        }
        return scene;
      });

      // Log which scenes are now hidden
      const hiddenScenes = updated.filter(s => s.hidden).map(s => ({
        id: (s as any).sceneId || 'no-id',
        type: s.type
      }));
      console.log(`[NavigationContext] Currently hidden scenes:`, hiddenScenes);

      return updated;
    });
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
    console.log(`[NavigationContext] nextAndHide called for sceneId: ${sceneId} - hiding only (no auto-advance)`);

    // Just hide the scene - no navigation
    hideScene(sceneId);
  }, [hideScene]);

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
    registerSnapApi,
    currentBackgroundId,
  ]);

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

