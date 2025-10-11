/**
 * Main story mode component that renders a story as scrollable scenes.
 * Each scene gets its own 100vh section with snap-scroll behavior.
 */
import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import { useStory } from '@shared/hooks/useStory";
import { FlowLayout } from '@shared/components/FlowLayout";
import { SceneRenderer } from '@shared/components/SceneRenderer";
import { PageFactoryProvider } from '@features/chat/orchestrators/PageFactory";
import { useNavigation } from '@core/navigation/NavigationContext";
import { BackgroundOrchestrator } from '@features/background/BackgroundOrchestrator";
import { CharacterOrchestrator } from '@features/characters/CharacterOrchestrator";
import { SpeechBubbleOrchestrator } from '@features/chat/orchestrators/SpeechBubbleOrchestrator";
import { ImageSceneOrchestrator } from '@shared/components/image/ImageSceneOrchestrator";
import { injectPanelMetaFromFlows } from '@features/characters/adapters/injectPanelMetaFromFlows";
import { useSceneNavigation } from '@core/navigation/useSceneNavigation";
import { useStepScroll } from '@core/scroll/useStepScroll";
import { CharacterAnimationProvider } from '@features/characters/CharacterAnimationContext";
import type { Scene } from '@core/types/scene";
import type { QuestHook } from '@core/quest/QuestManager";

// Extended scene type for dynamic properties
type SceneWithId = Scene & {
  sceneId?: string;
  hidden?: boolean;
};
import "./components/SnapScroll.css";

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
import { QuestProvider, useQuest } from '@core/quest/QuestManager'
import { UIOverlayRoot } from '@shared/components/UIOverlayRoot'
import { ChatOrchestrator } from '@features/chat/orchestrators/ChatOrchestrator'
import { SceneBusProvider } from '@core/bus/SceneBusProvider'
import { sceneBus } from '@core/bus/sceneBus'
import { useDialogue } from '@features/chat/context/ChatDialogueContext'
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
const StoryModeScrollV2: React.FC = () => {
  return <StoryContent />;
};

// StoryContent: inner component that uses NavigationProvider context
const StoryContent: React.FC = () => {
  // Load story data
  const { story, loading, error } = useStory(STORY_URL);

  // Navigation context
  const { scenes: navigationScenes, setScenes, setCurrentIndex, hideScene, showScene, allScenes } = useNavigation();

  // Chat dialogue context for content lock checking
  const { isPlayerTurn, waiting, questState } = useDialogue();

  // Derive a stable array of scenes from the loaded story
  const initialScenes = useMemo(() => story?.scenes || [], [story?.scenes]);

  // Inject panel metadata from flow-based authoring
  const scenesWithPanelMeta = useMemo(() => {
    const processed = injectPanelMetaFromFlows(initialScenes);


    return processed;
  }, [initialScenes]);

  // Handle scene navigation updates
  useSceneNavigation({ initialScenes: scenesWithPanelMeta, setScenes });

  // Handle scroll management with step scroll system
  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // Step scroll integration
  const getIndex = () => {
    const el = containerRef.current;
    if (!el) return 0;
    const y = el.scrollTop;
    let best = 0, bestDist = Infinity;
    const sections = el.querySelectorAll<HTMLElement>('.scene');
    sections.forEach((s, i) => {
      const dist = Math.abs(s.offsetTop - y);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return best;
  };

  const isInputFocused = () => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return false;
    const tag = a.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || a.isContentEditable;
  };

  const handleIndexChange = (nextIndex: number) => {
    // Emit scene bus events for enter/leave
    if (nextIndex !== index) {
      const direction = nextIndex > index ? 'forward' : 'backward";

      // Emit leave event for previous scene
      const prevScene = scenes[index];
      if (prevScene && prevScene.sceneId) {
        sceneBus.emit('scene:leave', prevScene.sceneId, direction);
      }

      // Emit enter event for new scene
      const newScene = scenes[nextIndex];
      if (newScene && newScene.sceneId) {
        sceneBus.emit('scene:enter', newScene.sceneId, direction);
      }
    }

    setIndex(nextIndex);
    setCurrentIndex(nextIndex);
  };

  // Check content-level locks for input scenes
  const checkContentLocks = (direction: 'forward' | 'backward', currentIndex: number): boolean => {
    const currentScene = scenes[currentIndex];
    if (!currentScene) return false;

    // Only check locks for input scenes
    if (currentScene.type === 'input') {
      if (direction === 'forward') {
        // Block forward navigation when:
        // - Player turn is active (input needed)
        // - System is waiting for response
        // - Quest is still active
        const shouldLock = isPlayerTurn || waiting || questState === 'active";
        return shouldLock;
      }
    }

    return false; // No content locks for other scene types or backward navigation
  };


  useStepScroll(containerRef, {
    onIndexChange: handleIndexChange,
    getIndex,
    count: () => scenes.length,
    durationMs: 380,
    thresholdPx: 60, // Reasonable threshold - prevents accidental scene changes
    isInputFocused,
    checkContentLocks,
  });

  // Ensure focus lands on the active scene for accessibility
  useLayoutEffect(() => {
    const el = containerRef.current;
    const node = el?.querySelectorAll<HTMLElement>('.scene')[index];
    node?.setAttribute('tabindex', '-1');
    node?.focus({ preventScroll: true });
  }, [index]);

  // Use navigation scenes (already processed, just filter for visibility)
  // Don't re-process with injectPanelMetaFromFlows as it breaks character metadata
  const scenes = navigationScenes;


  // Debug: Expose scene hiding functions globally for testing
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__hideScene = hideScene;
      window.__showScene = showScene;
      window.__allScenes = allScenes;
      window.__visibleScenes = navigationScenes;
    }
  }, [hideScene, showScene, allScenes, navigationScenes]);

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
    <SceneBusProvider>
      <QuestProvider>
        <PageFactoryProvider>
          <CharacterAnimationProvider>
        <div
          ref={containerRef}
          className="story-scroll"
          tabIndex={0}
          style={{
            height: '100vh',
            overflowY: 'auto',
            scrollSnapType: 'y mandatory',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
        {/* Layer 1: Hybrid background system */}
        <BackgroundOrchestrator storyId="gingerbread" storyContent={scenes} currentIndex={index} />

        {/* Layer 1.5: Character panels (fixed, independent of scroll flow) */}
        <CharacterOrchestrator storyId="gingerbread" scenes={scenes} currentIndex={index} />

        {/* Layer 1.6: Image scenes (fixed, independent of scroll flow) */}
        <ImageSceneOrchestrator scenes={scenes} index={index} />

        {/* Layer 1.7: Image captions - now rendered within ImageScene components */}

        {/* Layer 1.8: Speech bubbles (scroll-based with delayed transitions) */}
        <SpeechBubbleOrchestrator scenes={scenes} currentIndex={index} />

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

        </div>
          </CharacterAnimationProvider>
        </PageFactoryProvider>
        <QuestDebugProbe />
        <UIOverlayRoot />
      </QuestProvider>
    </SceneBusProvider>
  );
};


// SceneContentWithNavigation: thin wrapper to render a scene and navigate to the next scene when it completes
const SceneContentWithNavigation = React.memo(function SceneContentWithNavigation({ scene, sceneIndex }: { scene: Scene; sceneIndex: number }) {
  // Skip rendering image scenes here since they're handled by ImageSceneOrchestrator
  if (scene.type === 'image') {
    return null;
  }

  // Use navigation context instead of direct snap API
  // const { goToNext } = useNavigation();

  // When the scene signals completion, use navigation context to advance
  // const handleComplete = React.useCallback(() => {
  //   goToNext();
  // }, [goToNext]);

  // SceneRenderer picks the right visual component for the given scene.type
  return (
    <SceneRenderer
      scene={scene}
      sceneIndex={sceneIndex}
      // onComplete={handleComplete} // callback the scene triggers when it's done (e.g., after a button pressed)
    />
  );
});

// Default export so the router or parent can render this screen
// (kept simple for easy wiring during the demo)
export default StoryModeScrollV2;