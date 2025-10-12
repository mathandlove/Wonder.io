/**
 * Main story mode component that renders a story as scrollable scenes.
 * Each scene gets its own 100vh section with snap-scroll behavior.
 */
import React, { useMemo } from "react";
import { useStory } from '@core/data/useStory';
import { FlowLayout } from '@features/flow-layout/FlowLayout';
import { SceneRenderer } from '@core/scenes/SceneRenderer';
import { PageFactoryProvider } from '@features/chat/orchestrators/PageFactory';
import { useSceneManager } from '@core/scenes/SceneManager';
import { BackgroundOrchestrator } from '@features/background/BackgroundOrchestrator';
import { CharacterOrchestrator } from '@features/characters/CharacterOrchestrator';
import { SpeechBubbleOrchestrator } from '@features/chat/orchestrators/SpeechBubbleOrchestrator';
import { injectPanelMetaFromFlows } from '@features/characters/adapters/injectPanelMetaFromFlows';
import { ScrollControl } from '@core/scroll/ScrollControl';
import { CharacterAnimationProvider } from '@features/characters/CharacterAnimationContext';
import type { Scene } from '@core/types/scene';
import type { QuestHook } from '@features/quest/QuestManager';

// Extended scene type for dynamic properties
type SceneWithId = Scene & {
  sceneId?: string;
  hidden?: boolean;
};

// Type extension for debugging window object
declare global {
  interface Window {
    __quest?: QuestHook;
    __hideScene?: (sceneId: string) => void;
    __showScene?: (sceneId: string) => void;
    __allScenes?: Scene[];
    __visibleScenes?: Scene[];
  }
}
import { QuestProvider, useQuest } from '@features/quest/QuestManager'
import { UIOverlayRoot } from '@core/uiLayout/UIOverlayRoot'
import { ChatOrchestrator } from '@features/chat/orchestrators/ChatOrchestrator'
import { useDialogue } from '@features/chat/context/useChatDialogue'
import { StepScrollDebug } from '@core/scroll/StepScrollDebug'
import { SceneStatesProvider } from '@core/scenes/SceneStates'
// Path to the story JSON bundle we want to load. In demo mode we keep this fixed
// so the experience is deterministic for the presentation.

const STORY_URL = "/stories/gingerbread.bundle/story.json"; // <- story content source

// FullScreen: tiny helper to center any message while we load or show an error
function FullScreen({ children }: { children: React.ReactNode }) {
  // Inline style keeps this component self-contained (no external CSS needed here)
  return (
    <div style={{ height: "100vh", width: "100vw", display: "grid", placeItems: "center" }}>
      <h2>{children}</h2>
    </div>
  );
}

// Debug probe to expose quest controls in console
const QuestDebugProbe: React.FC = () => {
  const quest = useQuest();
  React.useEffect(() => {
    // Log every state change
    // Expose quest controls in the console for manual testing
    window.__quest = {
      state: quest.state,
      offer: quest.offer,
      accept: quest.accept,
      complete: quest.complete,
      clear: quest.clear,
      reset: quest.reset,
    };
  }, [quest.state, quest.offer, quest.accept, quest.complete, quest.clear, quest.reset]);
  return null;
};

// StoryModeScrollV2 is the main screen that renders scenes as full-screen snap sections
const StoryModeScroll: React.FC = () => {
  return <StoryContent />;
};

// StoryContent: inner component that uses SceneManagerProvider context
const StoryContent: React.FC = () => {
  // Load story data
  const { story, loading, error } = useStory(STORY_URL);

  // Navigation context
  const { scenes, currentIndex, setScenes, setCurrentIndex, hideScene, showScene, allScenes } = useSceneManager();

  // Derive a stable array of scenes from the loaded story and set them in SceneManager
  React.useEffect(() => {
    if (!story?.scenes) return;
    // Inject panel metadata once during story load
    const processedScenes = injectPanelMetaFromFlows(story.scenes);
    setScenes(processedScenes);
  }, [story?.scenes, setScenes]);

  // Handle scene index changes
  const handleIndexChange = (nextIndex: number) => {
    // Update NavigationContext index
    // NavigationContext will emit scene:enter/leave events automatically
    setCurrentIndex(nextIndex);
  };

  // Note: Focus management is now handled within ScrollControl component

  // Debug: Expose scene hiding functions globally for testing
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__hideScene = hideScene;
      window.__showScene = showScene;
      window.__allScenes = allScenes;
      window.__visibleScenes = scenes;
    }
  }, [hideScene, showScene, allScenes, scenes]);

  // RENDER PATH #1: still loading the story → show a friendly centered message
  if (loading) {
    return <FullScreen>Loading story…</FullScreen>;
  }

  // RENDER PATH #2: failed or empty story → show an error/empty state
  if (error || !story || scenes.length === 0) {
    return (
      <FullScreen>
        {error ? `Problem loading story: ${error.message}` : "No story content found"}
      </FullScreen>
    );
  }

  // RENDER PATH #3: story loaded → render each scene in a vertical, snap-scrolling layout

  return (
    <QuestProvider>
      <PageFactoryProvider>
        <SceneStatesProvider>
          <CharacterAnimationProvider>
            {/* Unified scroll control component */}
            <ScrollControl
            scenes={scenes}
            currentIndex={currentIndex}
            onIndexChange={handleIndexChange}
            className="story-scroll"
          >
              {/* Layer 1: Hybrid background system */}
              <BackgroundOrchestrator storyId="gingerbread" storyContent={scenes} currentIndex={currentIndex} />

              {/* Layer 1.5: Character panels (fixed, independent of scroll flow) */}
              <CharacterOrchestrator storyId="gingerbread" scenes={scenes} currentIndex={currentIndex} />

              {/* Layer 1.8: Speech bubbles (scroll-based with delayed transitions) */}
              <SpeechBubbleOrchestrator scenes={scenes} currentIndex={currentIndex} />

              {/* Layer 1.9: Chat system (shows on lastInFlow scenes) */}
              <ChatOrchestrator />

              {/* Layer 2: Document flow content with scroll snap targets */}
              <div style={{ position: "relative" }}>
                {scenes.map((scene: Scene, i: number) => {
                  // Use stable ID if available, fallback to index for original scenes
                  const stableKey = (scene as SceneWithId).sceneId || `original-${i}`;

                  // Hidden scenes are already filtered out by NavigationContext,
                  // but add safety check and zero-height container if somehow present
                  if (scene.hidden) {
                    return (
                      <div
                        key={stableKey}
                        style={{ height: 0, overflow: 'hidden', visibility: 'hidden' }}
                      />
                    );
                  }

                  return (
                    <div
                      key={stableKey}
                      className="scene story-scene-container"
                      data-section-index={i}
                      style={{
                        minHeight: '100vh',
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always',
                        outline: 'none',
                      }}
                    >
                      <FlowLayout
                        keyId={i.toString()}
                        panelRestricted={(scene as unknown as { panelRestricted?: boolean })?.panelRestricted ?? false}
                      >
                        <SceneContentWithNavigation scene={scene} sceneIndex={i} />
                      </FlowLayout>
                    </div>
                  );
                })}
              </div>

            {/* Debug display - inside ScrollControl to access SceneOrchestrator context */}
            <StepScrollDebug />
          </ScrollControl>
          </CharacterAnimationProvider>
        </SceneStatesProvider>

        {/* UI Overlays - inside provider tree so they have context access */}
        <UIOverlayRoot />
      </PageFactoryProvider>
      <QuestDebugProbe />
    </QuestProvider>
  );
};


// SceneContentWithNavigation: thin wrapper to render a scene and navigate to the next scene when it completes
const SceneContentWithNavigation = React.memo(function SceneContentWithNavigation({ scene, sceneIndex }: { scene: Scene; sceneIndex: number }) {
  // SceneRenderer picks the right visual component for the given scene.type
  return (
    <SceneRenderer
      scene={scene}
      sceneIndex={sceneIndex}
    />
  );
});

// Default export so the router or parent can render this screen
// (kept simple for easy wiring during the demo)
export default StoryModeScroll;