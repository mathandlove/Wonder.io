/**
 * BackgroundOrchestrator - Hybrid background system that combines range-based logic
 * from the original main branch with optimized rendering
 */
import React, { useMemo } from 'react';
import { useScrollOffset } from '../hooks/useScrollOffset';
import { buildBackgroundRanges } from './buildBackgroundRanges';
import { resolveBackgroundUrl } from './resolveBackgroundUrl';
import { translateForRange } from './positionBackground';
import type { SceneContent } from '../types/background';

interface BackgroundOrchestratorProps {
  storyId?: string;
  storyContent: SceneContent[];
}

export function BackgroundOrchestrator({ storyId, storyContent }: BackgroundOrchestratorProps) {
  // Build background ranges using the original main branch logic
  const backgroundRanges = useMemo(() => buildBackgroundRanges(storyContent), [storyContent]);

  // Get current scroll offset (float in scene units)
  const dummyRef = React.useRef<HTMLDivElement>(null);
  const { offset: scrollOffset } = useScrollOffset(dummyRef);

  // Find the active range and mount only [active-1, active, active+1] ranges
  const activeRangeIndex = useMemo(() => {
    const foundIndex = backgroundRanges.findIndex(range =>
      scrollOffset >= range.startIndex && scrollOffset <= range.endIndex + 1
    );
    return foundIndex;
  }, [backgroundRanges, scrollOffset]);

  const rangesToRender = useMemo(() => {
    // Only render current range and the immediately next one if we're near the transition
    const ranges: typeof backgroundRanges = [];

    if (activeRangeIndex >= 0) {
      // Always render the current active range
      ranges.push(backgroundRanges[activeRangeIndex]);

      // Only render the next range if we're within 0.5 scenes of the transition
      const activeRange = backgroundRanges[activeRangeIndex];
      const nextRangeIndex = activeRangeIndex + 1;

      if (nextRangeIndex < backgroundRanges.length &&
          scrollOffset > activeRange.endIndex - 0.5) {
        ranges.push(backgroundRanges[nextRangeIndex]);
      }
    }

    return ranges;
  }, [backgroundRanges, activeRangeIndex, scrollOffset]);

  // Debug when reaching scene 7+ (square.png territory)
  if (scrollOffset >= 6.5) {
    console.log(`📍 SCENE 7+ DEBUG: scrollOffset=${scrollOffset.toFixed(3)}, activeRangeIndex=${activeRangeIndex}`);
    console.log(`   Available ranges:`, backgroundRanges.map(r => `${r.startIndex}-${r.endIndex}(${r.background})`));
    console.log(`   Rendering ranges:`, rangesToRender.map(r => `${r.startIndex}-${r.endIndex}(${r.background})`));
  }

  return (
    <div className="story-background-layer" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -10
    }}>
      {rangesToRender.map((range) => {
        // Use the actual range index from the backgroundRanges array
        const globalRangeIndex = backgroundRanges.indexOf(range);
        const transform = translateForRange(range, scrollOffset);
        const backgroundImage = resolveBackgroundUrl(range.background, range.isImage, storyId);

        // Debug square.png specifically (scene 7)
        if (range.background.includes('square.png')) {
          console.log(`🔍 SQUARE.PNG DEBUG:`);
          console.log(`   Range: ${range.startIndex}-${range.endIndex}`);
          console.log(`   ScrollOffset: ${scrollOffset.toFixed(3)}`);
          console.log(`   Transform: ${transform}`);
          console.log(`   BackgroundImage: ${backgroundImage}`);
          console.log(`   ActiveRangeIndex: ${activeRangeIndex}, GlobalRangeIndex: ${globalRangeIndex}`);
          console.log(`   Is being rendered: ${rangesToRender.includes(range)}`);
        }

        return (
          <div
            key={`bg-range-${globalRangeIndex}`}
            className="story-background-image"
            style={{
              backgroundImage,
              transform,
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            data-debug={`bg-range-${range.startIndex}-${range.endIndex}-${range.background}`}
          />
        );
      })}
    </div>
  );
}