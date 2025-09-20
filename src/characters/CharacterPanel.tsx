import React, { useState } from 'react';
import type { PanelSide } from './types';
import './CharacterPanel.css';

interface CharacterPanelProps {
  side: PanelSide;
  visible: boolean;
  characterName: string | null;
  animationState?: string; // "entering", "speaking", "idle"
  aboutToSwap?: boolean; // boolean modifier flag
  pose?: string | null;
  storyId: string;
  animNonce?: number; // Forces animation restart when incremented
}

type Phase = 'hidden' | 'entering' | 'idle' | 'speaking';

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  side,
  visible,
  characterName,
  animationState = 'idle',
  aboutToSwap = false,
  pose,
  storyId,
  animNonce = 0
}) => {
  const [version] = useState(`v${Date.now()}`);

  // Pure renderer - no state management, just map animationState to CSS classes
  const getCurrentPhase = (): Phase => {
    if (!visible || !characterName) return 'hidden';

    switch (animationState) {
      case 'entering':
        return 'entering';
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
    const phaseClass =
      phase === 'entering' ? `entering-${side}` :
      'idle';
    const swapClass = aboutToSwap ? 'about-to-swap' : '';
    return `${baseClass} ${phaseClass} ${swapClass}`.trim();
  };

  const cardStyle = {
    opacity: 1, // Always fully opaque
  };

  // Get speaking animation class for character inner div
  const getInnerClasses = () => {
    if (phase === 'speaking') {
      return side === 'left' ? 'story-character-speaking' : 'story-character-speaking-right';
    }
    return '';
  };

  // Simple character display - no mid-animation swapping
  const getDisplayCharacter = () => {
    return characterName;
  };

  const getDisplayImage = (char: string | null) => {
    if (!char) return '';
    return `/stories/${storyId}.bundle/images/characters/${char}${pose ? `.${pose}` : ''}.sticker-cardboard-3d.webp?${version}`;
  };

  const getFallbackImage = (char: string | null) => {
    if (!char) return '';
    return `/assets.core/images/characters/${char}${pose ? `.${pose}` : ''}.sticker-cardboard-3d.webp?${version}`;
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
              <img
                src={getDisplayImage(displayCharacter)}
                alt={`${displayCharacter} Character`}
                className="story-character-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes(`${storyId}.bundle`)) {
                    target.src = getFallbackImage(displayCharacter);
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