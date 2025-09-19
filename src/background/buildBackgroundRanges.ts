/**
 * Build background ranges from story content using the original main branch rules
 */
import type { SceneContent, BackgroundRange } from '../types/background';

export function buildBackgroundRanges(storyContent: SceneContent[]): BackgroundRange[] {
  const backgroundRanges: BackgroundRange[] = [];
  let currentBg: string | null = null;
  let rangeStart = 0;

  // Log scene processing for debugging
  console.log(`[BUILD RANGES] Processing ${storyContent.length} scenes`);

  storyContent.forEach((content, index) => {
    // Check if this scene introduces a new background
    let newBg: string | null = null;

    if (content.type === 'image') {
      newBg = 'comicBackground';
    } else if (content.type === 'image-text') {
      // Don't change background for image-text, it continues from previous image
      return;
    } else if ((content.type === 'title' ||
               content.type === 'title2' ||
               content.type === 'full' ||
               content.type === 'character') &&
               content.background &&
               (!content.flowSequence || content.isFirstInFlow)) {
      newBg = content.background;
    }

    // If background changes, save the previous range and start a new one
    if (newBg && newBg !== currentBg) {
      if (currentBg) {
        const range = {
          startIndex: rangeStart,
          endIndex: index - 1,
          background: currentBg,
          isImage: currentBg === 'comicBackground'
        };
        backgroundRanges.push(range);
      }
      currentBg = newBg;
      rangeStart = index;
    }
  });

  // Add the final range
  if (currentBg) {
    const finalRange = {
      startIndex: rangeStart,
      endIndex: storyContent.length - 1,
      background: currentBg,
      isImage: currentBg === 'comicBackground'
    };
    backgroundRanges.push(finalRange);
  }

  return backgroundRanges;
}