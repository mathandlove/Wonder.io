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

    const filteredRanges = ranges.filter(range => range.caption); // Only show ranges with captions
    console.log('[CAPTION] Found caption ranges:', filteredRanges);
    return filteredRanges;
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
        const shouldShow = Math.round(index) === range.secondSceneIndex;
        console.log('[CAPTION] Index:', index, 'Rounded:', Math.round(index), 'Target:', range.secondSceneIndex, 'Should show:', shouldShow);
        if (shouldShow) {
          // Second image scene - caption visible
          console.log('[CAPTION] Showing caption at index', index, 'for range', range.secondSceneIndex, range.caption);
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
              bottom: 0,
              left: 0,
              right: 0,
              width: '100%',
              height: '35vh',
              overflow: 'visible',
              transform,
              opacity,
              transition: 'transform 0.6s ease-out, opacity 0.6s ease-out'
            }}
          >
            {/* Cardboard edge background with shadow */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '35vh',
                backgroundImage: "url('/VisualAssets/constructionEdge.png')",
                backgroundSize: '100% auto',
                backgroundPosition: 'top',
                backgroundRepeat: 'no-repeat',
                filter: 'drop-shadow(0 -8px 16px rgba(0, 0, 0, 0.3)) drop-shadow(0 -4px 8px rgba(0, 0, 0, 0.2))'
              }}
            />

            {/* Left-justified text without background */}
            <div
              style={{
                padding: '24px 36px',
                position: 'absolute',
                bottom: '10px',
                left: '30px',
                width: 'calc(100vw - 60px)',
                maxWidth: '80vw',
                textAlign: 'left',
                fontSize: 'calc(1.4rem + 10px)',
                fontWeight: 'bold',
                color: 'white',
                lineHeight: '1.25',
                letterSpacing: '0.02em',
                zIndex: 10,
                fontFamily: "'Nunito', sans-serif",
                boxSizing: 'border-box'
              }}
            >
              {range.caption}
            </div>
          </div>
        );
      })}
    </div>
  );
};