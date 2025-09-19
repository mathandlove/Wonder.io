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
  addScene: (scene: Scene) => void;
  insertScene: (scene: Scene, index: number) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  totalScenes: number;
  goToType: (type: Scene["type"]) => void;
  goToOnce: (key: string, index: number) => void;
  goToTypeOnce: (key: string, type: Scene["type"]) => void;
  resetOnce: (key: string) => void;
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
  const onceKeysRef = useRef<Set<string>>(new Set());

  // Register SnapLayer's API for programmatic control
  const registerSnapApi = useCallback((api: { scrollTo: (index: number, opts?: ScrollToOptions) => void }) => {
    snapApiRef.current = api;
    // Don't auto-scroll on registration to prevent infinite loops
    // The scroll position will be handled by user interactions or explicit navigation calls
  }, []);

  // Auto-scroll to initial index when scenes are loaded and snap API is ready
  useEffect(() => {
    if (snapApiRef.current && scenes.length > 0 && initialIndex > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const clampedIndex = Math.max(0, Math.min(initialIndex, scenes.length - 1));
        snapApiRef.current?.scrollTo(clampedIndex, { behavior: "auto" }); // Use "auto" for instant jump
        console.log(`🎯 Auto-scrolled to initial scene ${clampedIndex}`);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scenes.length, initialIndex]); // Only run when scenes load or initialIndex changes

  const goToIndex = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, scenes.length - 1));
    setCurrentIndex(clampedIndex);
    snapApiRef.current?.scrollTo(clampedIndex, { behavior: "smooth" });
  }, [scenes.length]);

  const goToType = useCallback((type: Scene["type"]) => {
    const idx = scenes.findIndex(s => s.type === type);
    if (idx >= 0) {
      goToIndex(idx);
    }
  }, [scenes, goToIndex]);

  const goToOnce = useCallback((key: string, index: number) => {
    if (onceKeysRef.current.has(key)) return;
    onceKeysRef.current.add(key);
    goToIndex(index);
  }, [goToIndex]);

  const goToTypeOnce = useCallback((key: string, type: Scene["type"]) => {
    if (onceKeysRef.current.has(key)) return;
    const idx = scenes.findIndex(s => s.type === type);
    if (idx >= 0) {
      onceKeysRef.current.add(key);
      goToIndex(idx);
    }
  }, [scenes, goToIndex]);

  const resetOnce = useCallback((key: string) => {
    onceKeysRef.current.delete(key);
  }, []);

  const insertScene = useCallback((scene: Scene, index: number) => {
    setScenes(prevScenes => {
      const newScenes = [...prevScenes];
      newScenes.splice(index, 0, scene);
      return newScenes;
    });
  }, []);

  const addScene = useCallback((scene: Scene) => {
    setScenes(prevScenes => {
      const newScenes = [...prevScenes, scene];
      return newScenes;
    });
  }, []);

  const goToNext = useCallback(() => {
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex]);

  const goToPrevious = useCallback(() => {
    goToIndex(currentIndex - 1);
  }, [currentIndex, goToIndex]);

  const canGoNext = currentIndex < scenes.length - 1;
  const canGoPrevious = currentIndex > 0;
  const totalScenes = scenes.length;

  const contextValue = useMemo((): NavigationContextType => ({
    currentIndex,
    setCurrentIndex,
    scenes,
    setScenes,
    addScene,
    insertScene,
    goToNext,
    goToPrevious,
    goToIndex,
    canGoNext,
    canGoPrevious,
    totalScenes,
    goToType,
    goToOnce,
    goToTypeOnce,
    resetOnce,
    registerSnapApi,
    currentBackgroundId,
  }), [
    currentIndex,
    setCurrentIndex,
    scenes,
    setScenes,
    addScene,
    insertScene,
    goToNext,
    goToPrevious,
    goToIndex,
    canGoNext,
    canGoPrevious,
    totalScenes,
    goToType,
    goToOnce,
    goToTypeOnce,
    resetOnce,
    registerSnapApi,
    currentBackgroundId,
  ]);

  

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

