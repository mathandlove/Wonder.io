// Optimized magnetic scroll implementation with momentum-based navigation
// Combines the best of CSS scroll snap and JavaScript control

import { useEffect, useRef, useCallback, useState } from 'react';

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

interface ScrollMomentumData {
  startScrollTop: number;
  startTime: number;
  lastScrollTop: number;
  direction: number; // 1 for down, -1 for up, 0 for none
  startingItemIndex: number; // Track which item we started from
}

export const useMagneticScroller = ({ 
  containerRef,
  onSnapChange, 
  onSnapChanging,
  // Legacy props
  cardSelector = '.flow-item',
  debounceMs = 200,
  onComplete
}: MagneticScrollOptions = {}) => {
  
  const fallbackRef = useRef<HTMLElement>(null);
  const container = containerRef || fallbackRef;
  
  // State for momentum-based snapping
  const [isSnapping, setIsSnapping] = useState(false);
  const [currentSnap, setCurrentSnap] = useState<number>(-1);
  const snapTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Track scroll momentum
  const scrollDataRef = useRef<ScrollMomentumData>({
    startScrollTop: 0,
    startTime: 0,
    lastScrollTop: 0,
    direction: 0,
    startingItemIndex: -1
  });
  
  // Feature detection for modern scroll snap events
  const supportsScrollSnapEvents = useCallback(() => {
    return typeof window !== 'undefined' && 
           'onscrollsnapchange' in window;
  }, []);
  
  // Snap to element with smooth animation
  const snapToElement = useCallback((element: HTMLElement, smooth = true) => {
    // For document body scrolling, use window scroll position
    const scrollContainer = container.current || window;
    const isWindowScroll = scrollContainer === window;
    
    if (!element) return;

    let containerRect: DOMRect;
    let scrollTop: number;
    
    if (isWindowScroll) {
      containerRect = { 
        top: 0, 
        height: window.innerHeight 
      } as DOMRect;
      scrollTop = window.scrollY;
    } else {
      containerRect = (scrollContainer as HTMLElement).getBoundingClientRect();
      scrollTop = (scrollContainer as HTMLElement).scrollTop;
    }
    
    const elementRect = element.getBoundingClientRect();
    
    // Calculate scroll position to center the element
    const containerCenter = containerRect.height / 2;
    const elementCenter = elementRect.top - containerRect.top + elementRect.height / 2;
    const scrollOffset = elementCenter - containerCenter;
    
    setIsSnapping(true);
    
    if (isWindowScroll) {
      window.scrollBy({
        top: scrollOffset,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } else {
      (scrollContainer as HTMLElement).scrollBy({
        top: scrollOffset,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
    
    // Clear snapping state after animation
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    snapTimeoutRef.current = setTimeout(() => {
      setIsSnapping(false);
    }, 250);
    
    // Backup clear for safety
    setTimeout(() => {
      setIsSnapping(false);
    }, 400);
  }, [container]);
  
  // Find nearest element to viewport center
  const findNearestElement = useCallback(() => {
    const scrollContainer = container.current || window;
    const isWindowScroll = scrollContainer === window;
    const items = document.querySelectorAll(cardSelector);

    let containerRect: { top: number; height: number };
    
    if (isWindowScroll) {
      containerRect = { top: 0, height: window.innerHeight };
    } else {
      const rect = (scrollContainer as HTMLElement).getBoundingClientRect();
      containerRect = { top: rect.top, height: rect.height };
    }
    
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
  }, [cardSelector, container]);

  // Find target based on momentum and distance
  const findMomentumTarget = useCallback(() => {
    const scrollContainer = container.current || window;
    const isWindowScroll = scrollContainer === window;
    const scrollData = scrollDataRef.current;
    const items = document.querySelectorAll(cardSelector);
    
    // Use starting item index that we captured when scrolling began
    const startingItemIndex = scrollData.startingItemIndex;
    if (startingItemIndex < 0) {
      return findNearestElement();
    }

    // Determine scroll distance
    let currentScrollTop: number;
    if (isWindowScroll) {
      currentScrollTop = window.scrollY;
    } else {
      currentScrollTop = (scrollContainer as HTMLElement).scrollTop;
    }
    
    const scrollDistance = Math.abs(currentScrollTop - scrollData.startScrollTop);
    
    // Require minimum scroll distance to trigger momentum
    if (scrollDistance < 50) {
      return findNearestElement(); // Too small, just snap to nearest
    }
    
    // Determine if this is a small scroll or large scroll
    const itemHeight = 450; // Approximate item height + margin
    const scrolledItems = Math.floor(scrollDistance / itemHeight);
    
    // Small scroll (within one item height) - advance one item in direction
    if (scrolledItems < 1 && scrollData.direction !== 0) {
      let targetIndex: number;
      
      if (scrollData.direction > 0) {
        // Scrolling down - go to next item
        targetIndex = startingItemIndex + 1;
      } else {
        // Scrolling up - go to previous item
        targetIndex = startingItemIndex - 1;
      }
      
      if (targetIndex >= 0 && targetIndex < items.length) {
        const targetItem = items[targetIndex] as HTMLElement;
        const itemRect = targetItem.getBoundingClientRect();
        
        let containerRect: { top: number; height: number };
        if (isWindowScroll) {
          containerRect = { top: 0, height: window.innerHeight };
        } else {
          const rect = (scrollContainer as HTMLElement).getBoundingClientRect();
          containerRect = { top: rect.top, height: rect.height };
        }
        
        const containerCenter = containerRect.height / 2;
        const itemCenter = itemRect.top - containerRect.top + itemRect.height / 2;
        const distance = Math.abs(itemCenter - containerCenter);
        
        return { element: targetItem, index: targetIndex, distance };
      }
    }

    // Large scroll - snap to nearest to prevent skipping
    return findNearestElement();
  }, [findNearestElement, cardSelector, container]);
  
  // Main scroll event handling with momentum detection
  useEffect(() => {
    const scrollContainer = container.current || window;
    const isWindowScroll = scrollContainer === window;
    
    let snapTimeout: NodeJS.Timeout;
    let isUserScrolling = false;

    const handleScroll = () => {
      if (isSnapping) return; // Don't interfere with programmatic snapping

      let currentScrollTop: number;
      if (isWindowScroll) {
        currentScrollTop = window.scrollY;
      } else {
        currentScrollTop = (scrollContainer as HTMLElement).scrollTop;
      }
      
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
        if (Math.abs(scrollDelta) > 5) { // Require more movement to detect direction
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
        
        // Use momentum-based targeting
        const target = findMomentumTarget();
        
        if (target && target.element && target.distance > 100) {
          setCurrentSnap(target.index);
          onSnapChange?.(target.element);
          snapToElement(target.element);
        }
        
        // Reset scroll data for next gesture
        scrollData.direction = 0;
        scrollData.startingItemIndex = -1;
        isUserScrolling = false;
      }, debounceMs);
    };

    // Add scroll event listener
    if (isWindowScroll) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      (scrollContainer as HTMLElement).addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (isWindowScroll) {
        window.removeEventListener('scroll', handleScroll);
      } else {
        (scrollContainer as HTMLElement).removeEventListener('scroll', handleScroll);
      }
      if (snapTimeout) clearTimeout(snapTimeout);
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    };
  }, [container, findMomentumTarget, snapToElement, isSnapping, onSnapChange, debounceMs, findNearestElement]);

  // Legacy methods for backward compatibility
  const handleTapAdvance = useCallback((currentIndex: number) => {
    const elements = document.querySelectorAll(cardSelector);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < elements.length) {
      snapToElement(elements[nextIndex] as HTMLElement);
    } else {
      onComplete?.();
    }
  }, [cardSelector, onComplete, snapToElement]);
  
  const scrollToCard = useCallback((cardIndex: number) => {
    const elements = document.querySelectorAll(cardSelector);
    if (cardIndex >= 0 && cardIndex < elements.length) {
      snapToElement(elements[cardIndex] as HTMLElement);
    }
  }, [cardSelector, snapToElement]);

  // Programmatic scroll method for new API
  const scrollToElement = useCallback((element: Element) => {
    snapToElement(element as HTMLElement);
  }, [snapToElement]);

  return {
    // New API
    containerRef: container,
    scrollToElement,
    getCurrentSnap: () => currentSnap >= 0 ? document.querySelectorAll(cardSelector)[currentSnap] : null,
    supportsModernEvents: supportsScrollSnapEvents(),
    
    // Legacy API
    handleTapAdvance,
    scrollToCard,
    
    // State for debugging
    isSnapping,
    currentSnapIndex: currentSnap
  };
};