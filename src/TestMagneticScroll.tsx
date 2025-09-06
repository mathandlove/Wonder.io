import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useMagneticScroller } from './hooks/useMagneticScroller';
import './TestMagneticScroll.css';

// Individual bubble component to handle its own distance tracking
const TestBubble: React.FC<{ item: any; index: number }> = ({ item, index }) => {
  const [distance, setDistance] = useState(0);
  
  useEffect(() => {
    const updateDistance = () => {
      const element = document.querySelectorAll('.flow-item')[index];
      if (element) {
        const rect = element.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const viewportCenter = window.innerHeight / 2;
        setDistance(itemCenter - viewportCenter);
      }
    };
    
    updateDistance();
    window.addEventListener('scroll', updateDistance);
    window.addEventListener('resize', updateDistance);
    return () => {
      window.removeEventListener('scroll', updateDistance);
      window.removeEventListener('resize', updateDistance);
    };
  }, [index]);
  
  return (
    <div className="flow-item" style={{ marginBottom: '80px' }}>
      <div className="item-number">#{index + 1}</div>
      <div className="distance-indicator">
        {distance > 0 ? '↓' : '↑'} {Math.abs(distance).toFixed(0)}px
      </div>
      <div 
        className="text-bubble" 
        style={{ 
          minHeight: `${item.height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div className="bubble-content">
          {item.text}
          <div className="bubble-center-marker">● CENTER</div>
        </div>
      </div>
      <div className="item-bounds">
        <div className="bound-top">↑ TOP</div>
        <div className="bound-bottom">↓ BOTTOM</div>
      </div>
    </div>
  );
};

const TestMagneticScroll: React.FC = () => {
  const [scrollData, setScrollData] = useState({
    scrollY: 0,
    viewportHeight: 0,
    viewportCenter: 0,
    nearestItem: '',
    nearestDistance: 0,
    isSnapping: false
  });

  const [currentSnap, setCurrentSnap] = useState<Element | null>(null);

  // Using magnetic scroll with JavaScript enhancement over CSS scroll snap
  const { containerRef, scrollToElement, getCurrentSnap, supportsModernEvents } = useMagneticScroller({
    onSnapChange: (element) => {
      setCurrentSnap(element);
      console.log('🎯 Snapped to:', element?.textContent?.substring(0, 30));
    },
    onSnapChanging: (element) => {
      console.log('🔄 Snapping to:', element?.textContent?.substring(0, 30));
    }
  });

  useEffect(() => {
    // Debug: check if CSS scroll snap is applied
    const container = containerRef.current;
    if (container) {
      const styles = window.getComputedStyle(container);
      console.log('🎯 Container scroll-snap-type:', styles.scrollSnapType);
      console.log('🎯 Container scroll-padding:', styles.scrollPadding);
    }
    
    const updateScrollData = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const containerHeight = container.clientHeight;
      const viewportCenter = containerHeight / 2;
      const scrollY = container.scrollTop;
      
      // Find nearest flow item and highlight it
      const flowItems = document.querySelectorAll('.flow-item');
      let nearestItem = '';
      let nearestDistance = Infinity;
      let nearestElement: Element | null = null;
      
      flowItems.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const distance = Math.abs(itemCenter - viewportCenter);
        
        // Remove previous highlight
        item.classList.remove('nearest');
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestItem = `Item ${index + 1}`;
          nearestElement = item;
        }
      });
      
      // Add highlight to nearest
      if (nearestElement) {
        nearestElement.classList.add('nearest');
      }
      
      setScrollData({
        scrollY,
        viewportHeight: containerHeight,
        viewportCenter,
        nearestItem,
        nearestDistance,
        isSnapping: false
      });
    };

    // Update on scroll
    const scrollContainer = containerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateScrollData);
      window.addEventListener('resize', updateScrollData);
    
      // Initial update
      updateScrollData();
      
      // Poll for updates
      const interval = setInterval(updateScrollData, 100);
      
      return () => {
        scrollContainer.removeEventListener('scroll', updateScrollData);
        window.removeEventListener('resize', updateScrollData);
        clearInterval(interval);
      };
    }
  }, [containerRef]);

  return (
    <div className="test-container" ref={containerRef}>
      {/* Fixed debug panel */}
      <div className="debug-panel">
        <h3>Basic Scroll Test</h3>
        <div className="debug-info">
          <div>Single scroll container ✅</div>
          <div>Magnetic scroll: CSS snap + JS enhancement</div>
          <div>Modern events: {supportsModernEvents ? '✅' : '📡 fallback'}</div>
          <div>Current Snap: {currentSnap?.textContent?.substring(0, 20) || 'None'}</div>
          <div>Scroll Y: {scrollData.scrollY.toFixed(0)}px</div>
        </div>
        <div className="test-actions">
          <button onClick={() => {
            const items = containerRef.current?.querySelectorAll('.flow-item');
            if (items?.[0]) scrollToElement(items[0]);
          }}>Bubble 1</button>
          <button onClick={() => {
            const items = containerRef.current?.querySelectorAll('.flow-item');
            if (items?.[1]) scrollToElement(items[1]);
          }}>Bubble 2</button>
          <button onClick={() => {
            const items = containerRef.current?.querySelectorAll('.flow-item');
            if (items?.[2]) scrollToElement(items[2]);
          }}>Bubble 3</button>
        </div>
      </div>

      {/* Viewport center indicator */}
      <div className="center-line">
        <span>CENTER</span>
      </div>

      {/* Flow content for testing */}
      <div className="flow-content">
        <div style={{ height: '100vh' }}></div>
        
        {/* Test flow items with varying heights */}
        {[
          { height: 200, text: 'First bubble - short text' },
          { height: 350, text: 'Second bubble - This is a longer text bubble with more content to test different bubble sizes and how they center.' },
          { height: 150, text: 'Third bubble - medium' },
          { height: 400, text: 'Fourth bubble - This is the longest bubble with lots of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' },
          { height: 250, text: 'Fifth bubble - Another medium sized bubble' },
          { height: 180, text: 'Sixth bubble - Almost done' },
          { height: 300, text: 'Seventh bubble - Last one with a good amount of text to see the centering behavior' }
        ].map((item, index) => (
          <TestBubble key={index} item={item} index={index} />
        ))}
        
        <div style={{ height: '100vh' }}></div>
      </div>
    </div>
  );
};

export default TestMagneticScroll;