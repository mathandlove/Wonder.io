/**
 * ImageSceneOrchestrator - Renders image scenes outside the scroll flow with background-like transforms
 * Manages positioning and visibility of image scenes based on scroll position
 */
import React from "react";
import { SceneRenderer } from "@core/scenes/SceneRenderer";
import type { Scene } from "@core/types/scene";

interface ImageSceneOrchestratorProps {
  scenes: Scene[];
  index: number;
}

export const ImageSceneOrchestrator = React.memo(function ImageSceneOrchestrator({
  scenes,
  index
}: ImageSceneOrchestratorProps) {
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