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
  const { insertScene, currentIndex, goToIndex, scenes, allScenes, setScenes } = useNavigation();
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

    // console.log('🏗️ Building character page from current scene:', {
    //   currentIndex,
    //   currentSceneType: currentScene?.type,
    //   extractedLeftChar: leftCharacter,
    //   extractedRightChar: rightCharacter,
    //   newSpeaker: speaker,
    //   textLength: text.length,
    //   scenesLength: scenes.length
    // });

    const sceneId = `created-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      sceneId,
      // Meta will be added by injectPanelMetaFromFlows
    };

    console.log(`[PAGE_CREATE] Created new scene with sceneId: ${sceneId}, type: ${newScene.type}, speaker: ${speaker}`);
    return newScene;
  };

  // Legacy addSceneToStory - keeping for external API compatibility but not used internally
  const addSceneToStory = useCallback((scene: Scene) => {
    // Find the correct insertion index in allScenes array
    // currentIndex is based on visibleScenes, but insertScene operates on allScenes
    const currentVisibleScene = scenes[currentIndex];
    let insertIndex = allScenes.length; // Default to end if not found

    console.log(`[PageFactory] === BEFORE INSERTION ===`);
    console.log(`[PageFactory] Current visible index: ${currentIndex}`);
    console.log(`[PageFactory] Current visible scene:`, currentVisibleScene?.type, (currentVisibleScene as any)?.sceneId);
    console.log(`[PageFactory] AllScenes length: ${allScenes.length}`);
    console.log(`[PageFactory] VisibleScenes length: ${scenes.length}`);
    console.log(`[PageFactory] AllScenes structure:`, allScenes.map((s, i) => `${i}: ${s.type}(${(s as any).sceneId})${s.hidden ? '[HIDDEN]' : ''}`));

    if (currentVisibleScene) {
      // Find where the current visible scene appears in allScenes
      const currentSceneId = (currentVisibleScene as any).sceneId;
      const allScenesIndex = allScenes.findIndex(s => (s as any).sceneId === currentSceneId);
      if (allScenesIndex !== -1) {
        insertIndex = allScenesIndex + 1; // Insert after the current scene
      }
      console.log(`[PageFactory] Found current scene at allScenes index ${allScenesIndex}, will insert at ${insertIndex}`);
    }

    insertScene(scene, insertIndex);
    console.log(`[PAGE_INSERT] Inserted scene ${(scene as any).sceneId} at allScenes index ${insertIndex}`);
    console.log(`[PageFactory] === AFTER INSERTION ===`);

    // Navigate to the new scene (currentIndex + 1 in visible scenes)
    setTimeout(() => {
      goToIndex(currentIndex + 1);
    }, 100);

    onSceneAdded?.(scene);
  }, [insertScene, currentIndex, goToIndex, onSceneAdded, scenes, allScenes]);

  // Auto-create and add scenes when new user text arrives
  useEffect(() => {
    if (userText && userText.trim() && userText !== processedUserText) {
      // Mark as processed IMMEDIATELY to prevent multiple insertions
      setProcessedUserText(userText);

      // Create user scene (left speaker = Leo speaking user's text)
      const userScene = createCharacterPage(userText, "left");

      // Find the correct insertion index in allScenes array
      // currentIndex is based on visibleScenes, but insertScene operates on allScenes
      const currentVisibleScene = scenes[currentIndex];
      let userInsertIndex = allScenes.length; // Default to end if not found

      console.log(`[AUTO_INSERT] === USER SCENE INSERTION ===`);
      console.log(`[AUTO_INSERT] Current visible index: ${currentIndex}`);
      console.log(`[AUTO_INSERT] Current visible scene:`, currentVisibleScene?.type, (currentVisibleScene as any)?.sceneId);

      if (currentVisibleScene) {
        // Find where the current visible scene appears in allScenes
        const currentSceneId = (currentVisibleScene as any).sceneId;
        const allScenesIndex = allScenes.findIndex(s => (s as any).sceneId === currentSceneId);
        if (allScenesIndex !== -1) {
          userInsertIndex = allScenesIndex + 1; // Insert after the current scene
        }
        console.log(`[AUTO_INSERT] Found current scene at allScenes index ${allScenesIndex}, will insert user scene at ${userInsertIndex}`);
      }

      insertScene(userScene, userInsertIndex);
      console.log(`[AUTO_INSERT] Inserted user scene ${(userScene as any).sceneId} at allScenes index ${userInsertIndex}`);

      // Auto-navigate to the user scene immediately (use visible scene index)
      setTimeout(() => {
        goToIndex(currentIndex + 1);
      }, 100);

      // Create AI response scene after 500ms
      setTimeout(() => {
        const aiResponseText = `AI response to: ${userText}`;
        const aiScene = createCharacterPage(aiResponseText, "right");
        const aiInsertIndex = userInsertIndex + 1;

        console.log(`[AUTO_INSERT] === AI SCENE INSERTION ===`);
        console.log(`[AUTO_INSERT] Inserting AI scene at allScenes index ${aiInsertIndex} (after user scene)`);

        insertScene(aiScene, aiInsertIndex);
        console.log(`[AUTO_INSERT] Inserted AI scene ${(aiScene as any).sceneId} at allScenes index ${aiInsertIndex}`);

        // Navigate to AI scene immediately after creation (use visible scene index)
        setTimeout(() => {
          goToIndex(currentIndex + 2); // User scene at +1, AI scene at +2
        }, 100);

        onSceneAdded?.(aiScene);
      }, 500); // Normal AI response time

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