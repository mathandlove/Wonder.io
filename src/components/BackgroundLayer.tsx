import React from 'react';

interface BackgroundRange {
  startIndex: number;
  endIndex: number;
  background: string;
  isImage?: boolean;
}

interface BackgroundLayerProps {
  storyContent: any[];
  scrollOffset: number;
}

const BackgroundLayer: React.FC<BackgroundLayerProps> = ({ storyContent, scrollOffset }) => {
  // Build a list of background changes
  const backgroundRanges: BackgroundRange[] = [];
  let currentBg: string | null = null;
  let rangeStart = 0;
  
  storyContent.forEach((content, index) => {
    // Check if this scene introduces a new background
    let newBg: string | null = null;
    
    if (content.type === 'image') {
      newBg = 'comicBackground';
    } else if (content.type === 'image-text') {
      // Don't change background for image-text, it continues from previous image
      return;
    } else if ((content.type === 'title' || content.type === 'title2' || content.type === 'full' || content.type === 'character') && 
               content.background && 
               (!content.flowSequence || content.isFirstInFlow)) {
      newBg = content.background;
    }
    
    // If background changes, save the previous range and start a new one
    if (newBg && newBg !== currentBg) {
      if (currentBg) {
        backgroundRanges.push({
          startIndex: rangeStart,
          endIndex: index - 1,
          background: currentBg,
          isImage: currentBg === 'comicBackground'
        });
      }
      currentBg = newBg;
      rangeStart = index;
    }
  });
  
  // Add the final range
  if (currentBg) {
    backgroundRanges.push({
      startIndex: rangeStart,
      endIndex: storyContent.length - 1,
      background: currentBg,
      isImage: currentBg === 'comicBackground'
    });
  }
  
  return (
    <div className="story-background-layer">
      {backgroundRanges.map((range, rangeIndex) => {
        // Calculate the background position based on scroll
        let transform = 'translateY(0)';
        
        if (scrollOffset < range.startIndex) {
          // Background is waiting below (not reached yet)
          transform = `translateY(${(range.startIndex - scrollOffset) * 100}vh)`;
        } else if (scrollOffset > range.endIndex + 1) {
          // Background has scrolled up and away
          transform = `translateY(${(range.endIndex + 1 - scrollOffset) * 100}vh)`;
        } else {
          // Background is visible and fixed in place
          transform = 'translateY(0)';
        }
        
        return (
          <div 
            key={`bg-range-${rangeIndex}`}
            className="story-background-image"
            style={{
              backgroundImage: range.isImage ? 
                `url('/VisualAssets/comicBackground.png')` :
                `url('/stories/gingerbread.bundle/images/backgrounds/${range.background}'), url('/assets.core/images/backgrounds/${range.background}')`,
              transform,
              transition: 'transform 0.6s ease-out',
              width: '100%',
              height: '100vh',
              position: 'absolute',
              top: 0,
              left: 0
            }}
            data-debug={`bg-range-${range.startIndex}-${range.endIndex}-${range.background}`}
          />
        );
      })}
    </div>
  );
};

export default BackgroundLayer;