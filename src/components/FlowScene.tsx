import React, { useEffect, useState, useRef } from 'react';
import './FlowScene.css';

interface FlowItem {
  kind: string;
  text?: string;
  src?: string;
  alt?: string;
  prompt?: string;
  choices?: string[];
}

interface FlowSceneProps {
  character?: string;
  flow: FlowItem[];
  storyPath?: string;
  onComplete?: () => void;
}

const FlowScene: React.FC<FlowSceneProps> = ({ character, flow, storyPath, onComplete }) => {
  const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null);
  const [characterPosition, setCharacterPosition] = useState(0); // Animation progress 0-100
  const [hasArrived, setHasArrived] = useState(false);
  const [characterIsFixed, setCharacterIsFixed] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

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

  // Scroll-based character animation and flow system
  useEffect(() => {
    const handleScroll = () => {
      if (sceneRef.current) {
        const rect = sceneRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Calculate when this scene is in view for character animation
        const sceneTop = rect.top;
        const sceneCenter = sceneTop + (rect.height / 2);
        
        // Character animation progress (0 to 100) - starts immediately when scene enters
        const progress = Math.max(0, Math.min(100, 
          ((windowHeight - sceneTop) / windowHeight) * 200 - 50
        ));
        
        setCharacterPosition(progress);
        
        // Character becomes fixed when animation reaches center but delay it more
        if (progress >= 90 && !hasArrived) {
          setHasArrived(true);
          // Delay becoming fixed to allow animation to complete
          setTimeout(() => {
            setCharacterIsFixed(true);
          }, 800); // Match animation duration
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasArrived]);

  const handleClick = () => {
    onComplete?.();
  };

  const renderFlowItem = (item: FlowItem, index: number) => {
    switch (item.kind) {
      case 'text':
        return (
          <div 
            key={index}
            ref={el => itemRefs.current[index] = el}
            className="flow-item text-item"
          >
            <div className="text-bubble">
              <p className="scene-text">{item.text}</p>
            </div>
          </div>
        );
      
      case 'image':
        const imagePath = storyPath ? 
          `${storyPath.substring(0, storyPath.lastIndexOf('/'))}/${item.src}` : 
          item.src;
        
        return (
          <div 
            key={index}
            ref={el => itemRefs.current[index] = el}
            className="flow-item image-item"
          >
            <div className="image-bubble">
              <img src={imagePath} alt={item.alt} className="flow-image" />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div 
      ref={sceneRef}
      className="flow-scene-container"
      onClick={handleClick}
    >
      {/* Character swings in then stays centered */}
      {characterImageUrl && (
        <div 
          className={`character-container ${characterIsFixed ? 'character-fixed-center' : 'character-swinging'} ${hasArrived ? 'bounce-arrival' : ''}`}
          style={characterIsFixed ? {} : {
            transform: `translate(${-100 + characterPosition}%, ${50 - (characterPosition * 0.5)}%) rotate(${-45 + (characterPosition * 0.36)}deg)`,
            transition: hasArrived ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <div className="character-image-container">
            <div className="wooden-dowel"></div>
            <img 
              src={characterImageUrl} 
              alt={character}
              className="character-image"
            />
          </div>
        </div>
      )}
      
      {/* Flow content scrolls past character */}
      <div className="flow-content">
        {flow.map((item, index) => renderFlowItem(item, index))}
      </div>
      
      <div className="continue-hint">
        <span>Scroll to continue</span>
      </div>
    </div>
  );
};

export default FlowScene;