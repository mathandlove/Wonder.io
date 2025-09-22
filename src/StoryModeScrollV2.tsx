/**
 * Main story mode component that renders a story as scrollable scenes.
 * Each scene gets its own 100vh section with snap-scroll behavior.
 */
import React, { useMemo } from "react";
import { useStory } from "./hooks/useStory";
import { SnapLayer } from "./components/SnapLayer";
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
import { useScrollManager } from "./hooks/useScrollManager";
import { CharacterAnimationProvider } from "./context/CharacterAnimationContext";
import type { Scene } from "./types/scene";
import "./components/SnapScroll.css";
import { UIOverlayRoot } from "./components/UIOverlayRoot";
import { QuestProvider } from "./quest/QuestManager"
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

// StoryModeScrollV2 is the main screen that renders scenes as full-screen snap sections
const StoryModeScrollV2: React.FC = () => {
  return <StoryContent />;
};

// StoryContent: inner component that uses NavigationProvider context
const StoryContent: React.FC = () => {
  // Load story data
  const { story, loading, error } = useStory(STORY_URL);

  // Navigation context
  const { scenes: navigationScenes, setScenes, setCurrentIndex } = useNavigation();

  // Derive a stable array of scenes from the loaded story
  const initialScenes = useMemo(() => story?.scenes || [], [story?.scenes]);

  // Inject panel metadata from flow-based authoring
  const scenesWithPanelMeta = useMemo(
    () => injectPanelMetaFromFlows(initialScenes),
    [initialScenes]
  );

  // Handle scene navigation updates
  useSceneNavigation({ initialScenes: scenesWithPanelMeta, setScenes });

  // Handle scroll management
  const { railRef, index, setIsProgrammatic, targetIndex } = useScrollManager({ setCurrentIndex });

  // Use navigation scenes (includes dynamically added scenes with panel meta)
  const scenes = useMemo(
    () => injectPanelMetaFromFlows(navigationScenes),
    [navigationScenes]
  );

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
      <CharacterAnimationProvider>
        <SnapLayer
          railRef={railRef}
          targetIndex={targetIndex}
          setIsProgrammatic={setIsProgrammatic}
          currentIndex={index}
        >
        {/* Layer 1: Hybrid background system */}
        <BackgroundOrchestrator storyId="gingerbread" storyContent={scenes} />

        {/* Layer 1.5: Character panels (fixed, independent of scroll flow) */}
        <CharacterOrchestrator storyId="gingerbread" scenes={scenes} />

        {/* Layer 1.6: Image scenes (fixed, independent of scroll flow) */}
        <ImageSceneOrchestrator scenes={scenes} index={index} />

        {/* Layer 1.7: Image captions (appear on second scene of each image pair) */}
        <CaptionComponent scenes={scenes} index={index} />

        {/* Layer 1.8: Speech bubbles (scroll-based with delayed transitions) */}
        <SpeechBubbleOrchestrator scenes={scenes} currentIndex={index} />

        {/* Layer 2: Document flow content with scroll snap targets */}
        <div style={{ position: "relative" }}>
          {scenes.map((scene: Scene, i: number) => {
            // Use stable ID if available, fallback to index for original scenes
            const stableKey = (scene as any).sceneId || `original-${i}`;
            return (
            <div key={stableKey} className="story-scene-container">
              <FlowLayout
                keyId={i.toString()}
                panelRestricted={(scene as any)?.panelRestricted ?? false}
              >
                <SceneContentWithNavigation scene={scene} sceneIndex={i} />
              </FlowLayout>
            </div>
            );
          })}
        </div>

        {/* Layer 3: Programmatic scroll control (hidden) */}
        <div ref={railRef} style={{ display: "none" }}>
          {scenes.map((_, i) => (
            <div key={i} data-rail-index={i} />
          ))}
        </div>
        </SnapLayer>

        {/* Layer 4: UI overlays (quests, dialogs, etc.) */}
        <UIOverlayRoot />
      </CharacterAnimationProvider>
    </PageFactoryProvider>
    </QuestProvider>
  );
};

// ImageSceneOrchestrator: Renders image scenes outside the scroll flow with background-like transforms
const ImageSceneOrchestrator = React.memo(function ImageSceneOrchestrator({ scenes, index }: { scenes: Scene[]; index: number }) {
  // Build image ranges - group consecutive scenes with the same image
  const imageRanges = React.useMemo(() => {
    const ranges: Array<{ startIndex: number; endIndex: number; image: string; scene: Scene }> = [];
    let currentImage: string | null = null;
    let rangeStart = -1;
    let currentScene: Scene | null = null;

    scenes.forEach((scene, i) => {
      if (scene.type === 'image') {
        if (scene.image !== currentImage) {
          // Finish previous range if exists
          if (currentImage && currentScene) {
            ranges.push({
              startIndex: rangeStart,
              endIndex: i - 1,
              image: currentImage,
              scene: currentScene
            });
          }
          // Start new range
          currentImage = scene.image;
          rangeStart = i;
          currentScene = scene;
        }
        // Continue current range (same image)
      } else {
        // Non-image scene, finish current range if exists
        if (currentImage && currentScene) {
          ranges.push({
            startIndex: rangeStart,
            endIndex: i - 1,
            image: currentImage,
            scene: currentScene
          });
          currentImage = null;
          currentScene = null;
        }
      }
    });

    // Finish final range if exists
    if (currentImage && currentScene) {
      ranges.push({
        startIndex: rangeStart,
        endIndex: scenes.length - 1,
        image: currentImage,
        scene: currentScene
      });
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