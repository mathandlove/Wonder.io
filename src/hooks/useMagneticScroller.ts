// Modern magnetic scroll implementation using CSS scroll snap
// Research-backed approach for 2025 best practices

import { useEffect, useRef, useCallback } from 'react';

export interface MagneticScrollOptions {
  // New API
  containerRef?: React.RefObject<HTMLElement>;
  onSnapChange?: (element: Element | null) => void;
  onSnapChanging?: (element: Element | null) => void;
  
  // Legacy API for backward compatibility
  cardSelector?: string;
  debounceMs?: number;
  onComplete?: () => void;
}

export const useMagneticScroller = ({ 
  containerRef,
  onSnapChange, 
  onSnapChanging,
  // Legacy props
  cardSelector,
  debounceMs,
  onComplete
}: MagneticScrollOptions = {}) => {
  
  const fallbackRef = useRef<HTMLElement>(null);
  const container = containerRef || fallbackRef;
  
  // Feature detection for modern scroll snap events
  const supportsScrollSnapEvents = useCallback(() => {
    return typeof window !== 'undefined' && 
           'onscrollsnapchange' in window;
  }, []);
  
  // Modern approach: Use native scroll snap events (Chrome 129+)
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    
    if (supportsScrollSnapEvents()) {
      console.log('🎯 Using modern scroll snap events');
      
      const handleSnapChange = (event: any) => {
        const target = event.snapTargetBlock || event.snapTargetInline;
        console.log('📌 Snap changed to:', target);
        onSnapChange?.(target);
      };
      
      const handleSnapChanging = (event: any) => {
        const target = event.snapTargetBlock || event.snapTargetInline;
        console.log('🔄 Snap changing to:', target);
        onSnapChanging?.(target);
      };
      
      element.addEventListener('scrollsnapchange', handleSnapChange);
      element.addEventListener('scrollsnapchanging', handleSnapChanging);
      
      return () => {
        element.removeEventListener('scrollsnapchange', handleSnapChange);
        element.removeEventListener('scrollsnapchanging', handleSnapChanging);
      };
    } else {
      // Fallback: Use Intersection Observer for older browsers
      console.log('📡 Using Intersection Observer fallback');
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
              console.log('👀 Element in view:', entry.target);
              onSnapChange?.(entry.target);
            }
          });
        },
        {
          root: element,
          rootMargin: '-25% 0px -25% 0px', // Center 50% of viewport
          threshold: [0.5, 1.0]
        }
      );
      
      // Observe all snap targets
      const snapTargets = element.querySelectorAll('[style*="scroll-snap-align"], .flow-item');
      snapTargets.forEach(target => observer.observe(target));
      
      return () => {
        observer.disconnect();
      };
    }
  }, [container, onSnapChange, onSnapChanging, supportsScrollSnapEvents]);
  
  // Programmatic scroll to element
  const scrollToElement = useCallback((element: Element) => {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });
  }, []);
  
  // Get currently snapped element (simple viewport center check)
  const getCurrentSnap = useCallback(() => {
    const element = container.current;
    if (!element) return null;
    
    const rect = element.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    
    const snapTargets = element.querySelectorAll('.flow-item');
    let closest = null;
    let closestDistance = Infinity;
    
    snapTargets.forEach(target => {
      const targetRect = target.getBoundingClientRect();
      const targetCenter = targetRect.top + targetRect.height / 2;
      const distance = Math.abs(targetCenter - centerY);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = target;
      }
    });
    
    return closest;
  }, [container]);
  
  // Legacy methods for backward compatibility
  const handleTapAdvance = useCallback((currentIndex: number) => {
    const elements = document.querySelectorAll(cardSelector || '.flow-item');
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < elements.length) {
      scrollToElement(elements[nextIndex]);
    } else {
      onComplete?.();
    }
  }, [cardSelector, onComplete, scrollToElement]);
  
  const scrollToCard = useCallback((cardIndex: number) => {
    const elements = document.querySelectorAll(cardSelector || '.flow-item');
    if (cardIndex >= 0 && cardIndex < elements.length) {
      scrollToElement(elements[cardIndex]);
    }
  }, [cardSelector, scrollToElement]);

  return {
    // New API
    containerRef: container,
    scrollToElement,
    getCurrentSnap,
    supportsModernEvents: supportsScrollSnapEvents(),
    
    // Legacy API
    handleTapAdvance,
    scrollToCard
  };
};