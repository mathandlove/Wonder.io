import React, { useEffect, useRef, useState } from 'react';
import './CardboardBubble.css';
import { WaitingBubble } from './WaitingBubble';

interface CardboardBubbleProps {
  side?: 'left' | 'right' | 'center';
  children: React.ReactNode;
  speakerLabel?: string;
  onViewportExit?: () => void; // Callback when bubble leaves viewport
  onViewportEnter?: () => void; // Callback when bubble enters viewport
  showWaitingBubble?: boolean; // Show waiting bubble 20px below main text
}

export const CardboardBubble: React.FC<CardboardBubbleProps> = ({
  side = 'center',
  children,
  speakerLabel,
  onViewportExit,
  onViewportEnter,
  showWaitingBubble = false
}) => {
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Optional viewport detection for callbacks
  useEffect(() => {
    if (!onViewportEnter && !onViewportExit) return;

    const bubbleElement = bubbleRef.current;
    if (!bubbleElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          onViewportEnter?.();
        } else {
          onViewportExit?.();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(bubbleElement);

    return () => {
      observer.disconnect();
    };
  }, [onViewportExit, onViewportEnter]);
  const bubbleClass = side === 'center'
    ? 'cardboard-bubble-center'
    : `cardboard-bubble-${side}`;

  const showTail = side === 'left' || side === 'right';

  // Simple class name - no complex animation logic needed
  const finalClassName = `cardboard-bubble ${bubbleClass}`.trim();


  return (
    <div ref={bubbleRef} style={{ visibility: 'visible' }}>
      <div className="cardboard-bubble-container">
        <div className={finalClassName}>
          {showTail && (
            <div className={`cardboard-bubble-tail-${side}`}></div>
          )}
          <div className="cardboard-bubble-inner">
            <p className="cardboard-bubble-text">{children}</p>
          </div>
        </div>

        {/* Waiting bubble positioned 20px below main bubble - always for right side (AI) */}
        {showWaitingBubble && (
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <WaitingBubble
              side="right"
              speakerLabel="AI"
              isDelayed={false}
              isReady={true}
            />
          </div>
        )}
      </div>
    </div>
  );
  };