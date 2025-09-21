import React, { useState, useRef, useEffect } from 'react';
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
  onEntranceComplete?: () => void; // Callback when entrance animation completes
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
  animNonce = 0,
  onEntranceComplete
}) => {
  const [version] = useState(`v${Date.now()}`);

  // Pure renderer - no state management, just map animationState to CSS classes
  const getCurrentPhase = (): Phase => {
    if (!visible || !characterName) return 'hidden';

    // Check for speaking state first (takes priority)
    if (animationState === 'speaking') {
      return 'speaking';
    }

    // Backward scroll: special handling
    if (scrollDirection === 'backward') {
      if (aboutToSwap) {
        return 'entering';
      }
      // When scrolling backward with entering state but no swap,
      // the character is already present and should be speaking if they were entering
      if (animationState === 'entering') {
        // Character was "entering" but since we're going backward,
        // they're already there and should be speaking
        return 'speaking';
      }
    }

    // Forward scroll: use animationState normally
    if (animationState === 'entering') {
      return 'entering';
    }

    // Default to idle
    return 'idle';
  };

  const phase = getCurrentPhase();

  // Ref for animation event detection
  const panelRef = useRef<HTMLDivElement>(null);

  // Animation event detection
  useEffect(() => {
    const panelElement = panelRef.current;
    if (!panelElement) return;

    const handleAnimationEnd = (event: AnimationEvent) => {
      // Trigger callback for entrance animations that need to complete
      if (event.animationName.includes('character-entrance-settle') ||
          event.animationName.includes('character-bounce') ||
          event.animationName.includes('character-wiggle')) {
        // Call the entrance completion callback
        onEntranceComplete?.();
      }
    };

    const handleAnimationStart = (event: AnimationEvent) => {
      // For speak animations, trigger immediately
      if (event.animationName.includes('character-speak')) {
        // Call the entrance completion callback since character is ready
        onEntranceComplete?.();
      }
      // For shake animations, trigger immediately without timeout
      if (event.animationName.includes('character-shake')) {
        // Call the entrance completion callback immediately
        onEntranceComplete?.();
      }
    };

    panelElement.addEventListener('animationend', handleAnimationEnd);
    panelElement.addEventListener('animationstart', handleAnimationStart);

    return () => {
      panelElement.removeEventListener('animationend', handleAnimationEnd);
      panelElement.removeEventListener('animationstart', handleAnimationStart);
    };
  }, [side, characterName, onEntranceComplete]); // Only re-setup when essential props change

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
      ref={panelRef}
      key={`panel-${characterName}-${animNonce}`}
      className={`story-character-panel story-character-${side} ${phase === 'entering' ? 'entering' : ''}`}>

      {displayCharacter ? (
        <div className="story-character-content">
          {/* Debug text above character - DISABLED */}
          {false && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#0ff',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace',
              whiteSpace: 'pre',
              zIndex: 1000,
              pointerEvents: 'none'
            }}>
              {`State: ${animationState}\nPhase: ${phase}\nChar: ${characterName}\nSwap: ${aboutToSwap}\nDir: ${scrollDirection}\nTrigger: ${
                scrollDirection === 'backward'
                  ? (aboutToSwap ? 'swap→entering' : 'none (backward)')
                  : (animationState === 'entering' ? 'entering' : 'none')
              }`}
            </div>
          )}
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