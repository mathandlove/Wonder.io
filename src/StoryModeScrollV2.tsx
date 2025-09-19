// Beginner-friendly comments added to explain each major part of this file.
/**
 * Main story mode component that renders a story as scrollable scenes.
 * Each scene gets its own 100vh section with snap-scroll behavior.
 */
// React imports and custom hooks/components used by this screen
import React, { useMemo, useEffect, useRef } from "react";
import { useStory } from "./hooks/useStory";
import { SnapLayer } from "./components/SnapLayer";
import { FlowLayout } from "./components/FlowLayout";
import { SceneRenderer } from "./components/SceneRenderer";
import { PageFactoryProvider } from "./components/PageFactory";
import { useNavigation } from "./context/NavigationContext";
import { BackgroundOrchestrator } from "./background/BackgroundOrchestrator";
import { useScrollOffset } from "./hooks/useScrollOffset";
// import { useMagneticScroller } from "./hooks/useMagneticScroller";
import type { Scene } from "./types/scene";
import "./components/SnapScroll.css";

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
  // useStory() is our data hook: it fetches the story JSON and exposes loading/error states
  const { story, loading, error } = useStory(STORY_URL);
  const { scenes: navigationScenes, setScenes, setCurrentIndex } = useNavigation();

  // Multi-layered scroll architecture
  const railRef = useRef<HTMLDivElement>(null);
  const { index, setIsProgrammatic } = useScrollOffset(railRef);
  // Temporarily disable magnetic scroller to test pure CSS snap
  // const { targetIndex } = useMagneticScroller({ railRef, index, offset, isProgrammatic });
  const targetIndex = undefined;

  // Derive a stable array of scenes from the loaded story. useMemo avoids re-computing unless story.scenes changes
  // Move useMemo BEFORE any conditional returns to satisfy Rules of Hooks
  const initialScenes = useMemo(() => story?.scenes || [], [story?.scenes]);

  // Update navigation context when initial scenes change
  useEffect(() => {
    setScenes(initialScenes);
  }, [initialScenes, setScenes]);

  // Keep NavigationContext up-to-date with rail scroll index
  useEffect(() => {
    setCurrentIndex(index);
  }, [index, setCurrentIndex]);

  // Use navigation scenes instead of story scenes (this includes dynamically added scenes)
  const scenes = navigationScenes;

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
    <PageFactoryProvider>
      <SnapLayer
        railRef={railRef}
        targetIndex={targetIndex}
        setIsProgrammatic={setIsProgrammatic}
        currentIndex={index}
      >
        {/* Layer 1: Hybrid background system */}
        <BackgroundOrchestrator storyId="gingerbread" storyContent={scenes} />

        {/* Layer 2: Document flow content with scroll snap targets */}
        <div style={{ position: "relative" }}>
          {scenes.map((scene: Scene, i: number) => (
            <div key={i} className="story-scene-container">
              <FlowLayout keyId={i.toString()}>
                <SceneContentWithNavigation scene={scene} />
              </FlowLayout>
            </div>
          ))}
        </div>

        {/* Layer 3: Programmatic scroll control (hidden) */}
        <div ref={railRef} style={{ display: "none" }}>
          {scenes.map((_, i) => (
            <div key={i} data-rail-index={i} />
          ))}
        </div>
      </SnapLayer>
    </PageFactoryProvider>
  );
};

// SceneContentWithNavigation: thin wrapper to render a scene and navigate to the next scene when it completes
const SceneContentWithNavigation = React.memo(function SceneContentWithNavigation({ scene }: { scene: Scene }) {
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
      // onComplete={handleComplete} // callback the scene triggers when it's done (e.g., after a button pressed)
    />
  );
});

// Default export so the router or parent can render this screen
// (kept simple for easy wiring during the demo)
export default StoryModeScrollV2;