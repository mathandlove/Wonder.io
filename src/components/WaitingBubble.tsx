
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
    <div
      className="waiting-bubble-small"
      style={{
        position: 'relative',
        width: 'fit-content',
        height: 'fit-content',
        overflow: 'visible',
        padding: '5px', // Border box padding
        backgroundImage: 'url("/VisualAssets/cardboard.png")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundColor: '#d4b896',
        borderRadius: '12.5px', // Half of original 25px
        boxShadow: '0 5px 20px rgba(0, 0, 0, 0.3)', // Half the blur and spread
        transformOrigin: 'center center',
        boxSizing: 'border-box',
        marginLeft: side === 'right' ? '5px' : '0', // Half of original margin adjustments
        marginRight: side === 'right' ? '20px' : '5px',
        zIndex: 1 // Ensure bubble is above other elements
      }}
    >
      {/* Speech tail */}
      {(side === 'left' || side === 'right') && (
        <div
          className={`cardboard-bubble-tail-${side}`}
          style={{
            position: 'absolute',
            right: side === 'right' ? '-10px' : 'auto',
            left: side === 'left' ? '-10px' : 'auto',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '0',
            height: '0',
            zIndex: '-1', // Put tail behind other bubble components
            opacity: 1 // Full alpha (100% opacity)
          }}
        ></div>
      )}

      {/* Inner content - scaled down */}
      <div
        className="waiting-bubble-inner"
        style={{
          background: 'rgb(253, 248, 228)',
          padding: '15px',
          margin: '0px',
          borderRadius: '10px',
          height: '18px',
          position: 'relative',
          zIndex: 1,
          // Needed for pseudo-element positioning
        }}
      >
        <p style={{
          margin: '0',
          padding: '0',
          fontSize: '14px', // Smaller font for compact bubble
          lineHeight: '1.2',
          color: '#2c1810',
          fontFamily: 'inherit',
          zIndex: 1,
        }}>
          <ThinkingDots />
        </p>
      </div>
    </div>
  );
}