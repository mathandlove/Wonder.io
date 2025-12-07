import React, { useRef, useEffect, useMemo } from 'react';
import type { PanelSide } from './types';
import './CharacterPanel.css';

interface CharacterPanelProps {
  side: PanelSide;
  visible: boolean;
  currentCharacter: string; // Can be 'NOCHARACTER' for empty panels
  previousCharacter?: string; // Can be 'NOCHARACTER' for previous empty panels
  storyId: string;
  transitionNonce?: string; // Unique ID per transition, used to force CSS animation restart
  onEntranceComplete?: () => void; // Callback when entrance animation completes
  onJiggleComplete?: () => void; // Callback when jiggle animation completes
  isSpeaking?: boolean; // true if this character is currently the speaker
  isJiggling?: boolean; // true if this character should play the jiggle dance animation
  assetVersion?: string; // Stable version string for cache busting (default: "1")
}

type Phase = 'idle' | 'entering' | 'speaking' | 'jiggling';

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  side,
  currentCharacter,
  previousCharacter,
  storyId,
  transitionNonce,
  onEntranceComplete,
  onJiggleComplete,
  isSpeaking = false,
  isJiggling = false,
  assetVersion = '1'
}) => {
  // Track which animation variant to use (alternate between 1 and 2 to force restart)
  const animationVariantRef = useRef<1 | 2>(1);
  const lastTransitionNonceRef = useRef<string | undefined>(undefined);

  // Ref for animation event detection - only need cardboard now
  const cardboardRef = useRef<HTMLDivElement>(null);


  // Single source of truth: compute phase and related state once
  const { phase, variant, hasCurrent, hasPrevious } = useMemo(() => {
    // Normalize character checks
    const hasCurrent = currentCharacter !== 'NOCHARACTER';
    const hasPrevious = previousCharacter !== 'NOCHARACTER';
    const isNewCharacter = currentCharacter !== previousCharacter;

    // Toggle variant only when we have a NEW transition nonce AND it's a character change
    const wasVariantToggled = transitionNonce && transitionNonce !== lastTransitionNonceRef.current;
    if (wasVariantToggled) {
      // Each node transition with a character change gets a new animation variant
      if (isNewCharacter) {
        animationVariantRef.current = animationVariantRef.current === 1 ? 2 : 1;
      }
      lastTransitionNonceRef.current = transitionNonce;
    }

    // Compute phase with priority
    let phase: Phase = 'idle';

    // Priority 1: Jiggling dance animation (celebration for correct answers)
    // Must be highest priority - success-dance scenes need jiggle even if character changes
    // (e.g., transitioning from clue-image scene which has no characters)
    if (isJiggling) {
      phase = 'jiggling';
    } else if (isNewCharacter) {
      // Priority 2: Entrance animations (character changed)
      // In the node-based system, every navigation is effectively a new scene
      phase = 'entering';
    } else if (isSpeaking) {
      // Priority 3: Speaking animations (only when NOT entering or jiggling)
      phase = 'speaking';
    }
    // else: idle (default)

    return {
      phase,
      variant: animationVariantRef.current,
      hasCurrent,
      hasPrevious
    };
  }, [currentCharacter, previousCharacter, isSpeaking, isJiggling, transitionNonce]);

  // No imperative class manipulation - animations are driven by data-attributes

  // Animation event detection - fire callbacks on specific keyframe completions
  useEffect(() => {
    const cardboardElement = cardboardRef.current;
    if (!cardboardElement) return;

    const handleAnimationEnd = (event: AnimationEvent) => {
      // Only fire callbacks for animations on this specific element (not bubbled from children)
      if (event.target !== cardboardElement) return;

      // Entrance animations (all variants, both sides)
      if (
        event.animationName === 'character-entrance-settle-left' ||
        event.animationName === 'character-entrance-settle-right' ||
        event.animationName === 'character-entrance-settle-left-2' ||
        event.animationName === 'character-entrance-settle-right-2'
      ) {
        onEntranceComplete?.();
        return;
      }

      // Jiggle animations (both sides)
      if (
        event.animationName === 'character-jiggle-left' ||
        event.animationName === 'character-jiggle-right'
      ) {
        onJiggleComplete?.();
        return;
      }
    };

    cardboardElement.addEventListener('animationend', handleAnimationEnd);

    return () => {
      cardboardElement.removeEventListener('animationend', handleAnimationEnd);
    };
  }, [onEntranceComplete, onJiggleComplete]); // Only re-setup when callbacks change

  // Character display logic - simplified with normalized checks
  const { firstHalfCharacter, secondHalfCharacter, shouldRenderFirst, shouldRenderSecond } = useMemo(() => {
    let result;
    if (phase === 'entering') {
      result = {
        firstHalfCharacter: previousCharacter || 'NOCHARACTER',
        secondHalfCharacter: currentCharacter,
        shouldRenderFirst: hasPrevious,
        shouldRenderSecond: hasCurrent
      };
    } else {
      // Outside entering, only render current character
      result = {
        firstHalfCharacter: 'NOCHARACTER',
        secondHalfCharacter: currentCharacter,
        shouldRenderFirst: false,
        shouldRenderSecond: hasCurrent
      };
    }

    return result;
  }, [phase, currentCharacter, previousCharacter, hasCurrent, hasPrevious]);

  // Asset URL builders with stable version
  const getDisplayImage = (char: string) => {
    if (char === 'NOCHARACTER') return '';
    return `/stories/${storyId}.bundle/images/characters/${char}.sticker-cardboard-3d.webp?v=${assetVersion}`;
  };

  const getFallbackImage = (char: string) => {
    if (char === 'NOCHARACTER') return '';
    // Fallback to the same bundle path (no separate assets.core)
    return `/stories/${storyId}.bundle/images/characters/${char}.sticker-cardboard-3d.webp?v=${assetVersion}`;
  };


  // Only render when there's content to show
  if (!hasCurrent && !shouldRenderFirst) {
    return null;
  }

  return (
    <div className={`story-character-panel story-character-${side}`}>
      <div className="story-character-content">
        <div
          ref={cardboardRef}
          className="story-character-cardboard"
          data-phase={phase}
          data-side={side}
          data-variant={variant}
          data-transition-nonce={transitionNonce || 'none'}
          data-character={currentCharacter}
        >
          {/* Dowel visibility logic */}
          {phase === 'entering' ? (
            <>
              {/* First half dowel (exits) - only visible if there was a previous character */}
              {hasPrevious && (
                <div
                  className="story-wooden-dowel"
                  style={{
                    animation: 'first-half-visibility 1600ms ease-in-out forwards'
                  }}
                />
              )}

              {/* Second half dowel (enters) - only visible if there is a current character */}
              {hasCurrent && (
                <div
                  className="story-wooden-dowel"
                  style={{
                    animation: 'second-half-visibility 1600ms ease-in-out forwards'
                  }}
                />
              )}
            </>
          ) : (
            /* Normal dowel for non-entering phases - explicitly visible */
            hasCurrent && (
              <div
                className="story-wooden-dowel"
                style={{
                  opacity: 1,
                  visibility: 'visible'
                }}
              />
            )
          )}

          {/* First half character (visible during exit phase of entrance) */}
          {shouldRenderFirst && (
            <img
              key={`first-${firstHalfCharacter}-${transitionNonce}`}
              src={getDisplayImage(firstHalfCharacter)}
              alt=""
              role="presentation"
              className="story-character-image story-character-first-half"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes(`${storyId}.bundle`)) {
                  target.src = getFallbackImage(firstHalfCharacter);
                }
              }}
            />
          )}

          {/* Second half character (visible during enter phase or always when not entering) */}
          {shouldRenderSecond && (
            <img
              key={`character-${secondHalfCharacter}`}
              src={getDisplayImage(secondHalfCharacter)}
              alt=""
              role="presentation"
              className={`story-character-image ${phase === 'entering' ? 'story-character-second-half' : ''}`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes(`${storyId}.bundle`)) {
                  target.src = getFallbackImage(secondHalfCharacter);
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};