import React, { useEffect, useRef, useState } from 'react';
import './CardboardBubble.css';

interface CardboardBubbleProps {
  side?: 'left' | 'right' | 'center';
  children: React.ReactNode;
  speakerLabel?: string;
  isDelayed?: boolean;
  isReady?: boolean;
  onViewportExit?: () => void; // Callback when bubble leaves viewport
  onViewportEnter?: () => void; // Callback when bubble enters viewport
}

export const CardboardBubble: React.FC<CardboardBubbleProps> = ({
  side = 'center',
  children,
  speakerLabel,
  isDelayed = false,
  isReady = true,
  onViewportExit,
  onViewportEnter
}) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(!isDelayed || isReady);

  // Viewport detection for reset and animation control
  useEffect(() => {
    const bubbleElement = bubbleRef.current;
    if (!bubbleElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          // Entering viewport
          onViewportEnter?.(); // Notify parent that bubble has entered viewport
          if (hasBeenVisible) {
            // Re-entering - reset and wait for entrance coordination if delayed
            if (!isDelayed || isReady) {
              setShouldAnimate(true);
            } else {
              setShouldAnimate(false); // Wait for character entrance to complete
            }
          } else {
            // First time visible
            setHasBeenVisible(true);
            if (!isDelayed || isReady) {
              setShouldAnimate(true);
            } else {
              setShouldAnimate(false); // Wait for character entrance to complete
            }
          }
        } else {
          // Leaving viewport
          setShouldAnimate(false);
          onViewportExit?.(); // Notify parent that bubble has left viewport
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(bubbleElement);

    return () => {
      observer.disconnect();
    };
  }, [hasBeenVisible, isDelayed, isReady, onViewportExit, onViewportEnter]);

  // Update animation state when isReady changes (character entrance completes)
  useEffect(() => {
    if (isDelayed && isReady) {
      setShouldAnimate(true);
    }
  }, [isReady, isDelayed]);
  const bubbleClass = side === 'center'
    ? 'cardboard-bubble-center'
    : `cardboard-bubble-${side}`;

  const showTail = side === 'left' || side === 'right';

  // Build class names with viewport-driven animation control
  const delayedClasses = isDelayed
    ? `cardboard-bubble-delayed ${shouldAnimate ? 'cardboard-bubble-show' : ''}`
    : '';

  const finalClassName = `cardboard-bubble ${delayedClasses} ${bubbleClass}`.trim();

  // Debug logging for bubble class state
  console.log(`🎈 Bubble class debug: isDelayed=${isDelayed}, shouldAnimate=${shouldAnimate}, classes="${finalClassName}"`);

  // Position bubble at bottom when delayed, center when ready
  const wrapperStyle = isDelayed ? {
    position: 'absolute',
    bottom: '20px',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: side === 'left' ? 'flex-start' : side === 'right' ? 'flex-end' : 'center',
    transition: shouldAnimate ? 'all 0.4s ease-out' : 'none',
    ...(shouldAnimate ? {
      bottom: '50%',
      transform: 'translateY(50%)'
    } : {})
  } : {};


  return (
    <div ref={bubbleRef} style={wrapperStyle}>
      <div className="cardboard-bubble-container">
        <div className={finalClassName}>
          {showTail && (
            <div className={`cardboard-bubble-tail-${side}`}></div>
          )}
          <div className="cardboard-bubble-inner">
            <p className="cardboard-bubble-text">{children}</p>
          </div>
        </div>
      </div>
    </div>
  );
  };