import React, { useEffect, useRef, useState } from 'react';
import './CardboardBubble.css';

interface CardboardBubbleProps {
  side?: 'left' | 'right' | 'center';
  children: React.ReactNode;
  speakerLabel?: string;
  shouldAnimateImmediately?: boolean;
  isReady?: boolean; // When false + shouldAnimateImmediately false, bubble waits for this to become true
  onViewportExit?: () => void; // Callback when bubble leaves viewport
  onViewportEnter?: () => void; // Callback when bubble enters viewport
  onReady?: () => void; // Callback when bubble is ready to show
}

type AnimationState = 'idle' | 'waiting' | 'animating' | 'completed' | 'exiting';

export const CardboardBubble: React.FC<CardboardBubbleProps> = ({
  side = 'center',
  children,
  speakerLabel,
  shouldAnimateImmediately = true,
  isReady = true,
  onViewportExit,
  onViewportEnter,
  onReady
}) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [animationState, setAnimationState] = useState<AnimationState>('idle');

  // Viewport detection ONLY for optimization callbacks - no animation control
  useEffect(() => {
    const bubbleElement = bubbleRef.current;
    if (!bubbleElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsInViewport(true);
          onViewportEnter?.();
        } else {
          setIsInViewport(false);
          onViewportExit?.();

          // Trigger exit animation if currently animating
          if (animationState === 'completed') {
            setAnimationState('exiting');
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(bubbleElement);

    return () => {
      observer.disconnect();
    };
  }, [animationState, onViewportExit, onViewportEnter]);

  // Animation trigger logic - separate from viewport detection
  useEffect(() => {
    // Only animate once per bubble instance
    if (hasAnimatedRef.current) return;

    // Don't start animation until in viewport
    if (!isInViewport) return;

    if (shouldAnimateImmediately) {
      // Immediate animation bubbles (center/narrator)
      setAnimationState('animating');
      hasAnimatedRef.current = true;
      onReady?.();
    } else if (isReady) {
      // Delayed animation bubbles (left/right speakers) - wait for isReady
      setAnimationState('animating');
      hasAnimatedRef.current = true;
      onReady?.();
    } else {
      // Waiting for character entrance to complete
      setAnimationState('waiting');
    }
  }, [shouldAnimateImmediately, isReady, isInViewport, onReady]);

  // Handle animation completion
  useEffect(() => {
    if (animationState === 'animating') {
      const timer = setTimeout(() => {
        setAnimationState('completed');
      }, 500); // Match CSS animation duration

      return () => clearTimeout(timer);
    }
  }, [animationState]);
  const bubbleClass = side === 'center'
    ? 'cardboard-bubble-center'
    : `cardboard-bubble-${side}`;

  const showTail = side === 'left' || side === 'right';

  // Build class names based on animation state
  const getAnimationClasses = () => {
    if (shouldAnimateImmediately) {
      // Immediate bubbles use default pop-in animation
      return '';
    } else {
      // Delayed bubbles use slide animations
      const baseClass = 'cardboard-bubble-delayed';
      switch (animationState) {
        case 'idle':
        case 'waiting':
          return baseClass;
        case 'animating':
        case 'completed':
          return `${baseClass} cardboard-bubble-show`;
        case 'exiting':
          return `${baseClass} cardboard-bubble-exit`;
        default:
          return baseClass;
      }
    }
  };

  const finalClassName = `cardboard-bubble ${getAnimationClasses()} ${bubbleClass}`.trim();


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
      </div>
    </div>
  );
  };