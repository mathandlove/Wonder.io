import React, { useEffect, useState, useRef } from 'react';
import './TextScene.css';
import type { TextScene as TextSceneType } from '@core/types/scene';

interface TextSceneProps {
  scene: TextSceneType;
  storyId: string;
  onComplete?: () => void;
}

const TextScene: React.FC<TextSceneProps> = ({ scene, storyId, onComplete }) => {
  const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null);
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
          <div className="character-image-container">
            <div className="wooden-dowel"></div>
            <img
              src={characterImageUrl}
              alt={scene.character}
              className="character-image"
            />
          </div>
        )}

        <div ref={textBubbleRef} className="text-bubble">
          <div className="text-bubble-inner">
            <p className="scene-text">{scene.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextScene;