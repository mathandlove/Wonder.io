import React, { useEffect, useState, useRef } from 'react';
import './TextScene.css';
import type { TextScene as TextSceneType } from '../types/scene';

interface TextSceneProps {
  scene: TextSceneType;
  storyId: string;
  onComplete?: () => void;
}

const TextScene: React.FC<TextSceneProps> = ({ scene, storyId, onComplete }) => {
  const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null);
  const [characterPosition, setCharacterPosition] = useState(0); // Animation progress 0-100
  const [hasArrived, setHasArrived] = useState(false);
  const [showText, setShowText] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const textBubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scene.character) {
      // Try story bundle first, then fallback to global assets
      const bundleImagePath = `/stories/${storyId}.bundle/images/characters/${scene.character}.sticker-cardboard-3d.webp`;
      const globalImagePath = `/assets.core/images/characters/${scene.character}.sticker-cardboard-3d.webp`;

      // Check if bundle image exists
      const img = new Image();
      img.onload = () => {
        setCharacterImageUrl(bundleImagePath);
      };
      img.onerror = () => {
        // Fallback to global image
        const globalImg = new Image();
        globalImg.onload = () => {
          setCharacterImageUrl(globalImagePath);
        };
        globalImg.onerror = () => {
          console.warn(`Character image not found for ${scene.character}`);
          setCharacterImageUrl(null);
        };
        globalImg.src = globalImagePath;
      };
      img.src = bundleImagePath;
    }
  }, [scene.character, storyId]);

  // Scroll-based swing animation
  useEffect(() => {
    const handleScroll = () => {
      if (sceneRef.current) {
        const rect = sceneRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Calculate when this scene is in view
        const sceneTop = rect.top;
        const sceneCenter = sceneTop + (rect.height / 2);
        const viewportCenter = windowHeight / 2;

        // Animation progress (0 to 100)
        const progress = Math.max(0, Math.min(100,
          ((windowHeight - sceneCenter) / windowHeight) * 100 + 50
        ));

        setCharacterPosition(progress);

        // Calculate text bubble center position for precise centering
        let textBubbleCenter = sceneCenter; // fallback to scene center
        if (textBubbleRef.current) {
          const textRect = textBubbleRef.current.getBoundingClientRect();
          textBubbleCenter = textRect.top + (textRect.height / 2);
        }

        // Show text when text bubble center reaches half of viewport center
        const halfViewportCenter = viewportCenter / 2;

        // Show text when text center is at half viewport center or lower
        if (textBubbleCenter <= halfViewportCenter && !showText) {
          setShowText(true);
        }

        // Trigger bounce when fully arrived
        if (progress >= 95 && !hasArrived) {
          setHasArrived(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasArrived, showText]);

  const handleClick = () => {
    onComplete?.();
  };

  return (
    <div
      ref={sceneRef}
      className="text-scene-container"
      onClick={handleClick}
    >
      <div className="text-scene-content">
        {characterImageUrl && (
          <div
            className={`character-image-container ${hasArrived ? 'bounce-arrival' : ''}`}
            style={{
              transform: `translate(${-100 + characterPosition}%, ${50 - (characterPosition * 0.5)}%) rotate(${-45 + (characterPosition * 0.36)}deg)`,
              transition: hasArrived ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <div className="wooden-dowel"></div>
            <img
              src={characterImageUrl}
              alt={scene.character}
              className="character-image"
            />
          </div>
        )}

        {showText && (
          <div ref={textBubbleRef} className="text-bubble text-popup">
            <div className="text-bubble-inner">
              <p className="scene-text">{scene.text}</p>
            </div>
          </div>
        )}
      </div>

      <div className="continue-hint">
        <span>Click to continue</span>
      </div>
    </div>
  );
};

export default TextScene;