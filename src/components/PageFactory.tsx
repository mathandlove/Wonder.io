/**
 * PageFactoryProvider - Creates new pages/scenes dynamically
 * that can be scrolled to and navigated within the story.
 */
import React, { createContext, useContext, useCallback } from "react";
import type { Scene, InteractiveBubbleScene } from "../types/scene";
import { useNavigation } from "../context/NavigationContext";
import { injectPanelMetaFromFlows } from "../characters/adapters/injectPanelMetaFromFlows";

type PageFactoryContextType = {
  createInteractiveBubblePage: (recordingId?: string) => InteractiveBubbleScene;
  addSceneToStory: (scene: Scene) => void;
  addSceneAndNavigate: (scene: Scene) => void;
};

const PageFactoryContext = createContext<PageFactoryContextType | null>(null);

type PageFactoryProviderProps = {
  children: React.ReactNode;
  onSceneAdded?: (scene: Scene) => void;
};

export function PageFactoryProvider({ children, onSceneAdded }: PageFactoryProviderProps) {
  const { scenes, currentIndex, insertScene, goToIndex, allScenes } = useNavigation();

  // Create an interactive bubble scene
  const createInteractiveBubblePage = (recordingId?: string): InteractiveBubbleScene => {
    const currentScene = scenes[currentIndex];

    // Extract characters from current scene, with fallbacks
    let leftCharacter = "leo";
    let rightCharacter = "bakerMom";

    if (currentScene) {
      if ('left-character' in currentScene && currentScene['left-character']) {
        leftCharacter = currentScene['left-character'] as string;
      }
      if ('right-character' in currentScene && currentScene['right-character']) {
        rightCharacter = currentScene['right-character'] as string;
      }
      if (currentScene.meta?.panelLeft?.character) {
        leftCharacter = currentScene.meta.panelLeft.character;
      }
      if (currentScene.meta?.panelRight?.character) {
        rightCharacter = currentScene.meta.panelRight.character;
      }
    }

    const sceneId = `interactive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newScene: InteractiveBubbleScene = {
      type: "interactive-bubble",
      sceneId,
      recordingId,
      "left-character": leftCharacter || "leo",
      "right-character": rightCharacter || "bakerMom",
    };

    // Inject panel metadata
    const scenesForMetaInjection = [currentScene, newScene].filter(Boolean);
    const scenesWithMeta = injectPanelMetaFromFlows(scenesForMetaInjection);
    const sceneWithMeta = scenesWithMeta[scenesWithMeta.length - 1];

    return sceneWithMeta as InteractiveBubbleScene;
  };

  // Legacy addSceneToStory - keeping for external API compatibility but not used internally
  const addSceneToStory = useCallback((scene: Scene) => {
    // Find the correct insertion index in allScenes array
    const currentVisibleScene = scenes[currentIndex];
    let insertIndex = allScenes.length;

    if (currentVisibleScene) {
      const currentSceneId = (currentVisibleScene as any).sceneId;
      const allScenesIndex = allScenes.findIndex(s => (s as any).sceneId === currentSceneId);
      if (allScenesIndex !== -1) {
        insertIndex = allScenesIndex + 1;
      }
    }

    insertScene(scene, insertIndex);

    // Navigate to the new scene with a slight delay for smooth transition
    setTimeout(() => {
      goToIndex(currentIndex + 1);
    }, 50);

    onSceneAdded?.(scene);
  }, [insertScene, currentIndex, goToIndex, onSceneAdded, scenes, allScenes]);

  // Add a scene and immediately navigate to it
  const addSceneAndNavigate = useCallback((scene: Scene) => {
    const currentVisibleScene = scenes[currentIndex];
    let insertIndex = allScenes.length;

    if (currentVisibleScene) {
      const currentSceneId = (currentVisibleScene as any).sceneId;
      const allScenesIndex = allScenes.findIndex(s => (s as any).sceneId === currentSceneId);
      if (allScenesIndex !== -1) {
        insertIndex = allScenesIndex + 1;
      }
    }

    insertScene(scene, insertIndex);

    // Navigate to the new scene with a slight delay for smooth transition
    setTimeout(() => {
      goToIndex(currentIndex + 1);
    }, 50);

    onSceneAdded?.(scene);
  }, [insertScene, currentIndex, goToIndex, onSceneAdded, scenes, allScenes]);

  const contextValue: PageFactoryContextType = {
    createInteractiveBubblePage,
    addSceneToStory,
    addSceneAndNavigate
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