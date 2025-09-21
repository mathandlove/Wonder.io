
import React from 'react';
import { CardboardBubble } from './CardboardBubble';
import './WaitingBubble.css';

interface ThinkingDotsProps {
  className?: string;
}

function ThinkingDots({ className = '' }: ThinkingDotsProps) {
  return (
    <span className={`story-thinking-dots ${className}`}>
      <span className="dot">.</span>
      <span className="dot">.</span>
      <span className="dot">.</span>
    </span>
  );
}

interface WaitingBubbleProps {
  side?: 'left' | 'right' | 'center';
  speakerLabel?: string;
  isDelayed?: boolean;
  isReady?: boolean;
  onViewportExit?: () => void;
  onViewportEnter?: () => void;
}

export function WaitingBubble({
  side = 'right',
  speakerLabel,
  isDelayed = false,
  isReady = true,
  onViewportExit,
  onViewportEnter
}: WaitingBubbleProps) {
  return (
    <CardboardBubble
      side={side}
      speakerLabel={speakerLabel}
      isDelayed={isDelayed}
      isReady={isReady}
      onViewportExit={onViewportExit}
      onViewportEnter={onViewportEnter}
    >
      <ThinkingDots />
    </CardboardBubble>
  );
}