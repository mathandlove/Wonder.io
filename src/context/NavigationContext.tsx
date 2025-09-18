/**
 * NavigationProvider owns navigation state/APIs and syncs with SnapLayer.
 * Keeps scenes dumb while preserving existing assistantText auto-advance logic.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
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

  console.log(`[NavigationProvider] Render - currentIndex: ${currentIndex}, initialIndex: ${initialIndex}`);

  // Compute current background from current scene
  const currentBackgroundId = useMemo(() => {
    const currentScene = scenes[currentIndex];
    if (!currentScene) return null;

    // Only return background if explicitly defined and not empty
    // If no background is specified, return null (no background change)
    if ('background' in currentScene &&
        currentScene.background &&
        currentScene.background.trim() !== '') {
      console.log(`[NavigationContext] Scene ${currentIndex} (${currentScene.type}) background: "${currentScene.background}"`);
      return currentScene.background;
    }

    console.log(`[NavigationContext] Scene ${currentIndex} (${currentScene.type}) has no background`);
    return null;
  }, [scenes, currentIndex]);
  const snapApiRef = useRef<{ scrollTo: (index: number, opts?: ScrollToOptions) => void } | null>(null);
  const onceKeysRef = useRef<Set<string>>(new Set());

  // Register SnapLayer's API for programmatic control
  const registerSnapApi = useCallback((api: { scrollTo: (index: number, opts?: ScrollToOptions) => void }) => {
    snapApiRef.current = api;
    // Sync the visual position to the current index as soon as the API is available
    requestAnimationFrame(() => {
      api.scrollTo(currentIndex, { behavior: "auto" });
    });
  }, [currentIndex]);

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
      console.log(`[NavigationProvider] Inserted scene at index ${index}. Total scenes: ${newScenes.length}`);
      return newScenes;
    });
  }, []);

  const addScene = useCallback((scene: Scene) => {
    setScenes(prevScenes => {
      const newScenes = [...prevScenes, scene];
      console.log(`[NavigationProvider] Added scene. Total scenes: ${newScenes.length}`);
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

