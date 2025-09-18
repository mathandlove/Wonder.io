// Beginner-friendly comments added to explain each major part of this file.
/**
 * Main story mode component that renders a story as scrollable scenes.
 * Each scene gets its own 100vh section with snap-scroll behavior.
 */
// React imports and custom hooks/components used by this screen
import React, { useMemo, useEffect } from "react";
import { LayoutGroup } from "framer-motion";
import { useStory } from "./hooks/useStory";
import { SnapLayer, SnapSlot } from "./components/SnapLayer";
import { FlowLayout } from "./components/FlowLayout";
import { SceneRenderer } from "./components/SceneRenderer";
import { useNavigation } from "./context/NavigationContext";
import type { Scene } from "./types/scene";

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
  const { setScenes, setCurrentIndex } = useNavigation();

  // Derive a stable array of scenes from the loaded story. useMemo avoids re-computing unless story.scenes changes
  // Move useMemo BEFORE any conditional returns to satisfy Rules of Hooks
  const scenes = useMemo(() => story?.scenes || [], [story?.scenes]);

  // Update navigation context when scenes change
  useEffect(() => {
    setScenes(scenes);
  }, [scenes, setScenes]);

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
    <LayoutGroup id="story-shared-layout">
      <SnapLayer // SnapLayer manages the scroll container and reports snap changes
        onSnapChange={(index) => {
          setCurrentIndex(index);
        }} // update our state when the user scrolls to a new snap
      >
        {scenes.map((scene: Scene, i: number) => ( // map each scene into a full-height snap slot
          <SnapSlot key={`${scene.type}-${i}`} index={i}> {/* one 100vh section that can snap into place */}
            <FlowLayout keyId={`${scene.type}-${i}`}> {/* handles consistent padding/centering for scene content */}
              <SceneContentWithNavigation scene={scene} /> {/* renders the scene and knows how to advance to the next one */}
            </FlowLayout>
          </SnapSlot>
        ))}
      </SnapLayer>
    </LayoutGroup>
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