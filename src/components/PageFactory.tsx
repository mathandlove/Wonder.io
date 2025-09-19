/**
 * PageFactory creates new character scenes dynamically from dialogue text.
 * It works with DialogueContext to add AI-generated responses as new scenes
 * that can be scrolled to and navigated within the story.
 */
import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import type { CharacterScene, Scene } from "../types/scene";
import { useDialogue } from "../context/DialogueContext";
import { useNavigation } from "../context/NavigationContext";

type PageFactoryContextType = {
  createCharacterPage: (text: string, speaker?: "left" | "right") => CharacterScene;
  addSceneToStory: (scene: Scene) => void;
};

const PageFactoryContext = createContext<PageFactoryContextType | null>(null);

type PageFactoryProviderProps = {
  children: React.ReactNode;
  onSceneAdded?: (scene: Scene) => void;
};

export function PageFactoryProvider({ children, onSceneAdded }: PageFactoryProviderProps) {
  const { assistantText, userText, turnId } = useDialogue();
  const { insertScene, currentIndex, goToIndex } = useNavigation();
  const [processedUserText, setProcessedUserText] = useState<string>("");
  const [processedAssistantText, setProcessedAssistantText] = useState<string>("");
  const [lastTurnId, setLastTurnId] = useState<number>(turnId);

  // Debug logging (reduced)
  // console.log(`[PageFactory] Current state - userText: "${userText}", assistantText: "${assistantText}", turnId: ${turnId}`);

  // Reset processed text tracking when turn changes or when text is cleared
  useEffect(() => {
    if (turnId !== lastTurnId) {
      setProcessedUserText("");
      setProcessedAssistantText("");
      setLastTurnId(turnId);
    }
  }, [turnId, lastTurnId]);

  // Reset processed assistant text when assistantText is cleared
  useEffect(() => {
    if (!assistantText || assistantText.trim() === "") {
      setProcessedAssistantText("");
    }
  }, [assistantText]);

  // Create a new character scene with the provided text
  const createCharacterPage = useCallback((text: string, speaker: "left" | "right" = "right"): CharacterScene => {
    return {
      type: "character",
      text,
      speaker,
      // Default characters - could be made configurable
      "left-character": "leo",
      "right-character": "bakerMom",
      // No default background - inherit from current context
    };
  }, []);

  // Insert a scene to the story at the next position using NavigationContext
  const addSceneToStory = useCallback((scene: Scene) => {
    const insertIndex = currentIndex + 1;
    insertScene(scene, insertIndex);

    // Auto-navigate to the newly inserted scene
    setTimeout(() => {
      goToIndex(insertIndex);
    }, 100);

    onSceneAdded?.(scene);
  }, [insertScene, currentIndex, goToIndex, onSceneAdded]);

  // Auto-create and add scene when new user text arrives
  useEffect(() => {
    if (userText && userText.trim() && userText !== processedUserText) {

      // Create new character scene with user message (left speaker = user)
      const newScene = createCharacterPage(userText, "left");

      // Add to story
      addSceneToStory(newScene);

      // Mark as processed
      setProcessedUserText(userText);
    }
  }, [userText, turnId, createCharacterPage, addSceneToStory, processedUserText]);

  // Auto-create and add scene when new assistant text arrives
  useEffect(() => {
    if (assistantText && assistantText.trim() && assistantText !== processedAssistantText) {

      // Create new character scene with assistant response (right speaker = AI)
      const newScene = createCharacterPage(assistantText, "right");

      // Add to story
      addSceneToStory(newScene);

      // Mark as processed
      setProcessedAssistantText(assistantText);
    }
  }, [assistantText, turnId, createCharacterPage, addSceneToStory, processedAssistantText]);

  const contextValue: PageFactoryContextType = {
    createCharacterPage,
    addSceneToStory
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