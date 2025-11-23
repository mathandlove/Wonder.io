/**
 * Build background ranges from story content using the original main branch rules
 */
import type { SceneContent, BackgroundRange } from './types';

export function buildBackgroundRanges(storyContent: SceneContent[]): BackgroundRange[] {
  const backgroundRanges: BackgroundRange[] = [];
  let currentBg: string | null = null;
  let rangeStart = 0;

  // console.log('[buildBackgroundRanges] 🎨 Building ranges for', storyContent.length, 'scenes');
  // console.log('[buildBackgroundRanges] 📋 Scene types:', storyContent.map((s, i) => `${i}:${s.type}`).join(', '));

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
               content.type === 'character' ||
               content.type === 'text' ||
               content.type === 'success-dance' ||
               content.type === 'fail-dance') &&
               content.background &&
               (!content.flowSequence || content.isFirstInFlow)) {
      newBg = content.background;
      // console.log(`[buildBackgroundRanges] Scene ${index} (${content.type}): Setting newBg =`, newBg, {
    // flowSequence: content.flowSequence,
    // isFirstInFlow: content.isFirstInFlow,
    // background: content.background
    // });
    } else if (content.type === 'character' || content.type === 'success-dance' || content.type === 'fail-dance') {
      // Log scenes that were skipped due to flowSequence
      // console.log(`[buildBackgroundRanges] Scene ${index} (${content.type}): Skipped (flowSequence=${content.flowSequence}, isFirstInFlow=${content.isFirstInFlow}, background=${content.background})`);
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

  // console.log('[buildBackgroundRanges] ✅ Built', backgroundRanges.length, 'ranges:',
  //   backgroundRanges.map(r => `[${r.startIndex}-${r.endIndex}]: ${r.background}`).join(', '));

  return backgroundRanges;
}
