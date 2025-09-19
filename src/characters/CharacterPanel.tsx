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
  direction?: 'up' | 'down' | 'none';
  changeKey?: string;
  exiting?: boolean;
}

type Phase = 'hidden' | 'entering' | 'idle' | 'speaking' | 'exiting';

const ENTER_MS = 1200;
const EXIT_MS = 300;

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  side,
  visible,
  isSpeaking,
  characterName,
  pose,
  storyId,
  direction = 'none',
  changeKey = '',
  exiting = false
}) => {
  const [phase, setPhase] = useState<Phase>('hidden');
  const [version] = useState(`v${Date.now()}`);
  const prevChangeKeyRef = useRef('');
  const prevVisibleRef = useRef(false);


  useEffect(() => {
    // Handle exiting flag first
    if (exiting && visible && characterName) {
      setPhase('exiting');
      return;
    }

    // Only update refs and trigger animations if there are actual changes
    const hasCharacterChanged = changeKey !== prevChangeKeyRef.current;
    const hasVisibilityChanged = visible !== prevVisibleRef.current;

    if (hasCharacterChanged || hasVisibilityChanged) {
      if (hasCharacterChanged && visible && characterName) {
        // Character change - animate entrance if visible
        if (direction === 'up') {
          setPhase(isSpeaking ? 'speaking' : 'idle');
        } else {
          setPhase('entering');
          const timer = setTimeout(() => {
            setPhase(isSpeaking ? 'speaking' : 'idle');
          }, ENTER_MS);
          return () => clearTimeout(timer);
        }
      } else if (hasVisibilityChanged && !hasCharacterChanged) {
        // Visibility change only (no character change)
        if (visible && characterName) {
          // Becoming visible
          if (phase === 'hidden') {
            if (direction === 'up') {
              setPhase(isSpeaking ? 'speaking' : 'idle');
            } else {
              setPhase('entering');
              const timer = setTimeout(() => {
                setPhase(isSpeaking ? 'speaking' : 'idle');
              }, ENTER_MS);
              return () => clearTimeout(timer);
            }
          }
        } else {
          // Becoming hidden
          if (phase !== 'hidden') {
            if (direction === 'up') {
              setPhase('hidden');
            } else {
              setPhase('exiting');
              const timer = setTimeout(() => {
                setPhase('hidden');
              }, EXIT_MS);
              return () => clearTimeout(timer);
            }
          }
        }
      }
    }

    // Always update refs after processing (whether there were changes or not)
    prevChangeKeyRef.current = changeKey;
    prevVisibleRef.current = visible;
  }, [changeKey, visible, characterName, direction, isSpeaking, exiting]);

  // Additional effect to ensure refs are always updated
  useEffect(() => {
    prevChangeKeyRef.current = changeKey;
    prevVisibleRef.current = visible;
  });


  // Handle speaking state changes (only when idle)
  useEffect(() => {
    if (visible && phase === 'idle') {
      setPhase(isSpeaking ? 'speaking' : 'idle');
    } else if (visible && phase === 'speaking' && !isSpeaking) {
      setPhase('idle');
    }
  }, [isSpeaking, visible, phase]);



  // Don't render if hidden or no character
  if (phase === 'hidden' || !characterName) {
    return null;
  }


  // CSS class for current phase and side
  const getCardClasses = () => {
    const baseClass = 'story-character-cardboard';
    const phaseClass =
      phase === 'entering' ? `entering-${side}` :
      phase === 'exiting' ? `exiting-${side}` :
      'idle';
    return `${baseClass} ${phaseClass}`;
  };

  const cardStyle = {
    transition: 'transform 1200ms cubic-bezier(.2,.8,.2,1)',
    opacity: 1, // Always fully opaque
    animation: phase === 'speaking' ? 'cp-speaking-bounce 250ms ease-in-out infinite' : undefined,
  };

  const characterSrc = `/stories/${storyId}.bundle/images/characters/${characterName}${pose ? `.${pose}` : ''}.sticker-cardboard-3d.webp?${version}`;
  const fallbackSrc = `/assets.core/images/characters/${characterName}${pose ? `.${pose}` : ''}.sticker-cardboard-3d.webp?${version}`;

  return (
    <div className={`story-character-panel story-character-${side} story-character-${phase}`}>
      <div className="story-character-content">
        <div
          className={getCardClasses()}
          style={cardStyle}
        >
          <div className="story-character-inner">
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