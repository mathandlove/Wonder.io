import React from 'react';

interface ImageRange {
  startIndex: number;
  endIndex: number;
  image: string;
}

interface ImageLayerProps {
  storyContent: any[];
  scrollOffset: number;
}

const ImageLayer: React.FC<ImageLayerProps> = ({ storyContent, scrollOffset }) => {
  // Build a list of image ranges (similar to background ranges)
  const imageRanges: ImageRange[] = [];
  
  storyContent.forEach((content, index) => {
    if (content.type === 'image') {
      // Check if next scene is image-text with same image
      const nextContent = storyContent[index + 1];
      if (nextContent && nextContent.type === 'image-text' && nextContent.image === content.image) {
        // Image spans both scenes
        imageRanges.push({
          startIndex: index,
          endIndex: index + 1,
          image: content.image
        });
      } else {
        // Image only for this scene
        imageRanges.push({
          startIndex: index,
          endIndex: index,
          image: content.image
        });
      }
    }
  });
  
  return (
    <div className="story-image-layer">
      {imageRanges.map((range, rangeIndex) => {
        // Calculate image position (same logic as backgrounds)
        let transform = 'translateY(0)';
        
        if (scrollOffset < range.startIndex) {
          // Image is waiting below (not reached yet)
          transform = `translateY(${(range.startIndex - scrollOffset) * 100}vh)`;
        } else if (scrollOffset > range.endIndex) {
          // Image has scrolled up and away (starts scrolling immediately after endIndex)
          transform = `translateY(${(range.endIndex - scrollOffset) * 100}vh)`;
        } else {
          // Image is visible and fixed in place
          transform = 'translateY(0)';
        }
        
        return (
          <div
            key={`img-range-${rangeIndex}`}
            className="story-fixed-image-container"
            style={{
              transform,
              transition: 'transform 0.6s ease-out',
              width: '100%',
              height: '100vh',
              position: 'absolute',
              top: 0,
              left: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={`/stories/gingerbread.bundle/images/story/${range.image}`}
              alt="Story Image"
              className="story-fixed-image"
              style={{
                width: '100%',
                height: '100vh',
                objectFit: 'contain'
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes('gingerbread.bundle')) {
                  target.src = `/assets.core/images/story/${range.image}`;
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ImageLayer;