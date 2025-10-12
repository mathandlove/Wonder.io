/**
 * PageFactoryProvider - Creates new pages/scenes dynamically
 * that can be scrolled to and navigated within the story.
 */
import React, { createContext, useContext } from "react";
import type { CharacterScene } from "@core/types/scene";

type PageFactoryContextType = {
  createRecordingScene: (
    recordingId: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ) => CharacterScene;
};

const PageFactoryContext = createContext<PageFactoryContextType | null>(null);

type PageFactoryProviderProps = {
  children: React.ReactNode;
  onSceneAdded?: (scene: Scene) => void;
};

export function PageFactoryProvider({ children }: PageFactoryProviderProps) {

  /**
   * Create a recording scene - a CharacterScene that inherits context from current scene
   * Copies background and characters to maintain visual continuity during recording
   */
  const createRecordingScene = (
    recordingId: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ): CharacterScene => {
    const sceneId = `recording-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newScene: CharacterScene = {
      type: "character",
      sceneId,
      text: "Test words", // Debug text for visibility - will be replaced by transcript
      speaker: "left", // User is speaking
      recordingId,
      isRecording: true,
      "left-character": leftCharacter || "leo", // Inherit or fallback
      "right-character": rightCharacter || "bakerMom", // Inherit or fallback
      background: currentBackground, // Inherit background from current scene
    };

    console.log('📄 PageFactory.createRecordingScene:', {
      sceneId,
      recordingId,
      text: newScene.text,
      speaker: newScene.speaker,
      background: newScene.background,
      leftCharacter: newScene['left-character'],
      rightCharacter: newScene['right-character']
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