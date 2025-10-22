/**
 * PageFactoryProvider - Creates new pages/scenes dynamically
 * that can be scrolled to and navigated within the story.
 */
import React, { createContext, useContext } from "react";
import type { CharacterScene, Scene, FailDanceScene, SuccessDanceScene } from "@core/types/scene";
import { NOCHARACTER } from "@features/characters/buildPanelRangesFromScenes";

type PageFactoryContextType = {
  createRecordingScene: (
    recordingId: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ) => CharacterScene;
  createFailDanceScene: (
    character: string,
    answerText: string,
    questionText: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ) => FailDanceScene;
  createSuccessDanceScene: (
    character: string,
    answerText: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ) => SuccessDanceScene;
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



    return newScene;
  };

  /**
   * Create a fail-dance scene - overlay animation for wrong answers
   * Creates a scene with left character visible and animated overlay on right
   * The record panel will show with answer-wrong styling (answer text, quest, seal visible)
   *
   * Meta will be automatically injected by injectPanelMetaFromFlows
   */
  const createFailDanceScene = (
    character: string,
    answerText: string,
    questionText: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ): FailDanceScene => {
    const sceneId = `fail-dance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newScene: FailDanceScene = {
      type: "fail-dance",
      sceneId,
      character: character,
      angryCharacter: `angry${character}`,
      side: "right",
      "left-character": leftCharacter || "leo", // Inherit or fallback
      "right-character": rightCharacter || NOCHARACTER, // Use NOCHARACTER to trigger exit animation
      background: currentBackground,
      answerText: answerText,
      questionText: questionText,
      duration: 3500
      // NOTE: meta will be injected automatically by injectPanelMetaFromFlows in StoryModeScroll
    };

    return newScene;
  };

  /**
   * Create a success-dance scene - celebration animation for correct answers
   * Creates a scene with left character visible and animated overlay on right
   * The record panel will show below screen with the answer text visible
   *
   * Meta will be automatically injected by injectPanelMetaFromFlows
   */
  const createSuccessDanceScene = (
    character: string,
    answerText: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ): SuccessDanceScene => {
    const sceneId = `success-dance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newScene: SuccessDanceScene = {
      type: "success-dance",
      sceneId,
      character: character,
      happyCharacter: `happy${character}`,
      side: "right",
      "left-character": leftCharacter || "leo", // Inherit or fallback
      "right-character": rightCharacter || NOCHARACTER, // Use NOCHARACTER to trigger exit animation
      background: currentBackground,
      answerText: answerText,
      duration: 3500
      // NOTE: meta will be injected automatically by injectPanelMetaFromFlows in StoryModeScroll
    };

    return newScene;
  };

  const contextValue: PageFactoryContextType = {
    createRecordingScene,
    createFailDanceScene,
    createSuccessDanceScene
  };

  return (
    <PageFactoryContext.Provider value={contextValue}>
      {children}
    </PageFactoryContext.Provider>
  );
}

// Hook to use PageFactory functionality
// eslint-disable-next-line react-refresh/only-export-components
export function usePageFactory() {
  const ctx = useContext(PageFactoryContext);
  if (!ctx) throw new Error("usePageFactory must be used within PageFactoryProvider");
  return ctx;
}