import React from 'react';
import './LeoFlowbar.css';
import { useMagneticScroller } from '../hooks/useMagneticScroller';

interface FlowItem {
  kind: string;
  text?: string;
  src?: string;
  alt?: string;
  prompt?: string;
  choices?: string[];
}

interface LeoFlowbarProps {
  character?: string;
  flow: FlowItem[];
  storyPath?: string;
  onComplete?: () => void;
}

const LeoFlowbar: React.FC<LeoFlowbarProps> = ({ character, flow, storyPath, onComplete }) => {
  const [characterImageUrl, setCharacterImageUrl] = React.useState<string | null>(null);
  
  // Use magnetic scroller hook
  const { handleTapAdvance } = useMagneticScroller({
    containerSelector: 'body',
    cardSelector: '.flow-item',
    debounceMs: 120,
    onComplete
  });
  

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


  const renderFlowItem = (item: FlowItem, index: number) => {
    switch (item.kind) {
      case 'text':
        return (
          <div key={index} className="flow-item">
            <div className="text-bubble">
              <p className="scene-text">{item.text}</p>
            </div>
          </div>
        );
      
      case 'image':
        // Image paths should be relative to the story bundle directory's story subfolder
        const imagePath = storyPath ? 
          `${storyPath.substring(0, storyPath.lastIndexOf('/'))}/images/story/${item.src}` : 
          item.src;
        
        return (
          <div key={index} className="flow-item">
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
    <div className="leo-flowbar-container">
      {/* Leo character on the left */}
      <div className="leo-character">
        {characterImageUrl ? (
          <div className="character-display character-entrance">
            <div className="wooden-dowel"></div>
            <img 
              src={characterImageUrl} 
              alt={character}
              className="character-image"
            />
          </div>
        ) : (
          <div className="character-placeholder">
            <div className="text-center p-4 bg-blue-100 rounded-lg">
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                Character: {character}
              </h3>
              <p className="text-sm text-blue-600">
                (Image loading...)
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Flow content on the right */}
      <div className="flow-content flow-content-scroll">
        {flow.map((item, index) => (
          <div 
            key={index} 
            className="flow-item"
            onClick={() => handleTapAdvance(index)}
          >
            {renderFlowItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeoFlowbar;