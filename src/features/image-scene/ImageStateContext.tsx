/**
 * ImageStateContext - Manages state for image captions
 *
 * Tracks the visibility state of captions for image scenes:
 * - hidden: Caption not yet shown (scroll blocked)
 * - showing: Caption visible after first blocked scroll (scroll unlocked)
 */
import React, { createContext, useContext, useCallback, useState } from "react";
import type { ImageState } from "@core/dialogue/types";

interface ImageStateContextType {
  getImageState: (sceneId: string) => ImageState;
  setImageState: (sceneId: string, state: ImageState) => void;
}

const ImageStateContext = createContext<ImageStateContextType | null>(null);

export function useImageState(): ImageStateContextType {
  const context = useContext(ImageStateContext);
  if (!context) {
    throw new Error("useImageState must be used within ImageStateProvider");
  }
  return context;
}

interface ImageStateProviderProps {
  children: React.ReactNode;
}

export function ImageStateProvider({ children }: ImageStateProviderProps) {
  const [imageStateByScene, setImageStateByScene] = useState<Record<string, ImageState>>({});

  const getImageState = useCallback((sceneId: string): ImageState => {
    return imageStateByScene[sceneId] || 'hidden';
  }, [imageStateByScene]);

  const setImageState = useCallback((sceneId: string, state: ImageState) => {
    setImageStateByScene(prev => ({
      ...prev,
      [sceneId]: state
    }));
    console.log(`🖼️ setImageState: ${sceneId} → ${state}`);
  }, []);

  const value = {
    getImageState,
    setImageState
  };

  return (
    <ImageStateContext.Provider value={value}>
      {children}
    </ImageStateContext.Provider>
  );
}
