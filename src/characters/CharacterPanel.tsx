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

    // Always show entering animation when animationState is 'entering'
    // This ensures both characters animate during swaps
    if (animationState === 'entering') {
      return 'entering';
    }

    // Backward scroll: also trigger entering animation on 'aboutToSwap'
    if (scrollDirection === 'backward' && aboutToSwap) {
      return 'entering';
    }

    switch (animationState) {
      case 'speaking':
        return 'speaking';
      case 'idle':
      default:
        return 'idle';
    }
  };

  const phase = getCurrentPhase();


  // Panel container always renders as independent layer


  // CSS class for current phase and side
  const getCardClasses = () => {
    const baseClass = 'story-character-cardboard';
    const phaseClass = phase === 'entering' ? `entering-${side}` : 'idle';
    const swapClass = aboutToSwap ? 'about-to-swap' : '';
    return `${baseClass} ${phaseClass} ${swapClass}`.trim();
  };

  const cardStyle = {};

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
    if (!char || char === 'NOCHARACTER') return '';
    return `/stories/${storyId}.bundle/images/characters/${char}${pose ? `.${pose}` : ''}.sticker-cardboard-3d.webp?${version}`;
  };

  const getFallbackImage = (char: string | null) => {
    if (!char || char === 'NOCHARACTER') return '';
    return `/assets.core/images/characters/${char}${pose ? `.${pose}` : ''}.sticker-cardboard-3d.webp?${version}`;
  };


  const displayCharacter = getDisplayCharacter();

  return (
    <div
      key={`panel-${characterName}-${animNonce}`}
      className={`story-character-panel story-character-${side} ${phase === 'entering' ? 'entering' : ''}`}>
      {/* Debug text */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 1000,
        whiteSpace: 'nowrap'
      }}>
        {side.toUpperCase()}: {phase} | {animationState} | {aboutToSwap ? 'SWAP' : 'NO-SWAP'} | {scrollDirection?.toUpperCase()} | {characterName}
      </div>

      {displayCharacter ? (
        <div className="story-character-content">
          <div
            key={`${characterName}-${animNonce}`} // Key changes to force re-render and restart animation
            className={getCardClasses()}
            style={cardStyle}
          >
            <div className={`story-character-inner ${getInnerClasses()}`}>
              {/* Dowel visibility logic */}
              {phase === 'entering' ? (
                <>
                  {/* First half dowel (hidden) */}
                  <div className="story-wooden-dowel" style={{
                    animation: 'first-half-visibility 1600ms ease-in-out forwards',
                    display: (scrollDirection === 'forward' && previousCharacter === 'NOCHARACTER') ||
                             (scrollDirection === 'backward' && nextCharacter === 'NOCHARACTER') ? 'none' : 'block'
                  }}></div>

                  {/* Second half dowel (visible) */}
                  {characterName !== 'NOCHARACTER' && (
                    <div className="story-wooden-dowel" style={{
                      animation: 'second-half-visibility 1600ms ease-in-out forwards'
                    }}></div>
                  )}
                </>
              ) : (
                /* Normal dowel for non-entering phases */
                characterName !== 'NOCHARACTER' && <div className="story-wooden-dowel"></div>
              )}

              {/* First half character (visible during exit phase) */}
              {phase === 'entering' && displayCharacter && displayCharacter !== 'NOCHARACTER' && (
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
              {((phase === 'entering' ? getSecondHalfCharacter() : displayCharacter) !== 'NOCHARACTER') && (
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
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};