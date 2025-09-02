import React, { useEffect, useState, useRef } from 'react';
import './CharacterEntrance.css';

interface CharacterEntranceProps {
  character?: string;
  storyPath?: string;
  onComplete?: () => void;
}

const CharacterEntrance: React.FC<CharacterEntranceProps> = ({ character, storyPath, onComplete }) => {
  const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null);
  const [characterPosition, setCharacterPosition] = useState(0); // Animation progress 0-100
  const [hasArrived, setHasArrived] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (character) {
      // Extract bundle path from storyPath
      const bundlePath = storyPath ? storyPath.substring(0, storyPath.lastIndexOf('/')) : '';
      
      // Try local bundle first
      const localImagePath = `${bundlePath}/images/characters/${character}.sticker-cardboard-3d.webp`;
      const globalImagePath = `/assets.core/images/characters/${character}.sticker-cardboard-3d.webp`;
      
      // Check if local image exists
      const img = new Image();
      img.onload = () => {
        setCharacterImageUrl(localImagePath);
      };
      img.onerror = () => {
        // Fallback to global image
        const globalImg = new Image();
        globalImg.onload = () => {
          setCharacterImageUrl(globalImagePath);
        };
        globalImg.onerror = () => {
          console.warn(`Character image not found for ${character}`);
          setCharacterImageUrl(null);
        };
        globalImg.src = globalImagePath;
      };
      img.src = localImagePath;
    }
  }, [character, storyPath]);

  // Scroll-based swing animation - triggers when scene enters viewport
  useEffect(() => {
    const handleScroll = () => {
      if (sceneRef.current && !hasArrived) {
        const rect = sceneRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Start animation when scene enters viewport
        const sceneTop = rect.top;
        
        // Animation progress (0 to 100) - starts when scene is visible
        const progress = Math.max(0, Math.min(100, 
          ((windowHeight - sceneTop) / windowHeight) * 150 - 50
        ));
        
        setCharacterPosition(progress);
        
        // Trigger bounce and completion when animation reaches end
        if (progress >= 95 && !hasArrived) {
          setHasArrived(true);
          // Auto-continue to flow content after animation completes
          setTimeout(() => {
            onComplete?.();
          }, 800); // Animation duration
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasArrived, onComplete]);

  return (
    <div 
      ref={sceneRef}
      className="character-entrance-container"
    >
      <div className="character-entrance-content">
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
              alt={character}
              className="character-image"
            />
          </div>
        )}
      </div>
      
      <div className="continue-hint">
        <span>Character entering...</span>
      </div>
    </div>
  );
};

export default CharacterEntrance;