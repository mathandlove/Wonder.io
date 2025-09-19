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
    // ALWAYS update refs first to prevent false change detections
    const hasCharacterChanged = changeKey !== prevChangeKeyRef.current;
    const hasVisibilityChanged = visible !== prevVisibleRef.current;

    // Update refs immediately to maintain state
    prevChangeKeyRef.current = changeKey;
    prevVisibleRef.current = visible;


    if (!visible) {
      setPhase('hidden');
      return;
    }

    if (!characterName) {
      setPhase('idle'); // Panel is visible but empty
      return;
    }

    // Handle exiting flag first
    if (exiting) {
      setPhase('exiting');
      return;
    }

    // Only trigger animations for actual meaningful changes
    if (hasCharacterChanged || hasVisibilityChanged) {
      if (hasCharacterChanged && characterName && visible) {
        // Character change - only animate if character actually changed and is visible
        setPhase('entering');
        const timer = setTimeout(() => {
          setPhase(isSpeaking ? 'speaking' : 'idle');
        }, ENTER_MS);
        return () => clearTimeout(timer);
      } else if (hasVisibilityChanged && !hasCharacterChanged && characterName && visible) {
        // Visibility change only (no character change) - only animate if becoming visible
        if (phase === 'hidden') {
          setPhase('entering');
          const timer = setTimeout(() => {
            setPhase(isSpeaking ? 'speaking' : 'idle');
          }, ENTER_MS);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [changeKey, visible, characterName, direction, isSpeaking, exiting]);

  // Handle speaking state changes (only when idle)
  useEffect(() => {
    if (visible && characterName && phase === 'idle') {
      setPhase(isSpeaking ? 'speaking' : 'idle');
    } else if (visible && characterName && phase === 'speaking' && !isSpeaking) {
      setPhase('idle');
    }
  }, [isSpeaking, visible, phase, characterName]);

  // Panel container always renders as independent layer


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
  };

  // Get speaking animation class for character inner div
  const getInnerClasses = () => {
    if (phase === 'speaking') {
      return side === 'left' ? 'story-character-speaking' : 'story-character-speaking-right';
    }
    return '';
  };

  return (
    <div className={`story-character-panel story-character-${side}`}>
      {characterName ? (
        <div className="story-character-content">
          <div
            className={getCardClasses()}
            style={cardStyle}
          >
            <div className={`story-character-inner ${getInnerClasses()}`}>
              <div className="story-wooden-dowel"></div>
              <img
                src={`/stories/${storyId}.bundle/images/characters/${characterName}${pose ? `.${pose}` : ''}.sticker-cardboard-3d.webp?${version}`}
                alt={`${characterName} Character`}
                className="story-character-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes(`${storyId}.bundle`)) {
                    target.src = `/assets.core/images/characters/${characterName}${pose ? `.${pose}` : ''}.sticker-cardboard-3d.webp?${version}`;
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