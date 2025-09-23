/**
 * NavigationProvider owns navigation state/APIs and syncs with SnapLayer.
 * Keeps scenes dumb while preserving existing assistantText auto-advance logic.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Scene } from "../types/scene";

export interface NavigationContextType {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  scenes: Scene[];
  setScenes: (scenes: Scene[]) => void;
  insertScene: (scene: Scene, index: number) => void;
  goToNext: () => void;
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
  const [scenes, setScenes] = useState<Scene[]>([]);


  // Compute current background from current scene
  const currentBackgroundId = useMemo(() => {
    const currentScene = scenes[currentIndex];
    if (!currentScene) return null;

    // Only return background if explicitly defined and not empty
    // If no background is specified, return null (no background change)
    if ('background' in currentScene &&
        currentScene.background &&
        currentScene.background.trim() !== '') {
      return currentScene.background;
    }

    return null;
  }, [scenes, currentIndex]);
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
    if (snapApiRef.current && scenes.length > 0 && initialIndex > 0 && !hasInitialScrolled) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const clampedIndex = Math.max(0, Math.min(initialIndex, scenes.length - 1));
        snapApiRef.current?.scrollTo(clampedIndex, { behavior: "auto" }); // Use "auto" for instant jump
        setHasInitialScrolled(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scenes.length, initialIndex, hasInitialScrolled]); // Only run when scenes load or initialIndex changes

  const goToIndex = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, scenes.length - 1));
    setCurrentIndex(clampedIndex);
    snapApiRef.current?.scrollTo(clampedIndex, { behavior: "smooth" });
  }, [scenes.length]);

  const insertScene = useCallback((scene: Scene, index: number) => {
    setScenes(prevScenes => {
      const newScenes = [...prevScenes];
      newScenes.splice(index, 0, scene);
      return newScenes;
    });
  }, []);

  const goToNext = useCallback(() => {
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex]);

  const contextValue = useMemo((): NavigationContextType => ({
    currentIndex,
    setCurrentIndex,
    scenes,
    setScenes,
    insertScene,
    goToNext,
    goToIndex,
    registerSnapApi,
    currentBackgroundId,
  }), [
    currentIndex,
    setCurrentIndex,
    scenes,
    setScenes,
    insertScene,
    goToNext,
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

