/**
 * PageFactoryProvider - Creates new pages/scenes dynamically
 * that can be scrolled to and navigated within the story.
 */
import React, { createContext, useContext } from "react";
import type { CharacterScene } from "@core/types/scene";

type PageFactoryContextType = {
  createRecordingScene: (recordingId: string) => CharacterScene;
};

const PageFactoryContext = createContext<PageFactoryContextType | null>(null);

type PageFactoryProviderProps = {
  children: React.ReactNode;
  onSceneAdded?: (scene: Scene) => void;
};

export function PageFactoryProvider({ children }: PageFactoryProviderProps) {

  /**
   * Create a recording scene - a simple CharacterScene for testing
   * Just creates a basic scene with Leo speaking
   */
  const createRecordingScene = (recordingId: string): CharacterScene => {
    const sceneId = `recording-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newScene: CharacterScene = {
      type: "character",
      sceneId,
      text: "I would be recording this", // Test text
      speaker: "left",
      recordingId,
      isRecording: true,
      "left-character": "leo",
      "right-character": "bakerMom",
    };

    console.log('📄 PageFactory.createRecordingScene (simplified):', {
      sceneId,
      recordingId,
      text: newScene.text,
      speaker: newScene.speaker
    });

    return newScene;
  };

  const contextValue: PageFactoryContextType = {
    createRecordingScene
  };

  return (
    <PageFactoryContext.Provider value={contextValue}>
      {children}
    </PageFactoryContext.Provider>
  );
}

// Hook to use PageFactory functionality
export function usePageFactory() {
  const ctx = useContext(PageFactoryContext);
  if (!ctx) throw new Error("usePageFactory must be used within PageFactoryProvider");
  return ctx;
}