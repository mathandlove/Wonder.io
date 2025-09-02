import React, { useRef } from 'react';
import './FlowContent.css';

interface FlowItem {
  kind: string;
  text?: string;
  src?: string;
  alt?: string;
  prompt?: string;
  choices?: string[];
}

interface FlowContentProps {
  character?: string;
  flow: FlowItem[];
  storyPath?: string;
  onComplete?: () => void;
}

const FlowContent: React.FC<FlowContentProps> = ({ character, flow, storyPath, onComplete }) => {
  const [characterImageUrl, setCharacterImageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
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

  const handleClick = () => {
    onComplete?.();
  };

  const renderFlowItem = (item: FlowItem, index: number) => {
    switch (item.kind) {
      case 'text':
        return (
          <div key={index} className="flow-item text-item">
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
          <div key={index} className="flow-item image-item">
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
      className="flow-content-container"
      onClick={handleClick}
    >
      {/* Character stays fixed in center */}
      <div className="character-fixed-position">
        {characterImageUrl && (
          <div className="character-image-container">
            <div className="wooden-dowel"></div>
            <img 
              src={characterImageUrl} 
              alt={character}
              className="character-image"
            />
          </div>
        )}
      </div>
      
      {/* Flow content scrolls past character */}
      <div className="flow-items">
        {flow.map((item, index) => renderFlowItem(item, index))}
      </div>
      
      <div className="continue-hint">
        <span>Scroll to continue story</span>
      </div>
    </div>
  );
};

export default FlowContent;