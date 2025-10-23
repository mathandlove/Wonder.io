import React, { useState, useRef, useEffect } from 'react';
import type { PanelSide } from './types';
import './CharacterPanel.css';

interface CharacterPanelProps {
  side: PanelSide;
  visible: boolean;
  characterName: string; // Can be 'NOCHARACTER' for empty panels
  previousCharacter?: string; // Can be 'NOCHARACTER' for previous empty panels
  nextCharacter?: string; // Can be 'NOCHARACTER' for next empty panels
  pose?: string | null;
  storyId: string;
  transitionNonce?: string; // Unique ID per transition, used to force CSS animation restart
  onEntranceComplete?: () => void; // Callback when entrance animation completes
  onJiggleComplete?: () => void; // Callback when jiggle animation completes
  isSpeaking?: boolean; // true if this character is currently the speaker
  isJiggling?: boolean; // true if this character should play the jiggle dance animation
  currentSceneId?: string; // Current scene ID to detect same-scene transitions
  previousSceneId?: string; // Previous scene ID to detect scene changes
}

type Phase = 'hidden' | 'entering' | 'idle' | 'speaking' | 'jiggling';

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  side,
  visible,
  characterName,
  previousCharacter,
  nextCharacter,
  pose,
  storyId,
  transitionNonce,
  onEntranceComplete,
  onJiggleComplete,
  isSpeaking = false,
  isJiggling = false,
  currentSceneId,
  previousSceneId
}) => {
  const [version] = useState(`v${Date.now()}`);

  // Simple logic: Is this character different from the previous one?
  // The frozen state from the transition already has the correct previousCharacter
  const hasCharacter = characterName !== 'NOCHARACTER';
  // NOTE: newCharacter is now calculated inside the effect to avoid stale closures
  const aboutToSwap = nextCharacter !== characterName && hasCharacter;

  // Track entering state - reset on every transitionNonce change (new scene)
  const [isEntering, setIsEntering] = React.useState(false);
  const prevTransitionNonceRef = useRef(transitionNonce);

  // Track which animation variant to use (alternate between 1 and 2 to force restart)
  const animationVariantRef = useRef<1 | 2>(1);

  // REMOVED: prevSceneIdRef - was causing stale state issues
  // Now using previousSceneId from frozen snapshot (TransitionManager) as source of truth

  // Reset entering state whenever we get a new transition (scene change)
  // IMPORTANT: Only trigger animation when NEW nonce is defined (transition START)
  // Ignore when transitioning from defined -> undefined (transition END)
  React.useEffect(() => {
    const prevNonce = prevTransitionNonceRef.current;
    const currentNonce = transitionNonce;

    // Calculate if this is a new character
    // previousSceneId comes from the frozen snapshot (where we came from)
    // IMPORTANT: If transitioning within the same scene (state change only), never treat as new character
    const isSameScene = currentSceneId && previousSceneId && currentSceneId === previousSceneId;

    // Infer which character we came from by checking which neighbor differs from current
    // If previousCharacter matches current, we're going backward (came from next)
    // If nextCharacter matches current, we're going forward (came from previous)
    const characterWeComingFrom = previousCharacter !== characterName ? previousCharacter : nextCharacter;

    // On first load (prevNonce undefined), don't trigger entrance if character is already defined
    const isFirstLoad = prevNonce === undefined;
    const isNewCharacter = !isSameScene && !isFirstLoad && characterWeComingFrom !== characterName && characterName !== 'NOCHARACTER';

    // Case 1: New transition started (undefined -> defined OR defined -> different defined)
    if (prevNonce !== currentNonce && currentNonce !== undefined) {
      prevTransitionNonceRef.current = currentNonce;

      // Determine if this is a new character entering or same character continuing
      if (isNewCharacter) {
        // NEW character entering - trigger entrance animation
        setIsEntering(true);
      } else {
        // SAME character continuing to new scene - clear entering state to allow speaking animations
        setIsEntering(false);
      }
    }
    // Case 2: Transition ended (defined -> undefined)
    // Just update the ref, don't change entering state or trigger animation
    else if (prevNonce !== currentNonce && currentNonce === undefined) {
      prevTransitionNonceRef.current = currentNonce;
      // Don't modify isEntering - let it stay as is until next real transition
    }
  }, [transitionNonce, characterName, previousCharacter, nextCharacter, currentSceneId, previousSceneId]);

  // Pure renderer - determine phase based on scroll direction and character state
  const getCurrentPhase = (): Phase => {
    if (!visible || !hasCharacter) return 'hidden';

    // Priority 1: Entrance animations (highest priority - don't interrupt!)
    if (isEntering) {
      return 'entering';
    }

    // Priority 2: Jiggling dance animation (celebration for correct answers)
    if (isJiggling) {
      return 'jiggling';
    }

    // Priority 3: Speaking animations (only when NOT entering or jiggling)
    if (isSpeaking) {
      return 'speaking';
    }

    // Priority 4: Default idle state
    return 'idle';
  };

  const phase = getCurrentPhase();

  // Debug: Log phase changes
  React.useEffect(() => {
    // Phase changed
  }, [phase, side, characterName, isEntering, isSpeaking, isJiggling, transitionNonce]);

  // Ref for animation event detection
  const panelRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const cardboardRef = useRef<HTMLDivElement>(null);

  // Restart animations on transition by clearing ALL animation classes with proper sequencing
  // Use useLayoutEffect to run before paint and avoid flicker
  React.useLayoutEffect(() => {
    const innerElement = innerRef.current;
    const cardboardElement = cardboardRef.current;
    const panelElement = panelRef.current;
    if (!innerElement || !cardboardElement || !panelElement) return;

    // If no active transition, ensure idle state
    if (!transitionNonce) {
      if (!cardboardElement.classList.contains('idle')) {
        cardboardElement.classList.add('idle');
      }
      return;
    }

    // Check if this is a same-scene transition (state change only)
    // Use previousSceneId from frozen snapshot (source of truth from TransitionManager)
    const isSameScene = currentSceneId && previousSceneId && currentSceneId === previousSceneId;

    // Skip animation restarts for same-scene transitions - characters should maintain their current state
    if (isSameScene) {
      return;
    }

    // Toggle animation variant for entrance animations to force browser restart
    if (phase === 'entering') {
      animationVariantRef.current = animationVariantRef.current === 1 ? 2 : 1;
    }

    const variant = animationVariantRef.current;
    const variantSuffix = variant === 2 ? '-2' : '';

    // STEP 1: Remove ALL possible animation classes from all elements
    // This ensures a clean slate regardless of what was applied before

    // Clear all entrance classes from PANEL element (this is where entrance animations are applied!)
    panelElement.classList.remove(
      'entering',
      'entering-left', 'entering-right',
      'entering-left-2', 'entering-right-2'
    );

    // Clear idle class from cardboard
    cardboardElement.classList.remove('idle');

    // Clear all speaking/jiggling classes from inner element
    innerElement.classList.remove(
      'story-character-speaking',
      'story-character-speaking-right',
      'story-character-jiggling-left',
      'story-character-jiggling-right'
    );

    // STEP 2: Force reflow - critical to ensure browser sees the clear
    // Reading offsetWidth triggers a synchronous layout recalculation
    void panelElement.offsetWidth;
    void cardboardElement.offsetWidth;
    void innerElement.offsetWidth;


    // STEP 3: Immediately apply the correct classes (no rAF needed with variant alternation)
    // The different animation name ensures browser sees this as a new animation
    if (phase === 'entering') {
      const enteringClass = `entering-${side}${variantSuffix}`;
      panelElement.classList.add(enteringClass);
    } else {
      cardboardElement.classList.add('idle');
    }

    if (phase === 'jiggling') {
      const jiggleClass = side === 'left' ? 'story-character-jiggling-left' : 'story-character-jiggling-right';
      innerElement.classList.add(jiggleClass);
    } else if (phase === 'speaking') {
      const speakClass = side === 'left' ? 'story-character-speaking' : 'story-character-speaking-right';
      innerElement.classList.add(speakClass);
    }
  }, [transitionNonce, phase, side, characterName, isSpeaking, isJiggling, isEntering, currentSceneId, previousSceneId]); // Include all animation-relevant state

  // Animation event detection
  useEffect(() => {
    const panelElement = panelRef.current;
    if (!panelElement) return;

    const handleAnimationEnd = (event: AnimationEvent) => {
      // Trigger callback for entrance animations that need to complete
      if (event.animationName.includes('character-entrance-settle') ||
          event.animationName.includes('character-bounce') ||
          event.animationName.includes('character-wiggle')) {
        // DO NOT clear entering state - it should persist until next transition
        // Call the entrance completion callback
        onEntranceComplete?.();
      }

      // Trigger callback for jiggle animations
      if (event.animationName.includes('character-jiggle-left') ||
          event.animationName.includes('character-jiggle-right')) {
        onJiggleComplete?.();
      }
    };

    const handleAnimationStart = (event: AnimationEvent) => {
      // For speak animations, trigger immediately
      if (event.animationName.includes('character-speak')) {
        // Call the entrance completion callback since character is ready
        onEntranceComplete?.();
      }
      // Removed shake animation listener - using meta-driven approach
    };

    panelElement.addEventListener('animationend', handleAnimationEnd);
    panelElement.addEventListener('animationstart', handleAnimationStart);

    return () => {
      panelElement.removeEventListener('animationend', handleAnimationEnd);
      panelElement.removeEventListener('animationstart', handleAnimationStart);
    };
  }, [side, characterName, onEntranceComplete, onJiggleComplete]); // Only re-setup when essential props change

  // Panel container always renders as independent layer


  // CSS class for current phase and side
  // NOTE: Phase classes (entering-X, idle) are managed manually in useLayoutEffect to ensure animation restart
  // Only include base and swap classes here
  const getCardClasses = () => {
    const baseClass = 'story-character-cardboard';
    const swapClass = aboutToSwap ? 'about-to-swap' : '';
    return `${baseClass} ${swapClass}`.trim();
  };

  const cardStyle = {};

  // Get animation class for character inner div
  // NOTE: Animation classes are managed manually in useLayoutEffect to ensure animation restart
  // Return empty string - classes are added via classList in the effect
  const getInnerClasses = () => {
    return '';
  };


  // Character display logic with animation-based character swapping
  const getDisplayCharacter = () => {
    if (phase === 'entering') {
      // Infer direction: we came from whichever neighbor differs from current character
      // Show the character we're transitioning FROM during the first half of the animation
      const characterWeComingFrom = previousCharacter !== characterName ? previousCharacter : nextCharacter;
      return characterWeComingFrom || characterName;
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
  const secondHalfCharacter = getSecondHalfCharacter();
  const innerClasses = getInnerClasses();

  // Debug: Log character swapping
  React.useEffect(() => {
    if (phase === 'entering') {
      // Character entering
    }
  }, [phase, characterName, previousCharacter, nextCharacter, displayCharacter, secondHalfCharacter, aboutToSwap, side]);


  return (
    <div
      ref={panelRef}
      className={`story-character-panel story-character-${side}`}>

      {displayCharacter ? (
        <div className="story-character-content">
          {/* Debug text above character - DISABLED */}
          {/* eslint-disable-next-line no-constant-binary-expression */}
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
              {`${side.toUpperCase()} PANEL
Char: ${characterName}
Prev: ${previousCharacter || 'none'}
Next: ${nextCharacter || 'none'}
Phase: ${phase}
IsEntering: ${isEntering}
AboutToSwap: ${aboutToSwap}
IsSpeaking: ${isSpeaking}
Display: ${displayCharacter}
Entering: ${phase === 'entering'}
Speaking: ${phase === 'speaking'}`}
            </div>
          )}
          <div
            ref={cardboardRef}
            className={getCardClasses()}
            style={cardStyle}
            data-phase={phase}
            data-transition-nonce={transitionNonce || 'none'}
            data-character={characterName}
          >
            <div ref={innerRef} className={`story-character-inner ${innerClasses}`}>
              {/* Dowel visibility logic */}
              {phase === 'entering' ? (
                <>
                  {/* First half dowel (exits) - hidden when coming from NOCHARACTER */}
                  <div className="story-wooden-dowel" style={{
                    animation: 'first-half-visibility 1600ms ease-in-out forwards',
                    // Hide dowel if we're coming from NOCHARACTER (infer from which neighbor differs)
                    display: (previousCharacter !== characterName && previousCharacter === 'NOCHARACTER') ||
                             (nextCharacter !== characterName && nextCharacter === 'NOCHARACTER') ? 'none' : 'block'
                  }}></div>

                  {/* Second half dowel (enters) - always uses visibility animation to sync with character */}
                  {characterName !== 'NOCHARACTER' && (
                    <div className="story-wooden-dowel" style={{
                      animation: 'second-half-visibility 1600ms ease-in-out forwards'
                    }}></div>
                  )}
                </>
              ) : (
                /* Normal dowel for non-entering phases - explicitly visible */
                characterName !== 'NOCHARACTER' && <div className="story-wooden-dowel" style={{
                  opacity: 1,
                  visibility: 'visible'
                }}></div>
              )}

              {/* First half character (visible during exit phase) */}
              {phase === 'entering' && displayCharacter && displayCharacter !== 'NOCHARACTER' && (
                <img
                  key={`first-${displayCharacter}-${transitionNonce}`}
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
              {((phase === 'entering' ? secondHalfCharacter : displayCharacter) !== 'NOCHARACTER') && (
                <img
                  key={phase === 'entering' ? `second-${secondHalfCharacter}-${transitionNonce}` : `normal-${displayCharacter}`}
                  src={getDisplayImage(phase === 'entering' ? secondHalfCharacter : displayCharacter)}
                  alt={`${phase === 'entering' ? secondHalfCharacter : displayCharacter} Character`}
                  className={`story-character-image ${phase === 'entering' ? 'story-character-second-half' : ''}`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const char = phase === 'entering' ? secondHalfCharacter : displayCharacter;
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