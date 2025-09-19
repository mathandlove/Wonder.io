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
    const ranges: typeof backgroundRanges = [];

    if (activeRangeIndex >= 0) {
      const activeRange = backgroundRanges[activeRangeIndex];

      // Always render the current active range
      ranges.push(activeRange);

      // Render the previous range if we're just past a transition (for smooth exit)
      const prevRangeIndex = activeRangeIndex - 1;
      if (prevRangeIndex >= 0) {
        const prevRange = backgroundRanges[prevRangeIndex];
        // Keep previous range visible during transition (up to 1 scene past its end)
        if (scrollOffset <= prevRange.endIndex + 1.5) {
          ranges.unshift(prevRange); // Add to beginning so it renders behind
        }
      }

      // Render the next range if we're approaching a transition
      const nextRangeIndex = activeRangeIndex + 1;
      if (nextRangeIndex < backgroundRanges.length &&
          scrollOffset > activeRange.endIndex - 0.5) {
        ranges.push(backgroundRanges[nextRangeIndex]);
      }
    }

    return ranges;
  }, [backgroundRanges, activeRangeIndex, scrollOffset]);

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

        return (
          <div
            key={`bg-range-${globalRangeIndex}`}
            className="story-background-image"
            style={{
              backgroundImage,
              transform,
              transition: 'transform 0.6s ease-out',
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