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
  const { insertScene, currentIndex, goToIndex, scenes, setScenes } = useNavigation();
  const [processedUserText, setProcessedUserText] = useState<string>("");
  const [processedAssistantText, setProcessedAssistantText] = useState<string>("");
  const [lastTurnId, setLastTurnId] = useState<number>(turnId);


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
    // Get current scene to copy characters from
    const currentScene = scenes[currentIndex];

    // Extract characters from current scene, with fallbacks
    let leftCharacter = "leo";  // fallback
    let rightCharacter = "bakerMom";  // fallback

    if (currentScene) {
      // Check for character scene properties
      if ('left-character' in currentScene && currentScene['left-character']) {
        leftCharacter = currentScene['left-character'] as string;
      }
      if ('right-character' in currentScene && currentScene['right-character']) {
        rightCharacter = currentScene['right-character'] as string;
      }

      // Also check meta.panelLeft/panelRight for character data
      if (currentScene.meta?.panelLeft?.character) {
        leftCharacter = currentScene.meta.panelLeft.character;
      }
      if (currentScene.meta?.panelRight?.character) {
        rightCharacter = currentScene.meta.panelRight.character;
      }
    }

    return {
      type: "character",
      text,
      speaker,
      // Copy characters from current scene
      "left-character": leftCharacter,
      "right-character": rightCharacter,
      // No default background - inherit from current context
    };
  }, [scenes, currentIndex]);

  // Legacy addSceneToStory - keeping for external API compatibility but not used internally
  const addSceneToStory = useCallback((scene: Scene) => {
    const insertIndex = currentIndex + 1;
    insertScene(scene, insertIndex);

    setTimeout(() => {
      goToIndex(insertIndex);
    }, 100);

    onSceneAdded?.(scene);
  }, [insertScene, currentIndex, goToIndex, onSceneAdded]);

  // Auto-create and add scenes when new user text arrives
  useEffect(() => {
    if (userText && userText.trim() && userText !== processedUserText) {
      // Mark as processed IMMEDIATELY to prevent multiple insertions
      setProcessedUserText(userText);

      // Create user scene (left speaker = user)
      const userScene = createCharacterPage(userText, "left");

      // Create placeholder assistant scene (right speaker = AI) with temporary text
      const assistantScene = createCharacterPage("...", "right");

      // Insert both scenes at determined positions
      const userInsertIndex = currentIndex + 1;
      const assistantInsertIndex = currentIndex + 2;

      insertScene(userScene, userInsertIndex);
      insertScene(assistantScene, assistantInsertIndex);

      // Auto-navigate to the user scene
      setTimeout(() => {
        goToIndex(userInsertIndex);
      }, 100);

      onSceneAdded?.(userScene);
      onSceneAdded?.(assistantScene);
    }
  }, [userText, turnId, processedUserText]);

  // Update placeholder assistant scene when new assistant text arrives
  useEffect(() => {
    if (assistantText && assistantText.trim() && assistantText !== processedAssistantText) {
      // Mark as processed IMMEDIATELY
      setProcessedAssistantText(assistantText);

      // Find the placeholder assistant scene (most recent scene with "..." text and right speaker)
      const placeholderIndex = scenes.findIndex((scene, index) =>
        scene.type === 'character' &&
        scene.text === '...' &&
        (scene as any).speaker === 'right'
      );

      if (placeholderIndex >= 0) {
        // Create the updated scene with actual assistant text
        const updatedScene = createCharacterPage(assistantText, "right");

        // Replace the placeholder scene
        setScenes(prevScenes => {
          const newScenes = [...prevScenes];
          newScenes[placeholderIndex] = updatedScene;
          return newScenes;
        });

        // Navigate to the assistant scene
        setTimeout(() => {
          goToIndex(placeholderIndex);
        }, 100);
      }
    }
  }, [assistantText, turnId, processedAssistantText]);

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