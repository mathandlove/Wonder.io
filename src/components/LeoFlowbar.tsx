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
    cardSelector: '.flow-item',
    debounceMs: 120,
    onComplete
  });
  
  // Debug positioning - call this from browser console: window.debugFlowPositions()
  React.useEffect(() => {
    (window as any).debugFlowPositions = () => {
      const viewportCenter = window.innerHeight / 2;
      console.log('=== FLOW POSITIONING DEBUG ===');
      console.log(`Viewport height: ${window.innerHeight}px`);
      console.log(`Viewport center: ${viewportCenter}px`);
      console.log(`Current scroll Y: ${window.scrollY}px`);
      console.log('');
      
      document.querySelectorAll('.flow-item').forEach((flowItem, index) => {
        const flowRect = flowItem.getBoundingClientRect();
        const bubble = flowItem.querySelector('.text-bubble, .image-bubble');
        
        console.log(`--- Flow Item ${index + 1} ---`);
        console.log(`Flow rect.top: ${flowRect.top.toFixed(1)}px`);
        console.log(`Flow rect.height: ${flowRect.height.toFixed(1)}px`);
        console.log(`Flow center: ${(flowRect.top + flowRect.height / 2).toFixed(1)}px`);
        console.log(`Distance from viewport center: ${Math.abs(flowRect.top + flowRect.height / 2 - viewportCenter).toFixed(1)}px`);
        
        if (bubble) {
          const bubbleRect = bubble.getBoundingClientRect();
          const bubbleCenter = bubbleRect.top + bubbleRect.height / 2;
          
          // Get the actual CSS animation progress by reading the computed content
          const afterElement = window.getComputedStyle(bubble, '::after');
          const actualProgress = afterElement.content.replace(/"/g, '') || 'no content'; // Remove quotes from content
          
          // Different attempt: maybe it's based on intersection ratio
          const viewportHeight = window.innerHeight;
          const bubbleTop = bubbleRect.top;
          const bubbleBottom = bubbleRect.bottom;
          const bubbleHeight = bubbleRect.height;
          
          // If CSS shows ~30% when bubble is perfectly centered, there's clearly a different calculation
          // Let's see what the relationship is
          const viewProgress = 30; // Just showing we know it's different
          
          console.log(`Bubble rect.top: ${bubbleRect.top.toFixed(1)}px`);
          console.log(`Bubble rect.height: ${bubbleRect.height.toFixed(1)}px`);
          console.log(`Bubble center: ${bubbleCenter.toFixed(1)}px`);
          console.log(`Bubble distance from viewport center: ${Math.abs(bubbleCenter - viewportCenter).toFixed(1)}px`);
          console.log(`Calculated view progress: ${viewProgress.toFixed(1)}%`);
          console.log(`ACTUAL CSS animation progress: ${actualProgress}`);
          console.log(`--- DISCREPANCY: ${Math.abs(viewProgress - parseFloat(actualProgress.replace(/[^\d.]/g, '')))} ---`);
        }
        console.log('');
      });
    };
    
    // Test function to manually trigger magnetic scroller
    (window as any).testMagneticScroller = () => {
      console.log('🧪 Testing magnetic scroller manually...');
      window.scrollBy({ top: 200, behavior: 'auto' });
      setTimeout(() => {
        console.log('🧪 Manual scroll completed - magnetic snap should trigger');
      }, 200);
    };

    return () => {
      delete (window as any).debugFlowPositions;
      delete (window as any).testMagneticScroller;
    };
  }, []);
  

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
          <div className="text-bubble">
            <p className="scene-text">{item.text}</p>
          </div>
        );
      
      case 'image':
        // Image paths should be relative to the story bundle directory's story subfolder
        const imagePath = storyPath ? 
          `${storyPath.substring(0, storyPath.lastIndexOf('/'))}/images/story/${item.src}` : 
          item.src;
        
        return (
          <div className="image-bubble">
            <img src={imagePath} alt={item.alt} className="flow-image" />
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