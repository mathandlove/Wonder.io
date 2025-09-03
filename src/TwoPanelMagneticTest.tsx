import React, { useEffect, useRef, useState, useCallback } from 'react';
import './TwoPanelMagneticTest.css';

const TwoPanelMagneticTest: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const [currentSnap, setCurrentSnap] = useState<number>(-1);
  const snapTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Track scroll momentum
  const scrollDataRef = useRef({
    startScrollTop: 0,
    startTime: 0,
    lastScrollTop: 0,
    direction: 0, // 1 for down, -1 for up, 0 for none
    startingItemIndex: -1 // Track which item we started from
  });

  const snapToElement = useCallback((element: HTMLElement, smooth = true) => {
    const container = containerRef.current;
    if (!container || !element) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Calculate how much to scroll to center the element
    const containerCenter = containerRect.height / 2;
    const elementCenter = elementRect.top - containerRect.top + elementRect.height / 2;
    const scrollOffset = elementCenter - containerCenter;
    
    setIsSnapping(true);
    container.scrollBy({
      top: scrollOffset,
      behavior: smooth ? 'smooth' : 'auto'
    });
    
    // Clear snapping state after animation - optimized for speed
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    snapTimeoutRef.current = setTimeout(() => {
      setIsSnapping(false);
    }, 250); // Reduced to 250ms
    
    // Backup clear for safety
    setTimeout(() => {
      setIsSnapping(false);
    }, 400); // Reduced to 400ms
  }, []);

  const findNearestElement = useCallback(() => {
    const container = containerRef.current;
    if (!container) return null;

    const items = container.querySelectorAll('.js-snap-item');
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.height / 2;

    let nearest = null;
    let nearestDistance = Infinity;
    let nearestIndex = -1;

    items.forEach((item, index) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.top - containerRect.top + itemRect.height / 2;
      const distance = Math.abs(itemCenter - containerCenter);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = item as HTMLElement;
        nearestIndex = index;
      }
    });

    return { element: nearest, index: nearestIndex, distance: nearestDistance };
  }, []);

  const findMomentumTarget = useCallback(() => {
    const container = containerRef.current;
    if (!container) return null;

    const scrollData = scrollDataRef.current;
    const items = container.querySelectorAll('.js-snap-item');
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.height / 2;
    
    // Use the starting item index that we captured when scrolling began
    const startingItemIndex = scrollData.startingItemIndex;
    if (startingItemIndex < 0) {
      // Fallback to nearest if we don't have a starting point
      return findNearestElement();
    }

    // Determine how many items we've scrolled past
    const currentScrollTop = container.scrollTop;
    const startScrollTop = scrollData.startScrollTop;
    const scrollDistance = Math.abs(currentScrollTop - startScrollTop);
    
    // Determine if this is a small scroll or large scroll
    const itemHeight = 450; // Approximate item height + margin
    const scrolledItems = Math.floor(scrollDistance / itemHeight);
    
    // Small scroll (within one item height) - advance one item in direction
    if (scrolledItems < 1 && scrollData.direction !== 0) {
      if (scrollData.direction > 0) {
        // Scrolling down - go to next item
        const nextIndex = startingItemIndex + 1;
        if (nextIndex < items.length) {
          const nextItem = items[nextIndex] as HTMLElement;
          const nextRect = nextItem.getBoundingClientRect();
          const nextCenter = nextRect.top - containerRect.top + nextRect.height / 2;
          const distance = Math.abs(nextCenter - containerCenter);
          return { element: nextItem, index: nextIndex, distance };
        }
      } else if (scrollData.direction < 0) {
        // Scrolling up - go to previous item
        const prevIndex = startingItemIndex - 1;
        if (prevIndex >= 0) {
          const prevItem = items[prevIndex] as HTMLElement;
          const prevRect = prevItem.getBoundingClientRect();
          const prevCenter = prevRect.top - containerRect.top + prevRect.height / 2;
          const distance = Math.abs(prevCenter - containerCenter);
          return { element: prevItem, index: prevIndex, distance };
        }
      }
    }

    // Large scroll (past multiple items) - snap to nearest to prevent skipping
    return findNearestElement();
  }, [findNearestElement]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let snapTimeout: NodeJS.Timeout;
    let isUserScrolling = false;

    const handleScroll = () => {
      if (isSnapping) return; // Don't interfere with programmatic snapping

      const currentScrollTop = container.scrollTop;
      const scrollData = scrollDataRef.current;

      // Track momentum on first scroll event of a gesture
      if (!isUserScrolling) {
        scrollData.startScrollTop = currentScrollTop;
        scrollData.startTime = Date.now();
        scrollData.lastScrollTop = currentScrollTop;
        
        // Capture the starting item index
        const startingItem = findNearestElement();
        scrollData.startingItemIndex = startingItem ? startingItem.index : -1;
      } else {
        // Update scroll direction based on movement
        const scrollDelta = currentScrollTop - scrollData.lastScrollTop;
        if (Math.abs(scrollDelta) > 1) { // Ignore tiny movements
          scrollData.direction = scrollDelta > 0 ? 1 : -1;
        }
      }
      
      scrollData.lastScrollTop = currentScrollTop;
      isUserScrolling = true;
      
      // Clear any existing snap timeout
      if (snapTimeout) clearTimeout(snapTimeout);

      // Set a timeout to snap after scrolling stops
      snapTimeout = setTimeout(() => {
        if (!isUserScrolling) return;
        
        // Use momentum-based targeting instead of just nearest
        const target = findMomentumTarget();
        
        if (target && target.element && target.distance > 30) {
          setCurrentSnap(target.index);
          snapToElement(target.element);
        }
        
        // Reset scroll data for next gesture
        scrollData.direction = 0;
        scrollData.startingItemIndex = -1;
        isUserScrolling = false;
      }, 100); // Reduced to 100ms for faster response
    };

    const handleScrollEnd = () => {
      isUserScrolling = false;
      
      // Also trigger snap check on scroll end
      setTimeout(() => {
        if (!isUserScrolling && !isSnapping) {
          const target = findMomentumTarget();
          
          if (target && target.element && target.distance > 30) {
            setCurrentSnap(target.index);
            snapToElement(target.element);
          }
          
          // Reset scroll data
          scrollDataRef.current.direction = 0;
          scrollDataRef.current.startingItemIndex = -1;
        }
      }, 50);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Note: scrollend is not widely supported, so let's also use a fallback
    if ('onscrollend' in container) {
      container.addEventListener('scrollend', handleScrollEnd, { passive: true });
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('scrollend', handleScrollEnd);
      if (snapTimeout) clearTimeout(snapTimeout);
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    };
  }, [findMomentumTarget, snapToElement, isSnapping]);

  const handleButtonClick = (index: number) => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll('.js-snap-item');
    const targetItem = items[index] as HTMLElement;
    
    if (targetItem) {
      setCurrentSnap(index);
      snapToElement(targetItem);
    }
  };

  return (
    <div className="two-panel-container">
      {/* Fixed left panel - Character area */}
      <div className="two-panel-left">
        <div className="character-placeholder">
          <div className="character-circle">
            <span>LEO</span>
          </div>
          <p>Fixed Character Panel</p>
        </div>
        
        {/* Debug panel */}
        <div className="two-panel-debug">
          <h3>Two-Panel Magnetic Test</h3>
          <div className="debug-info">
            <div>Forward-only magnetic scroll</div>
            <div>Current snap: {currentSnap >= 0 ? `Item ${currentSnap + 1}` : 'None'}</div>
            <div>Snapping: {isSnapping ? '🧲 YES' : '❌ No'}</div>
            <div style={{ color: isSnapping ? '#ff4444' : '#44ff44' }}>
              State: {isSnapping ? 'BLOCKED' : 'READY'}
            </div>
            <div>Logic: Small scroll → Next/prev item | Large scroll → Nearest</div>
          </div>
          <div className="test-buttons">
            {[0, 1, 2, 3, 4].map(i => (
              <button 
                key={i} 
                onClick={() => handleButtonClick(i)}
                style={{ 
                  background: currentSnap === i ? '#ff4444' : '#007bff' 
                }}
              >
                Item {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrolling right panel - Content area */}
      <div className="two-panel-right" ref={containerRef}>
        {/* Center line indicator */}
        <div className="two-panel-center-line"></div>

        <div className="two-panel-spacer"></div>

        {[1, 2, 3, 4, 5].map((num) => (
          <div key={num} className="js-snap-item">
            <div className="js-content">
              <h2>JavaScript Item {num}</h2>
              <p>Two-panel layout with proven magnetic scroll logic</p>
              <small>Should snap to center when scrolling stops</small>
            </div>
          </div>
        ))}

        <div className="two-panel-spacer"></div>
      </div>
    </div>
  );
};

export default TwoPanelMagneticTest;