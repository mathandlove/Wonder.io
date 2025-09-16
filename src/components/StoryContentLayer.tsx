import React from 'react';
import TitleScene from './TitleScene';
import FullContent from './FullContent';
import CharacterScene from './CharacterScene';

interface StoryContentItem {
  type: string;
  title?: string;
  subtitle?: string;
  author?: string;
  lvl1?: string;
  lvl2?: string;
  lvl3?: string;
  text?: string;
  [key: string]: any;
}

interface StoryContentLayerProps {
  storyContent: StoryContentItem[];
  scrollOffset: number;
  currentItem: number;
  activeInput: { prompt: string; userInput: string } | null;
  onLeftBubblePosition?: (bottom: number) => void;
  sceneBubbleRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  goToItem: (index: number) => void;
  containerClass: string;
}

const StoryContentLayer: React.FC<StoryContentLayerProps> = ({
  storyContent,
  scrollOffset,
  currentItem,
  activeInput,
  onLeftBubblePosition,
  sceneBubbleRefs,
  itemRefs,
  goToItem,
  containerClass
}) => {
  const fullContainerClass = `story-content-layer ${containerClass}`;

  if (storyContent.length === 0) {
    return (
      <div className={fullContainerClass}>
        <div style={{ color: 'white', fontSize: '24px', textAlign: 'center', padding: '50px' }}>
          Loading story content...
        </div>
      </div>
    );
  }

  return (
    <div className={fullContainerClass}>
      {storyContent.map((content, index) => {
        // Calculate transform offset for this content item
        const contentTransform = `translateY(${(index - scrollOffset) * 100}vh)`;

        return (
          <div
            key={index}
            ref={el => itemRefs.current[index] = el}
            className={`story-item ${currentItem === index ? 'active' : ''} ${content.isWaiting ? 'story-waiting-item' : ''}`}
            style={{
              width: '100%',
              height: '100vh',
              position: 'absolute',
              top: 0,
              left: 0,
              transform: contentTransform,
              transition: 'transform 0.5s ease-out', // Slightly faster than background for parallax
              pointerEvents: 'auto' // Allow interactions with content
            }}
          >
            {/* Show content based on type and animation state */}
            {(content.type === 'title' || content.type === 'title2') && (
              <TitleScene
                text={content.lvl1 && content.lvl2 ?
                  { lvl1: content.lvl1, lvl2: content.lvl2, ...(content.lvl3 && { lvl3: content.lvl3 }) } :
                  { lvl1: content.title || '', lvl2: content.subtitle || '' }
                }
                author={content.author}
                onComplete={() => {
                  // Auto-advance to next panel when title animation completes
                  if (index < storyContent.length - 1) {
                    goToItem(index + 1);
                  }
                }}
              />
            )}

            {content.type === 'full' && (
              <FullContent title={content.title || ''} text={content.text || ''} />
            )}

            {/* Images are now rendered in the image layer, not here */}
            {(content.type === 'image' || content.type === 'image-text') && (
              <div style={{ width: '100%', height: '100vh' }} />
            )}

            {content.type === 'character' && (
              <CharacterScene
                content={content}
                index={index}
                currentItem={currentItem}
                activeInput={activeInput}
                onLeftBubblePosition={onLeftBubblePosition}
                sceneBubbleRefs={sceneBubbleRefs}
                itemRefs={itemRefs}
              />
            )}

            {content.type === 'waiting' && (
              <div className="story-waiting-scene">
                {/* Invisible waiting scene - bubble is handled by independent layer */}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StoryContentLayer;