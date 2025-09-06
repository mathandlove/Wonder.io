import React, { useEffect, useState } from 'react';
import './SimpleScrollSnapTest.css';

const SimpleScrollSnapTest: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  useEffect(() => {
    const info = [];
    
    // Check browser support
    const testElement = document.createElement('div');
    
    // Test CSS scroll snap properties
    if ('scrollSnapType' in testElement.style) {
      info.push('✅ scroll-snap-type supported');
    } else {
      info.push('❌ scroll-snap-type NOT supported');
    }
    
    if ('scrollSnapAlign' in testElement.style) {
      info.push('✅ scroll-snap-align supported');
    } else {
      info.push('❌ scroll-snap-align NOT supported');
    }
    
    // Check user agent
    info.push(`Browser: ${navigator.userAgent.substring(0, 50)}...`);
    
    // Test if container has scroll snap applied
    setTimeout(() => {
      const container = document.querySelector('.simple-scroll-container') as HTMLElement;
      if (container) {
        const computedStyle = window.getComputedStyle(container);
        info.push(`Computed scroll-snap-type: ${computedStyle.scrollSnapType || 'none'}`);
        info.push(`Computed scroll-padding: ${computedStyle.scrollPadding || 'none'}`);
        
        // Check children
        const snapItems = container.querySelectorAll('.simple-snap-item');
        info.push(`Found ${snapItems.length} snap items`);
        
        if (snapItems.length > 0) {
          const firstItem = snapItems[0] as HTMLElement;
          const itemStyle = window.getComputedStyle(firstItem);
          info.push(`Item scroll-snap-align: ${itemStyle.scrollSnapAlign || 'none'}`);
          info.push(`Item scroll-snap-stop: ${itemStyle.scrollSnapStop || 'none'}`);
        }
      }
      setDebugInfo([...info]);
    }, 100);
    
  }, []);
  
  return (
    <div className="simple-scroll-container">
      <div className="simple-debug">
        <h3>Simple CSS Scroll Snap Test</h3>
        <p>Scroll to test - should snap to center of each item</p>
        <div style={{ marginTop: '15px', fontSize: '12px' }}>
          {debugInfo.map((info, i) => (
            <div key={i} style={{ marginBottom: '5px' }}>{info}</div>
          ))}
        </div>
      </div>
      
      <div className="simple-spacer"></div>
      
      {[1, 2, 3, 4, 5].map((num) => (
        <div key={num} className="simple-snap-item">
          <div className="simple-content">
            <h2>Item {num}</h2>
            <p>This should snap to center when scrolling</p>
          </div>
        </div>
      ))}
      
      <div className="simple-spacer"></div>
    </div>
  );
};

export default SimpleScrollSnapTest;