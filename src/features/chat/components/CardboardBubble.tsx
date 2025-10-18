import React, { useEffect, useRef } from 'react';
import './CardboardBubble.css';
import { WaitingBubble } from './WaitingBubble';

interface CardboardBubbleProps {
  side?: 'left' | 'right' | 'center';
  children: React.ReactNode;
  speakerLabel?: string;
  onViewportExit?: () => void; // Callback when bubble leaves viewport
  onViewportEnter?: () => void; // Callback when bubble enters viewport
  showWaitingBubble?: boolean; // Show waiting bubble 20px below main text
  isPlaceholder?: boolean; // Show as placeholder text (italic, gray) for "Listening..."
}

export const CardboardBubble: React.FC<CardboardBubbleProps> = ({
  side = 'center',
  children,
  onViewportExit,
  onViewportEnter,
  showWaitingBubble = false,
  isPlaceholder = false
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

  // Container style for proper alignment
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column' as const, // Stack vertically instead of horizontally
    alignItems: side === 'left' ? 'flex-start' as const :
                side === 'right' ? 'flex-end' as const :
                'center' as const,
    width: '100%'
  };


  return (
    <div ref={bubbleRef} style={{ visibility: 'visible', width: '100%' }}>
      {/* Container for vertically stacked boxes */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '24px' }}>

        {/* First box: Main speech bubble (full width, bubble aligned to side) */}
        <div style={{ display: 'flex', width: '100%', justifyContent: containerStyle.alignItems }}>
          <div className={finalClassName}>
            {showTail && (
              <div className={`cardboard-bubble-tail-${side}`}></div>
            )}
            <div className="cardboard-bubble-inner">
              <p className={`cardboard-bubble-text ${isPlaceholder ? 'placeholder' : ''}`}>
                {children}
              </p>
            </div>
          </div>
        </div>

        {/* Second box: Waiting bubble (full width, bubble aligned to right) */}
        {showWaitingBubble && (
          <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
            <WaitingBubble
              side="right" // Waiting bubble represents AI response (right side character)
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