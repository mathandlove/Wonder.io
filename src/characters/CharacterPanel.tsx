import React, { useState } from 'react';
import type { PanelSide } from './types';
import './CharacterPanel.css';

interface CharacterPanelProps {
  side: PanelSide;
  visible: boolean;
  characterName: string | null;
  previousCharacter?: string | null;
  nextCharacter?: string | null;
  animationState?: string; // "entering", "speaking", "idle"
  aboutToSwap?: boolean; // boolean modifier flag
  scrollDirection?: 'forward' | 'backward';
  pose?: string | null;
  storyId: string;
  animNonce?: number; // Forces animation restart when incremented
}

type Phase = 'hidden' | 'entering' | 'idle' | 'speaking';

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  side,
  visible,
  characterName,
  previousCharacter,
  nextCharacter,
  animationState = 'idle',
  aboutToSwap = false,
  scrollDirection = 'forward',
  pose,
  storyId,
  animNonce = 0
}) => {
  const [version] = useState(`v${Date.now()}`);

  // Pure renderer - no state management, just map animationState to CSS classes
  const getCurrentPhase = (): Phase => {
    if (!visible || !characterName) return 'hidden';

    // Forward scroll: trigger entering animation on 'entering' state
    if (scrollDirection === 'forward' && animationState === 'entering') {
      return 'entering';
    }

    // Backward scroll: trigger entering animation on 'aboutToSwap'
    if (scrollDirection === 'backward' && aboutToSwap) {
      return 'entering';
    }

    switch (animationState) {
      case 'speaking':
        return 'speaking';
      case 'idle':
      case 'entering': // Treat entering as idle when scrolling backward without aboutToSwap
      default:
        return 'idle';
    }
  };

  const phase = getCurrentPhase();


  // Panel container always renders as independent layer


  // CSS class for current phase and side
  const getCardClasses = () => {
    const baseClass = 'story-character-cardboard';
    const phaseClass =
      phase === 'entering' ? `entering-${side}` :
      'idle';
    const swapClass = aboutToSwap ? 'about-to-swap' : '';
    return `${baseClass} ${phaseClass} ${swapClass}`.trim();
  };

  const cardStyle = {
    opacity: characterName === 'NOCHARACTER' ? 0.5 : 1, // 50% alpha for NOCHARACTER debugging
    // Debug: Green outline for NOCHARACTER
    outline: characterName === 'NOCHARACTER' ? '2px solid lime' : 'none',
  };

  // Get speaking animation class for character inner div
  const getInnerClasses = () => {
    if (phase === 'speaking') {
      return side === 'left' ? 'story-character-speaking' : 'story-character-speaking-right';
    }
    return '';
  };

  // Character display logic with animation-based character swapping
  const getDisplayCharacter = () => {
    if (phase === 'entering') {
      if (scrollDirection === 'forward') {
        // Forward scrolling: start with previous character, switch to current halfway through
        // CSS animation will handle the switch at the 50% mark (hidden phase)
        return previousCharacter || characterName;
      } else if (scrollDirection === 'backward' && aboutToSwap) {
        // Backward scrolling: start with next character, switch to current halfway through
        return nextCharacter || characterName;
      }
    }
    return characterName;
  };

  // Get the character that should be displayed in the second half of the animation
  const getSecondHalfCharacter = () => {
    if (phase === 'entering') {
      return characterName; // Always switch to current character in second half
    }
    return characterName;
  };

  const getDisplayImage = (char: string | null) => {
    if (!char) return '';
    // Debug: Use farmer.png for NOCHARACTER
    const debugChar = char === 'NOCHARACTER' ? 'farmer' : char;
    return `/stories/${storyId}.bundle/images/characters/${debugChar}${pose ? `.${pose}` : ''}.sticker-cardboard-3d.webp?${version}`;
  };

  const getFallbackImage = (char: string | null) => {
    if (!char) return '';
    // Debug: Use farmer.png for NOCHARACTER
    const debugChar = char === 'NOCHARACTER' ? 'farmer' : char;
    return `/assets.core/images/characters/${debugChar}${pose ? `.${pose}` : ''}.sticker-cardboard-3d.webp?${version}`;
  };


  const displayCharacter = getDisplayCharacter();

  return (
    <div className={`story-character-panel story-character-${side}`}>
      {displayCharacter ? (
        <div className="story-character-content">
          {/* Debug overlay showing animation state */}
          <div style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 100,
            whiteSpace: 'nowrap'
          }}>
            {animationState || 'none'} / {phase}
          </div>
          <div
            key={`${characterName}-${animNonce}`} // Key changes to force re-render and restart animation
            className={getCardClasses()}
            style={cardStyle}
          >
            <div className={`story-character-inner ${getInnerClasses()}`}>
              <div className="story-wooden-dowel"></div>

              {/* First half character (visible during exit phase) */}
              {phase === 'entering' && (
                <img
                  src={getDisplayImage(displayCharacter)}
                  alt={`${displayCharacter} Character`}
                  className="story-character-image story-character-first-half"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.includes(`${storyId}.bundle`)) {
                      target.src = getFallbackImage(displayCharacter);
                    }
                  }}
                />
              )}

              {/* Second half character (visible during enter phase) */}
              <img
                src={getDisplayImage(phase === 'entering' ? getSecondHalfCharacter() : displayCharacter)}
                alt={`${phase === 'entering' ? getSecondHalfCharacter() : displayCharacter} Character`}
                className={`story-character-image ${phase === 'entering' ? 'story-character-second-half' : ''}`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const char = phase === 'entering' ? getSecondHalfCharacter() : displayCharacter;
                  if (target.src.includes(`${storyId}.bundle`)) {
                    target.src = getFallbackImage(char);
                  }
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};