/**
 * Main story mode component that renders a story as scrollable scenes.
 * Each scene gets its own 100vh section with snap-scroll behavior.
 */
import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import { useStory } from "./hooks/useStory";
import { FlowLayout } from "./components/FlowLayout";
import { SceneRenderer } from "./components/SceneRenderer";
import { PageFactoryProvider } from "./components/PageFactory";
import { useNavigation } from "./context/NavigationContext";
import { BackgroundOrchestrator } from "./background/BackgroundOrchestrator";
import { CharacterOrchestrator } from "./characters/CharacterOrchestrator";
import { SpeechBubbleOrchestrator } from "./components/SpeechBubbleOrchestrator";
import { CaptionComponent } from "./components/CaptionComponent";
import { injectPanelMetaFromFlows } from "./characters/adapters/injectPanelMetaFromFlows";
import { useSceneNavigation } from "./hooks/useSceneNavigation";
import { useStepScroll } from "./hooks/useStepScroll";
import { CharacterAnimationProvider } from "./context/CharacterAnimationContext";
import type { Scene } from "./types/scene";
import "./components/SnapScroll.css";
import { QuestProvider, useQuest } from "./quest/QuestManager"
import { UIOverlayRoot } from "./components/UIOverlayRoot"
import { ChatOrchestrator } from "./components/ChatOrchestrator"
import { CaptionOrchestrator } from "./components/CaptionOrchestrator"
import { SceneBusProvider } from "./scenes/registry/SceneBusProvider"
import { sceneBus } from "./scenes/registry/sceneBus"
import { ScrollLockDebugger } from "./components/ScrollLockDebugger"
import { useDialogue } from "./chat/ChatDialogueContext"
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
    (window as any).__quest = {
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
      const direction = nextIndex > index ? 'forward' : 'backward';

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
        const shouldLock = isPlayerTurn || waiting || questState === 'active';
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
      (window as any).__hideScene = hideScene;
      (window as any).__showScene = showScene;
      (window as any).__allScenes = allScenes;
      (window as any).__visibleScenes = navigationScenes;
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

        {/* Layer 1.7: Image captions - rendered outside document flow */}
        <CaptionOrchestrator scenes={scenes} />

        {/* Layer 1.8: Speech bubbles (scroll-based with delayed transitions) */}
        <SpeechBubbleOrchestrator scenes={scenes} currentIndex={index} />

        {/* Layer 1.9: Chat system (shows on lastInFlow scenes) */}
        <ChatOrchestrator />

        {/* Layer 2: Document flow content with scroll snap targets */}
        <div style={{ position: "relative" }}>
          {scenes.map((scene: Scene, i: number) => {
            // Use stable ID if available, fallback to index for original scenes
            const stableKey = (scene as any).sceneId || `original-${i}`;

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
        <ScrollLockDebugger />
      </QuestProvider>
    </SceneBusProvider>
  );
};

// ImageSceneOrchestrator: Renders image scenes outside the scroll flow with background-like transforms
const ImageSceneOrchestrator = React.memo(function ImageSceneOrchestrator({ scenes, index }: { scenes: Scene[]; index: number }) {
  // Build image ranges - group image scenes with their following caption scenes
  const imageRanges = React.useMemo(() => {
    const ranges: Array<{ startIndex: number; endIndex: number; image: string; scene: Scene }> = [];
    let i = 0;

    while (i < scenes.length) {
      const scene = scenes[i];

      if (scene.type === 'image' && scene.image) {
        const startIndex = i;
        let endIndex = i;

        // Look ahead to include the caption scene if it exists
        if (i + 1 < scenes.length && scenes[i + 1].type === 'caption') {
          endIndex = i + 1; // Include the caption scene in the range
          i += 2; // Skip both image and caption
        } else {
          i += 1; // Just the image scene
        }

        ranges.push({
          startIndex,
          endIndex,
          image: scene.image,
          scene: scene
        });
      } else {
        i += 1; // Skip non-image scenes
      }
    }

    return ranges;
  }, [scenes]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -5 // Between background (-10) and content
    }}>
      {imageRanges.map((range) => {
        // Calculate transform based on range, not individual scene
        const tolerance = 0.1;
        let transform: string;

        if (index < range.startIndex - tolerance) {
          // Image range is waiting below (not reached yet)
          transform = `translateY(${(range.startIndex - index) * 100}vh)`;
        } else if (index > range.endIndex + tolerance) {
          // Image range has scrolled up and away
          transform = `translateY(${(range.endIndex - index) * 100}vh)`;
        } else {
          // Image range is visible and fixed in place
          transform = 'translateY(0)';
        }

        return (
          <div
            key={`image-range-${range.startIndex}-${range.endIndex}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              transform,
              transition: 'transform 0.6s ease-out'
            }}
          >
            <SceneRenderer scene={range.scene} />
          </div>
        );
      })}
    </div>
  );
});

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