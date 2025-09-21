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
  const { userText, turnId } = useDialogue();
  const { insertScene, currentIndex, goToIndex, scenes, setScenes } = useNavigation();
  const [processedUserText, setProcessedUserText] = useState<string>("");
  const [lastTurnId, setLastTurnId] = useState<number>(turnId);



  // Reset processed text tracking when turn changes or when text is cleared
  useEffect(() => {
    if (turnId !== lastTurnId) {
      setProcessedUserText("");
      setLastTurnId(turnId);
    }
  }, [turnId, lastTurnId]);

  // Create a new character scene with the provided text
  const createCharacterPage = (text: string, speaker: "left" | "right" = "right"): CharacterScene => {
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
      currentIndex,
      currentSceneType: currentScene?.type,
      extractedLeftChar: leftCharacter,
      extractedRightChar: rightCharacter,
      newSpeaker: speaker,
      textLength: text.length,
      scenesLength: scenes.length
    });

    const newScene = {
      type: "character",
      text,
      speaker,
      // Copy characters from current scene - ensure they're never undefined
      "left-character": leftCharacter || "leo",
      "right-character": rightCharacter || "bakerMom",
      // No default background - inherit from current context
      // Add panel restriction for proper margins
      panelRestricted: true,
      // Add stable ID for React keys
      sceneId: `created-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    console.log('🏗️ PageFactory created scene:', newScene);
    return newScene;
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userText, turnId, processedUserText]);

  // AI page creation removed - only create user pages on submit

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