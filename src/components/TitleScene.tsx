import React, { useEffect, useState, useRef } from 'react';
import './TitleScene.css';

interface TitleSceneProps {
  text: string | Record<string, string>;
  author?: string;
  onComplete?: () => void;
}

const TitleScene: React.FC<TitleSceneProps> = ({ text, author, onComplete }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [hasSettled, setHasSettled] = useState(false);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      // After settling, allow normal page scrolling
      if (hasSettled && scrollProgress >= 100) {
        // Don't prevent default - let the page scroll naturally
        return;
      }
      
      e.preventDefault();
      
      if (!hasScrolled) {
        setHasScrolled(true);
      }
      
      // Don't allow scrolling during bounce animation
      if (isBouncing) {
        return;
      }
      
      setScrollProgress(prev => {
        // Before settling, allow normal scroll down
        if (!hasSettled) {
          const newProgress = Math.min(100, Math.max(0, prev + e.deltaY * 0.1));
          
          // Trigger bounce animation when first reaching center
          if (prev < 100 && newProgress >= 100 && !isBouncing) {
            setIsBouncing(true);
            setTimeout(() => {
              setIsBouncing(false);
              setHasSettled(true);
            }, 1000); // Duration of bounce animation - matches CSS animation
            return 100; // Lock at 100 during bounce
          }
          
          return newProgress;
        }
        
        // After settling, trigger scene complete immediately to load next scene
        if (hasSettled) {
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            // Defer the state update to avoid updating during render
            setTimeout(() => {
              onComplete?.();
            }, 0);
          }
          
          // Allow scrolling up after settling
          if (e.deltaY > 0) {
            return Math.min(200, prev + e.deltaY * 0.1);
          }
          // Prevent scrolling back down past center
          return Math.max(100, prev);
        }
        
        return prev;
      });
    };

    window.addEventListener('wheel', handleScroll, { passive: false });
    return () => window.removeEventListener('wheel', handleScroll);
  }, [hasScrolled, isBouncing, hasSettled, onComplete]);

  // Handle both string and object formats for text
  const renderTitle = () => {
    if (typeof text === 'string') {
      return text.split(' ').map((word, index) => (
        <span key={index} className={`title-line title-line-${index + 1}`}>
          {word}
        </span>
      ));
    } else if (typeof text === 'object' && text !== null) {
      // Handle object format with lvl1, lvl2, etc.
      return Object.entries(text).map(([key, value], index) => (
        <span key={key} className={`title-line title-line-${index + 1}`}>
          {value}
        </span>
      ));
    }
    return null;
  };

  // Calculate Y position - moves up off screen when scrolling past 100
  let translateY;
  if (scrollProgress <= 100) {
    translateY = -100 + scrollProgress; // Initial descent
  } else {
    translateY = 0 - (scrollProgress - 100); // After settling, move up off screen
  }
  
  // Calculate rotation based on progress and bounce state
  let rotation = 5; // Initial tilt
  if (scrollProgress >= 100) {
    if (isBouncing) {
      // During bounce, handled by CSS animation
      rotation = 0;
    } else if (hasSettled) {
      // After settling, stay at 0 degrees
      rotation = 0;
    }
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-8 py-16 overflow-hidden relative"
      style={{ background: 'transparent' }}
    >
      {/* Scroll prompt that disappears after animation settles */}
      {!hasSettled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-5">
          <p className="text-white text-2xl font-semibold animate-pulse-fade">
            Scroll Down to Begin
          </p>
        </div>
      )}
      
      <div 
        className={`cardboard-container relative z-10 ${isBouncing ? 'animate-bounce-settle' : ''}`}
        style={{ 
          transform: isBouncing 
            ? undefined // Let CSS animation handle transform during bounce
            : `translateY(${translateY}vh) rotate(${rotation}deg)`,
          transition: !isBouncing ? 'transform 0.3s ease-out' : undefined
        }}
      >
        {/* Wires holding up the sign */}
        <div className="wire wire-left"></div>
        <div className="wire wire-right"></div>
        
        <div className="cardboard-sign">
          <div className="red-overlay">
            <h1 className="cardboard-title">
              {renderTitle()}
            </h1>
          </div>
          <div className="tape tape-top-left"></div>
          <div className="tape tape-bottom-right"></div>
          {author && (
            <div className="author-on-cardboard">
              by {author}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TitleScene;