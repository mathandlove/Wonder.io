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
  const [userSceneInsertIndex, setUserSceneInsertIndex] = useState<number | null>(null);


  // Reset processed text tracking when turn changes or when text is cleared
  useEffect(() => {
    if (turnId !== lastTurnId) {
      setProcessedUserText("");
      setProcessedAssistantText("");
      setUserSceneInsertIndex(null);
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

    console.log('🏗️ Building character page from current scene:', {
      currentSceneType: currentScene?.type,
      extractedLeftChar: leftCharacter,
      extractedRightChar: rightCharacter,
      newSpeaker: speaker,
      textLength: text.length
    });

    const newScene = {
      type: "character",
      text,
      speaker,
      // Copy characters from current scene
      "left-character": leftCharacter,
      "right-character": rightCharacter,
      // No default background - inherit from current context
      // Add panel restriction for proper margins
      panelRestricted: true,
    };

    console.log('🏗️ PageFactory created scene:', newScene);
    return newScene;
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

      // Create user scene (left speaker = Leo speaking user's text)
      const userScene = createCharacterPage(userText, "left");

      // Insert relative to current position (where input button was pressed)
      const userInsertIndex = currentIndex + 1;
      setUserSceneInsertIndex(userInsertIndex); // Track for AI response

      console.log('📝 Creating USER scene (Leo speaking):', {
        type: userScene.type,
        text: userScene.text,
        speaker: userScene.speaker,
        leftCharacter: userScene['left-character'],
        rightCharacter: userScene['right-character'],
        insertIndex: userInsertIndex
      });

      insertScene(userScene, userInsertIndex);

      // Auto-navigate to the user scene
      setTimeout(() => {
        goToIndex(userInsertIndex);
      }, 100);

      onSceneAdded?.(userScene);
    }
  }, [userText, turnId, processedUserText, currentIndex]);

  // Create assistant scene when new assistant text arrives
  useEffect(() => {
    if (assistantText && assistantText.trim() && assistantText !== processedAssistantText) {
      // Mark as processed IMMEDIATELY
      setProcessedAssistantText(assistantText);

      // Delay AI response by 500ms after user scene
      setTimeout(() => {
        // Create assistant scene (right speaker = AI)
        const assistantScene = createCharacterPage(assistantText, "right");

        // Insert sequentially after user scene (userSceneInsertIndex + 1)
        const assistantInsertIndex = userSceneInsertIndex !== null ? userSceneInsertIndex + 1 : currentIndex + 2;

        console.log('🤖 Creating ASSISTANT scene:', {
          type: assistantScene.type,
          text: assistantScene.text,
          speaker: assistantScene.speaker,
          leftCharacter: assistantScene['left-character'],
          rightCharacter: assistantScene['right-character'],
          insertIndex: assistantInsertIndex,
          userSceneWasAt: userSceneInsertIndex
        });

        insertScene(assistantScene, assistantInsertIndex);

        // Navigate to the assistant scene
        setTimeout(() => {
          goToIndex(assistantInsertIndex);
        }, 100);

        onSceneAdded?.(assistantScene);
      }, 500); // 500ms delay after user scene
    }
  }, [assistantText, turnId, processedAssistantText, userSceneInsertIndex, currentIndex]);

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