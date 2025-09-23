/**
 * PageFactory creates new character scenes dynamically from dialogue text.
 * It works with DialogueContext to add AI-generated responses as new scenes
 * that can be scrolled to and navigated within the story.
 */
import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import type { CharacterScene, Scene } from "../types/scene";
import { useDialogue } from "../context/DialogueContext";
import { useNavigation } from "../context/NavigationContext";
import { injectPanelMetaFromFlows } from "../characters/adapters/injectPanelMetaFromFlows";

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

    // Inject panel metadata for character rendering with proper context
    // Include the current scene as "previous" so transitions are calculated correctly
    const scenesForMetaInjection = [currentScene, newScene].filter(Boolean);

    console.log(`[PANEL_INJECT] Before injection:`, {
      numScenes: scenesForMetaInjection.length,
      currentSceneType: currentScene?.type,
      currentLeftChar: (currentScene as any)?.['left-character'],
      currentRightChar: (currentScene as any)?.['right-character'],
      newSceneLeftChar: newScene['left-character'],
      newSceneRightChar: newScene['right-character']
    });

    const scenesWithMeta = injectPanelMetaFromFlows(scenesForMetaInjection);
    const sceneWithMeta = scenesWithMeta[scenesWithMeta.length - 1]; // Get the last one (our new scene)

    console.log(`[PANEL_INJECT] After injection:`, {
      leftNewCharacter: sceneWithMeta.meta?.panelLeft?.newCharacter,
      rightNewCharacter: sceneWithMeta.meta?.panelRight?.newCharacter,
      leftPrevChar: sceneWithMeta.meta?.panelLeft?.previousCharacter,
      rightPrevChar: sceneWithMeta.meta?.panelRight?.previousCharacter,
      leftCurrChar: sceneWithMeta.meta?.panelLeft?.character,
      rightCurrChar: sceneWithMeta.meta?.panelRight?.character
    });

    return sceneWithMeta;
  };

  // Legacy addSceneToStory - keeping for external API compatibility but not used internally
  const addSceneToStory = useCallback((scene: Scene) => {
    // Find the correct insertion index in allScenes array
    // currentIndex is based on visibleScenes, but insertScene operates on allScenes
    const currentVisibleScene = scenes[currentIndex];
    let insertIndex = allScenes.length; // Default to end if not found

    if (currentVisibleScene) {
      // Find where the current visible scene appears in allScenes
      const currentSceneId = (currentVisibleScene as any).sceneId;
      const allScenesIndex = allScenes.findIndex(s => (s as any).sceneId === currentSceneId);
      if (allScenesIndex !== -1) {
        insertIndex = allScenesIndex + 1; // Insert after the current scene
      }
    }

    insertScene(scene, insertIndex);

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

      if (currentVisibleScene) {
        // Find where the current visible scene appears in allScenes
        const currentSceneId = (currentVisibleScene as any).sceneId;
        const allScenesIndex = allScenes.findIndex(s => (s as any).sceneId === currentSceneId);
        if (allScenesIndex !== -1) {
          userInsertIndex = allScenesIndex + 1; // Insert after the current scene
        }
      }

      insertScene(userScene, userInsertIndex);

      // Auto-navigate to the user scene immediately (use visible scene index)
      setTimeout(() => {
        goToIndex(currentIndex + 1);
      }, 100);

      // Create AI response scene after 5 seconds
      setTimeout(() => {
        const aiResponseText = `AI response to: ${userText}`;
        const aiScene = createCharacterPage(aiResponseText, "right");
        const aiInsertIndex = userInsertIndex + 1;

        insertScene(aiScene, aiInsertIndex);

        // Navigate to AI scene immediately after creation (use visible scene index)
        setTimeout(() => {
          goToIndex(currentIndex + 2); // User scene at +1, AI scene at +2
        }, 100);

        onSceneAdded?.(aiScene);
      }, 5000); // 5 second AI response time

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