import React, { useEffect, useRef, useState, useCallback } from 'react';
import './SimpleButtonTest.css';

const SimpleButtonTest: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const [currentItem, setCurrentItem] = useState<number>(0); // Always track current item (0 = blank space)
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const snapTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Simple scroll tracking - just direction
  const scrollDataRef = useRef({
    lastScrollTop: 0,
    hasScrolled: false
  });

  // Virtual items: 0 = blank space, 1-5 = actual items
  const totalItems = 6; // 0 (blank) + 5 items

  const snapToItem = useCallback((itemIndex: number, smooth = true) => {
    const container = containerRef.current;
    if (!container) return;

    setIsSnapping(true);
    
    // Position all content based on current item
    const items = container.querySelectorAll('.simple-snap-item, .simple-spacer');
    const containerHeight = container.clientHeight;
    const containerCenter = containerHeight / 2;
    
    items.forEach((element, index) => {
      const el = element as HTMLElement;
      
      if (el.classList.contains('simple-spacer')) {
        // Handle spacers
        if (index === 0) {
          // Top spacer - position based on current item
          const offset = itemIndex * -containerHeight;
          el.style.transform = `translateY(${offset}px)`;
        } else {
          // Bottom spacer - position after all items
          const offset = (itemIndex - items.length + 1) * -containerHeight;
          el.style.transform = `translateY(${offset}px)`;
        }
      } else {
        // Handle actual items (index 0-4 = itemIndex 1-5)
        const actualItemIndex = index; // Adjusted for spacer
        const targetItemIndex = actualItemIndex + 1; // Convert to our 1-5 system
        const offset = (itemIndex - targetItemIndex) * -containerHeight;
        
        el.style.transform = `translateY(${offset}px)`;
        el.style.transition = smooth ? 'transform 0.3s ease-out' : 'none';
      }
    });
    
    // Update current item and clear snapping state
    setCurrentItem(itemIndex);
    console.log(`🎯 POSITIONED: Item ${itemIndex} centered`);
    
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    snapTimeoutRef.current = setTimeout(() => {
      setIsSnapping(false);
      console.log('🔓 UNBLOCKED - Ready for next action');
    }, smooth ? 300 : 100);
  }, []);

  // Simple function to handle scroll direction
  const handleScrollDirection = useCallback((direction: 'up' | 'down') => {
    if (isSnapping) {
      console.log('🚫 IGNORED - Still snapping from previous scroll');
      return;
    }
    
    const debug: string[] = [];
    let targetItem: number;
    
    debug.push(`Current item: ${currentItem} (${currentItem === 0 ? 'blank' : `Item ${currentItem}`})`);
    debug.push(`Direction: ${direction.toUpperCase()}`);
    
    if (direction === 'down') {
      targetItem = Math.min(currentItem + 1, totalItems - 1);
      debug.push(`DOWN: Going to item ${targetItem}`);
    } else {
      targetItem = Math.max(currentItem - 1, 0);
      debug.push(`UP: Going to item ${targetItem}`);
    }
    
    debug.push(`Target: ${targetItem === 0 ? 'blank space' : `Item ${targetItem}`}`);
    setDebugInfo(debug);
    
    console.log(`🎯 SCROLLING: ${currentItem} → ${targetItem} (${direction})`);
    
    // Snap to target item
    snapToItem(targetItem);
  }, [currentItem, totalItems, snapToItem, isSnapping]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let wheelTimeout: NodeJS.Timeout;
    
    // Prevent all native scrolling and capture wheel events
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Block all native scrolling
      
      if (isSnapping) {
        console.log('🚫 IGNORED - Still transitioning');
        return;
      }
      
      // Clear any pending wheel timeout
      if (wheelTimeout) clearTimeout(wheelTimeout);
      
      // Debounce wheel events to prevent rapid firing
      wheelTimeout = setTimeout(() => {
        const direction = e.deltaY > 0 ? 'down' : 'up';
        console.log(`🎢 WHEEL: ${direction} (deltaY: ${Math.round(e.deltaY)})`);
        handleScrollDirection(direction);
      }, 50);
    };

    // Also capture keyboard events for arrow keys
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSnapping) return;
      
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleScrollDirection('down');
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        handleScrollDirection('up');
      }
    };

    // Prevent native scrolling completely
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('scroll', (e) => {
      e.preventDefault();
    }, { passive: false });
    
    // Add keyboard support
    container.addEventListener('keydown', handleKeyDown);
    container.tabIndex = 0; // Make container focusable for keyboard events

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('scroll', () => {});
      container.removeEventListener('keydown', handleKeyDown);
      if (wheelTimeout) clearTimeout(wheelTimeout);
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    };
  }, [isSnapping, handleScrollDirection]);

  const handleButtonClick = (itemIndex: number) => {
    snapToItem(itemIndex);
  };

  return (
    <div className="simple-magnetic-container" ref={containerRef}>
      <div className="simple-debug-panel">
        <h3>🚫 NO SCROLL - PURE NAV 🚫</h3>
        <div className="simple-debug-info">
          <div style={{ background: '#8800ff', color: '#fff', padding: '4px', fontWeight: 'bold', fontSize: '16px' }}>
            VERSION: 9.0 - NO SCROLL
          </div>
          <div>Current item: <strong>{currentItem === 0 ? 'BLANK SPACE' : `ITEM ${currentItem}`}</strong></div>
          <div>Snapping: {isSnapping ? '🧲 YES' : '❌ No'}</div>
          <div style={{ color: isSnapping ? '#ff4444' : '#44ff44' }}>
            State: {isSnapping ? 'TRANSITIONING' : 'READY'}
          </div>
          <div style={{ fontSize: '12px', color: '#ffff88', marginTop: '5px' }}>
            🎢 Use mouse wheel or ↑↓ arrow keys
          </div>
          <div style={{ fontSize: '12px', color: '#ffff88' }}>
            📱 No native scrolling - pure item navigation!
          </div>
          <div style={{ 
            marginTop: '10px', 
            padding: '8px', 
            background: '#222', 
            borderRadius: '4px',
            fontSize: '11px',
            lineHeight: '1.4'
          }}>
            <div style={{ color: '#00ff00', marginBottom: '5px' }}>📊 SCROLL DEBUG:</div>
            {debugInfo.map((info, i) => (
              <div key={i} style={{ color: '#0ff' }}>→ {info}</div>
            ))}
          </div>
        </div>
        <div className="simple-test-buttons">
          <button 
            onClick={() => handleButtonClick(0)}
            style={{ 
              background: currentItem === 0 ? '#ff4444' : '#007bff',
              gridColumn: '1 / -1'
            }}
          >
            BLANK SPACE
          </button>
          {[1, 2, 3, 4, 5].map(i => (
            <button 
              key={i} 
              onClick={() => handleButtonClick(i)}
              style={{ 
                background: currentItem === i ? '#ff4444' : '#007bff' 
              }}
            >
              Item {i}
            </button>
          ))}
        </div>
      </div>

      {/* Center line indicator */}
      <div className="simple-center-line"></div>

      <div className="simple-spacer"></div>

      {[1, 2, 3, 4, 5].map((num) => (
        <div key={num} className="simple-snap-item">
          <div className="simple-content">
            <h2>Item {num}</h2>
          </div>
        </div>
      ))}

      <div className="simple-spacer"></div>
    </div>
  );
};

export default SimpleButtonTest;