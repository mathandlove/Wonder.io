/**
 * Main story mode component that renders a story as scrollable scenes.
 * Each scene gets its own 100vh section with snap-scroll behavior.
 */
import React, { useMemo, useState } from "react";
import { useStory } from "./hooks/useStory";
import { SnapLayer, SnapSlot, useSnapApi } from "./components/SnapLayer";
import { FlowLayout } from "./components/FlowLayout";
import { SceneRenderer } from "./components/SceneRenderer";
import type { Scene } from "./types/scene";

const STORY_URL = "/stories/gingerbread.bundle/story.json";

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100vh", width: "100vw", display: "grid", placeItems: "center" }}>
      <h2>{children}</h2>
    </div>
  );
}

const StoryModeScrollV2: React.FC = () => {
  const { story, loading, error } = useStory(STORY_URL);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Move useMemo BEFORE any conditional returns to satisfy Rules of Hooks
  const scenes = useMemo(() => story?.scenes || [], [story?.scenes]);

  if (loading) {
    return <FullScreen>Loading story…</FullScreen>;
  }

  if (error || !story || scenes.length === 0) {
    return (
      <FullScreen>
        {error ? `Problem loading story: ${error.message}` : "No story content found"}
      </FullScreen>
    );
  }

  return (
    <SnapLayer
      initialIndex={currentIndex}
      onSnapChange={setCurrentIndex}
    >
      {scenes.map((scene: Scene, i: number) => (
        <SnapSlot key={`${scene.type}-${i}`} index={i}>
          <FlowLayout keyId={`${scene.type}-${i}`}>
            <SceneContentWithNavigation scene={scene} sceneIndex={i} totalScenes={scenes.length} />
          </FlowLayout>
        </SnapSlot>
      ))}
    </SnapLayer>
  );
};

const SceneContentWithNavigation = React.memo(function SceneContentWithNavigation({ scene, sceneIndex, totalScenes }: { scene: Scene; sceneIndex: number; totalScenes: number }) {
  const snapApi = useSnapApi();

  const handleComplete = React.useCallback(() => {
    const nextIndex = Math.min(sceneIndex + 1, totalScenes - 1);
    snapApi.scrollTo(nextIndex, { behavior: "smooth" });
  }, [sceneIndex, totalScenes, snapApi]);

  return (
    <SceneRenderer
      scene={scene}
      onComplete={handleComplete}
    />
  );
});

export default StoryModeScrollV2;