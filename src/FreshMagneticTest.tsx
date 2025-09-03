import React, { useState, useRef, useCallback, useEffect } from 'react';
import './FreshMagneticTest.css';

const FreshMagneticTest: React.FC = () => {
  const [currentItem, setCurrentItem] = useState(0); // 0-6 for items (7 total)
  const [isScrolling, setIsScrolling] = useState(false);
  const [characterPanelState, setCharacterPanelState] = useState<'hidden' | 'visible' | 'exiting'>('hidden');
  const [showStoryBubble, setShowStoryBubble] = useState(false);
  const [characterAnimating, setCharacterAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Update character panel state based on current item
  useEffect(() => {
    if (currentItem <= 1) {
      // Items 0-1: Full screen (no character)
      setCharacterPanelState('hidden');
      setShowStoryBubble(false);
    } else if (currentItem >= 2 && currentItem <= 4) {
      // Items 2-4: Show character panel
      setCharacterPanelState('visible');
      
      // When entering panel 2 (index 2), start character animation
      if (currentItem === 2 && !characterAnimating && !showStoryBubble) {
        setCharacterAnimating(true);
        
        // After slide-up (800ms) + rotation (1000ms) + jump (500ms) = 2300ms total
        setTimeout(() => {
          setCharacterAnimating(false);
          setShowStoryBubble(true);
        }, 2300);
      }
    } else {
      // Items 5-6: Character exits
      setCharacterPanelState('exiting');
      setShowStoryBubble(false);
    }
  }, [currentItem, characterAnimating, showStoryBubble]);

  // Simple function to go to a specific item using native scrollIntoView
  const goToItem = useCallback((itemIndex: number) => {
    if (isScrolling) return;
    if (itemIndex < 0 || itemIndex > 6) return;
    
    const targetElement = itemRefs.current[itemIndex];
    if (!targetElement) return;
    
    setIsScrolling(true);
    setCurrentItem(itemIndex);
    
    console.log(`Scrolling to item ${itemIndex}`);
    
    // Use native scroll with CSS scroll-snap
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    
    // Clear scrolling state after animation
    setTimeout(() => {
      setIsScrolling(false);
    }, 600); // Slightly longer for smooth scroll
  }, [isScrolling]);

  // Navigation functions
  const goNext = useCallback(() => {
    if (currentItem < 6) {
      goToItem(currentItem + 1);
    }
  }, [currentItem, goToItem]);

  const goPrev = useCallback(() => {
    if (currentItem > 0) {
      goToItem(currentItem - 1);
    }
  }, [currentItem, goToItem]);

  // Detect current item from scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isScrolling) return; // Don't update during programmatic scrolling
      
      const containerHeight = container.clientHeight;
      const scrollTop = container.scrollTop;
      const newCurrentItem = Math.round(scrollTop / containerHeight);
      
      if (newCurrentItem !== currentItem && newCurrentItem >= 0 && newCurrentItem <= 6) {
        setCurrentItem(newCurrentItem);
        console.log(`Scrolled to item ${newCurrentItem}`);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentItem, isScrolling]);

  return (
    <div className="fresh-main-container">
      {/* Debug panel */}
      <div className="fresh-debug">
        <h3>Dynamic Layout Scroll</h3>
        <div>Current: Panel {currentItem + 1}/7</div>
        <div>Status: {isScrolling ? 'Scrolling' : 'Ready'}</div>
        <div style={{ fontSize: '12px', color: '#88ff88' }}>
          Layout: {currentItem <= 1 ? 'Full Screen' : currentItem <= 4 ? 'Two-Panel' : 'Full Screen (Exit)'}
        </div>
        <div style={{ fontSize: '11px', color: '#ffaa00', marginTop: '5px' }}>
          Character: {characterPanelState}
        </div>
        <div className="fresh-buttons">
          <button onClick={goPrev} disabled={currentItem === 0 || isScrolling}>
            ← Prev
          </button>
          <button onClick={goNext} disabled={currentItem === 6 || isScrolling}>
            Next →
          </button>
        </div>
        <div className="fresh-nav-buttons">
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <button
              key={i}
              onClick={() => goToItem(i)}
              disabled={isScrolling}
              style={{
                background: currentItem === i ? '#ff4444' : '#0066cc'
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic layout container */}
      <div className="fresh-dynamic-layout">
        {/* Character panel with dynamic positioning */}
        <div className={`fresh-character-panel fresh-character-${characterPanelState} ${characterAnimating ? 'animating' : ''}`}>
          <div className="fresh-character-content">
            <h2>Story Guide</h2>
            <div className={`fresh-character-avatar ${characterAnimating ? 'fresh-avatar-animating' : ''}`}>🧙‍♂️</div>
            <p>Your Narrator</p>
            <div className="fresh-character-info">
              Scene {currentItem + 1} of 7
            </div>
          </div>
        </div>

        {/* Scrolling content - adapts width based on character panel */}
        <div className={`fresh-container fresh-container-${characterPanelState}`} ref={containerRef}>
          <div className="fresh-items">
            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
              <div
                key={index}
                ref={el => itemRefs.current[index] = el}
                className={`fresh-item ${currentItem === index ? 'active' : ''}`}
              >
                {/* Only show content bubble on panel 3 (index 2) after animation */}
                {(index !== 2 || showStoryBubble) && (
                  <div className={`fresh-content ${index === 2 && showStoryBubble ? 'fresh-content-pop-in' : ''}`}>
                    <h2>{index <= 1 ? `Opening Scene ${index + 1}` : index <= 4 ? `Story Scene ${index - 1}` : `Finale ${index - 4}`}</h2>
                    <p>
                      {index <= 1 ? 'Full-screen opening' : index <= 4 ? 'Two-panel story mode' : 'Full-screen finale'}
                    </p>
                    <small>
                      {index === 1 ? 'Story Guide arrives next...' : 
                       index === 2 ? 'The wizard has performed his entrance!' : 
                       index === 4 ? 'Story Guide will depart soon...' : 
                       index === 5 ? 'Story Guide exits stage...' : 
                       'CSS Scroll Snap'}
                    </small>
                  </div>
                )}
                {/* Show loading state while wizard animates on panel 3 */}
                {index === 2 && !showStoryBubble && currentItem === 2 && (
                  <div className="fresh-waiting-text">
                    Wizard is preparing...
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Center line indicator for scroll panel */}
          <div className="fresh-center-line"></div>
        </div>
      </div>
    </div>
  );
};

export default FreshMagneticTest;