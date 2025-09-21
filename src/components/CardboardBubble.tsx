import React from 'react';
import './CardboardBubble.css';

interface CardboardBubbleProps {
  side?: 'left' | 'right' | 'center';
  children: React.ReactNode;
  speakerLabel?: string;
  isDelayed?: boolean;
  isReady?: boolean;
}

export const CardboardBubble: React.FC<CardboardBubbleProps> = ({
  side = 'center',
  children,
  speakerLabel,
  isDelayed = false,
  isReady = true
}) => {
  const bubbleClass = side === 'center'
    ? 'cardboard-bubble-center'
    : `cardboard-bubble-${side}`;

  const showTail = side === 'left' || side === 'right';

  // Build class names
  const delayedClasses = isDelayed
    ? `cardboard-bubble-delayed ${isReady ? 'cardboard-bubble-show' : ''}`
    : '';

  const finalClassName = `cardboard-bubble ${delayedClasses} ${bubbleClass}`.trim();

  // Position bubble at bottom when delayed, center when ready
  const wrapperStyle = isDelayed ? {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    transition: isReady ? 'all 0.8s ease-out' : 'none',
    ...(isReady ? {
      bottom: '50%',
      transform: 'translate(-50%, 50%)'
    } : {})
  } : {};


  return (
    <div style={wrapperStyle}>
      <div className="cardboard-bubble-container">
        <div className={finalClassName}>
          {showTail && (
            <div className={`cardboard-bubble-tail-${side}`}></div>
          )}
          <div className="cardboard-bubble-inner">
            {speakerLabel && (
              <h3 className="cardboard-bubble-speaker">{speakerLabel}</h3>
            )}
            <p className="cardboard-bubble-text">{children}</p>
          </div>
        </div>
      </div>
    </div>
  );
  };