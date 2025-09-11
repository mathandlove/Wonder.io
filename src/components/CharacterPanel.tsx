import React, { forwardRef } from 'react';

interface CharacterPanelProps {
  side: 'left' | 'right';
  panelState: 'hidden' | 'visible' | 'exiting';
  characterFullyExited: boolean;
  characterAnimating: boolean;
  characterProgress: number;
  bounceComplete: boolean;
  currentCharacter: string | null;
  currentScene: any;
  currentItem: number;
  version: string;
  onBounceComplete: () => void;
}

const CharacterPanel = forwardRef<HTMLDivElement, CharacterPanelProps>(({
  side,
  panelState,
  characterFullyExited,
  characterAnimating,
  characterProgress,
  bounceComplete,
  currentCharacter,
  currentScene,
  currentItem,
  version,
  onBounceComplete
}, ref) => {
  // Don't render if hidden and fully exited
  if (panelState === 'hidden' && characterFullyExited) {
    return null;
  }

  const getCharacterInnerClass = () => {
    // Apply entrance bounce only when character just finished animating in (not during speech)
    if (!characterAnimating && characterProgress >= 100 && !bounceComplete) {
      return side === 'left' ? 'story-bounce-arrival' : 'story-bounce-arrival-right';
    }
    
    // Apply shake animation only when this character is speaking and entrance is complete
    if (currentScene && 
        currentScene.type === 'character' && 
        currentScene.side === side && 
        panelState === 'visible' && 
        !characterAnimating && 
        characterProgress >= 100 &&
        bounceComplete) {
      return side === 'left' ? 'story-character-speaking' : 'story-character-speaking-right';
    }
    
    return '';
  };

  const getTransform = () => {
    if (panelState === 'visible') {
      if (characterProgress < 100) {
        if (side === 'left') {
          return `translateY(${100 - characterProgress}vh) translateX(${-100 + characterProgress}%) rotate(${-45 + (characterProgress * 0.45)}deg)`;
        } else {
          return `translateY(${100 - characterProgress}vh) translateX(${100 - characterProgress}%) rotate(${45 - (characterProgress * 0.45)}deg)`;
        }
      } else {
        return 'translateY(0vh) translateX(0%) rotate(0deg)';
      }
    }
    return undefined;
  };

  const handleAnimationEnd = (e: React.AnimationEvent) => {
    if (e.animationName === 'bounceArrival' || e.animationName === 'bounceArrivalRight') {
      onBounceComplete();
    }
  };

  return (
    <div 
      ref={ref} 
      className={`story-character-panel story-character-${side} story-character-${panelState} ${characterAnimating ? 'animating' : ''}`}
    >
      <div className="story-character-content">
        <div 
          className="story-character-cardboard"
          style={{
            transform: getTransform(),
            transition: characterProgress >= 100 ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <div 
            className={`story-character-inner ${getCharacterInnerClass()}`}
            onAnimationEnd={handleAnimationEnd}
          >
            <div className="story-wooden-dowel"></div>
            {currentCharacter && (
              <img 
                src={`/stories/gingerbread.bundle/images/characters/${currentCharacter}.sticker-cardboard-3d.webp?${version}`}
                alt={`${currentCharacter} Character`}
                className="story-character-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes('gingerbread.bundle')) {
                    target.src = `/assets.core/images/characters/${currentCharacter}.sticker-cardboard-3d.webp?${version}`;
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CharacterPanel.displayName = 'CharacterPanel';

export default CharacterPanel;