import React from 'react';
import type { Scene } from '../types/scene';

interface CaptionComponentProps {
  scenes: Scene[];
  index: number;
}

export const CaptionComponent: React.FC<CaptionComponentProps> = ({ scenes, index }) => {
  // Find image ranges and their captions
  const captionRanges = React.useMemo(() => {
    const ranges: Array<{
      startIndex: number;
      endIndex: number;
      caption: string | undefined;
      secondSceneIndex: number;
    }> = [];

    let currentImage: string | null = null;
    let rangeStart = -1;
    let firstSceneCaption: string | undefined = undefined;

    scenes.forEach((scene, i) => {
      if (scene.type === 'image') {
        if (scene.image !== currentImage) {
          // Finish previous range if exists
          if (currentImage && rangeStart !== -1) {
            ranges.push({
              startIndex: rangeStart,
              endIndex: i - 1,
              caption: firstSceneCaption,
              secondSceneIndex: rangeStart + 1 // Caption appears on second scene
            });
          }
          // Start new range
          currentImage = scene.image;
          rangeStart = i;
          firstSceneCaption = scene.caption; // Capture caption from first scene
        }
        // Continue current range (same image)
      } else {
        // Non-image scene, finish current range if exists
        if (currentImage && rangeStart !== -1) {
          ranges.push({
            startIndex: rangeStart,
            endIndex: i - 1,
            caption: firstSceneCaption,
            secondSceneIndex: rangeStart + 1
          });
          currentImage = null;
          rangeStart = -1;
          firstSceneCaption = undefined;
        }
      }
    });

    // Finish final range if exists
    if (currentImage && rangeStart !== -1) {
      ranges.push({
        startIndex: rangeStart,
        endIndex: scenes.length - 1,
        caption: firstSceneCaption,
        secondSceneIndex: rangeStart + 1
      });
    }

    return ranges.filter(range => range.caption); // Only show ranges with captions
  }, [scenes]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 50, // Above image content and other elements
      pointerEvents: 'none'
    }}>
      {captionRanges.map((range) => {
        const tolerance = 0.1;
        let transform: string;
        let opacity: number;

        // Show caption only on the second scene of each image pair
        if (Math.round(index) === range.secondSceneIndex) {
          // Second image scene - caption visible
          transform = 'translateY(0)';
          opacity = 1;
        } else {
          // Any other scene - caption hidden
          transform = 'translateY(100vh)';
          opacity = 0;
        }

        return (
          <div
            key={`caption-${range.startIndex}-${range.endIndex}`}
            style={{
              position: 'absolute',
              bottom: '20vh',
              left: '50%',
              transform: `translateX(-50%) ${transform}`,
              opacity,
              transition: 'transform 0.6s ease-out, opacity 0.6s ease-out',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '20px 40px',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '500',
              textAlign: 'center',
              maxWidth: '80vw',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            {range.caption}
          </div>
        );
      })}
    </div>
  );
};