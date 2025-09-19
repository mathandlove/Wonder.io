import React, { useState, useEffect, useRef } from 'react';
import type { PanelSide } from './types';
import './CharacterPanel.css';

interface CharacterPanelProps {
  side: PanelSide;
  visible: boolean;
  isSpeaking: boolean;
  characterName: string | null;
  pose?: string | null;
  storyId: string;
}

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  side,
  visible,
  isSpeaking,
  characterName,
  pose,
  storyId
}) => {
  const [animationState, setAnimationState] = useState<'hidden' | 'entering' | 'visible' | 'exiting'>('hidden');
  const [progress, setProgress] = useState(0);
  const [bounceComplete, setBounceComplete] = useState(false);
  const [version] = useState(`v${Date.now()}`);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Handle visibility changes
  useEffect(() => {
    if (visible && characterName && animationState === 'hidden') {
      setAnimationState('entering');
      setProgress(0);
      setBounceComplete(false);

      // Start entrance animation
      let currentProgress = 0;
      animationRef.current = setInterval(() => {
        currentProgress += 10;
        setProgress(currentProgress);
        if (currentProgress >= 100) {
          if (animationRef.current) {
            clearInterval(animationRef.current);
          }
          setAnimationState('visible');

          // Start bounce after a short delay
          setTimeout(() => {
            setBounceComplete(true);
          }, 1200);
        }
      }, 25);
    } else if (!visible && animationState === 'visible') {
      setAnimationState('exiting');
      setTimeout(() => {
        setAnimationState('hidden');
        setProgress(0);
        setBounceComplete(false);
      }, 300);
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [visible, characterName, animationState]);

  // Don't render if hidden
  if (animationState === 'hidden' || !characterName) {
    return null;
  }

  const getTransform = () => {
    if (animationState === 'entering' && progress < 100) {
      if (side === 'left') {
        return `translateY(${100 - progress}vh) translateX(${-100 + progress}%) rotate(${-45 + (progress * 0.45)}deg)`;
      } else {
        return `translateY(${100 - progress}vh) translateX(${100 - progress}%) rotate(${45 - (progress * 0.45)}deg)`;
      }
    }
    return 'translateY(0vh) translateX(0%) rotate(0deg)';
  };

  const getCharacterClass = () => {
    if (animationState === 'visible' && progress >= 100 && !bounceComplete) {
      return side === 'left' ? 'story-bounce-arrival' : 'story-bounce-arrival-right';
    }
    if (isSpeaking && bounceComplete) {
      return side === 'left' ? 'story-character-speaking' : 'story-character-speaking-right';
    }
    return '';
  };

  const characterSrc = `/stories/${storyId}.bundle/images/characters/${characterName}${pose ? `.${pose}` : ''}.sticker-cardboard-3d.webp?${version}`;
  const fallbackSrc = `/assets.core/images/characters/${characterName}${pose ? `.${pose}` : ''}.sticker-cardboard-3d.webp?${version}`;

  return (
    <div className={`story-character-panel story-character-${side} story-character-${animationState}`}>
      <div className="story-character-content">
        <div
          className="story-character-cardboard"
          style={{
            transform: getTransform(),
            transition: progress >= 100 ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <div className={`story-character-inner ${getCharacterClass()}`}>
            <div className="story-wooden-dowel"></div>
            <img
              src={characterSrc}
              alt={`${characterName} Character`}
              className="story-character-image"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes(`${storyId}.bundle`)) {
                  target.src = fallbackSrc;
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};