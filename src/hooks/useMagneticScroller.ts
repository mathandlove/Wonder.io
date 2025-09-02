import { useEffect, useRef } from 'react';

interface MagneticScrollerOptions {
  containerSelector: string;
  cardSelector: string;
  debounceMs?: number;
  onComplete?: () => void;
}

export const useMagneticScroller = ({ 
  containerSelector,
  cardSelector, 
  debounceMs = 120,
  onComplete 
}: MagneticScrollerOptions) => {
  const isUserInteracting = useRef(false);
  const scrollTimer = useRef<NodeJS.Timeout>();
  const lastScrollY = useRef(0);
  const snapInProgress = useRef(false);

  // Get the scroll container
  const getContainer = (): HTMLElement | null => {
    return document.querySelector(containerSelector) as HTMLElement;
  };

  // Check if user prefers reduced motion
  const prefersReducedMotion = () => 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Get smooth scroll behavior based on user preference
  const getScrollBehavior = (): ScrollBehavior => 
    prefersReducedMotion() ? 'auto' : 'smooth';

  // Find the nearest card to current scroll position within the viewport
  const findNearestCard = () => {
    const cards = Array.from(document.querySelectorAll(cardSelector));
    if (cards.length === 0) return null;

    const viewportCenter = window.innerHeight / 2;
    
    let nearestCard = cards[0];
    let nearestDistance = Infinity;
    let nearestIndex = 0;

    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.top + rect.height / 2;
      const distance = Math.abs(cardCenter - viewportCenter);
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestCard = card;
        nearestIndex = index;
      }
    });

    return { card: nearestCard, index: nearestIndex, distance: nearestDistance };
  };

  // Find the card that should be snapped to (limiting to max 1 card jump)
  const findSnapTarget = () => {
    const cards = Array.from(document.querySelectorAll(cardSelector));
    if (cards.length === 0) return null;

    const currentScrollY = window.scrollY;
    const lastY = lastScrollY.current;
    const scrollDelta = currentScrollY - lastY;
    
    // Find current nearest card
    const nearest = findNearestCard();
    if (!nearest) return null;

    // If we're very close to a card (within 50px), snap to it
    if (nearest.distance < 50) {
      return nearest;
    }

    // Otherwise, limit movement to one card max in the scroll direction
    let targetIndex = nearest.index;
    
    if (Math.abs(scrollDelta) > 100) { // Only adjust for significant scrolls
      if (scrollDelta > 0 && nearest.index < cards.length - 1) {
        // Scrolling down, go to next card
        targetIndex = nearest.index + 1;
      } else if (scrollDelta < 0 && nearest.index > 0) {
        // Scrolling up, go to previous card
        targetIndex = nearest.index - 1;
      }
    }

    const targetCard = cards[targetIndex];
    return { 
      card: targetCard, 
      index: targetIndex, 
      distance: Math.abs(targetCard.getBoundingClientRect().top)
    };
  };

  // Smoothly scroll to a specific card
  const scrollToCard = (cardIndex: number) => {
    const cards = Array.from(document.querySelectorAll(cardSelector));
    if (cardIndex >= 0 && cardIndex < cards.length) {
      const card = cards[cardIndex] as HTMLElement;
      const cardTop = card.offsetTop;
      
      snapInProgress.current = true;
      window.scrollTo({
        top: cardTop,
        behavior: getScrollBehavior()
      });
      
      console.log(`Magnetic snap to card ${cardIndex + 1}, behavior: ${getScrollBehavior()}`);
      
      // Reset snap flag after animation completes
      setTimeout(() => {
        snapInProgress.current = false;
      }, 500);
    }
  };

  // Handle scroll events with debouncing
  const handleScroll = () => {
    // Don't snap if user is actively interacting or snap is in progress
    if (isUserInteracting.current || snapInProgress.current) {
      return;
    }

    // Clear existing timer
    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current);
    }

    // Debounce the snap
    scrollTimer.current = setTimeout(() => {
      if (!isUserInteracting.current && !snapInProgress.current) {
        const target = findSnapTarget();
        if (target && target.distance > 20) {
          scrollToCard(target.index);
        }
        lastScrollY.current = window.scrollY;
      }
    }, debounceMs);
  };

  // Handle user interaction start
  const handleInteractionStart = () => {
    isUserInteracting.current = true;
    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current);
    }
  };

  // Handle user interaction end
  const handleInteractionEnd = () => {
    // Small delay to ensure momentum scroll is captured
    setTimeout(() => {
      isUserInteracting.current = false;
    }, 50);
  };

  // Tap to advance to next card
  const handleTapAdvance = (currentIndex: number) => {
    const cards = Array.from(document.querySelectorAll(cardSelector));
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < cards.length) {
      scrollToCard(nextIndex);
    } else {
      // Last card reached
      onComplete?.();
    }
  };

  useEffect(() => {
    // Set initial scroll position
    lastScrollY.current = window.scrollY;

    // Scroll event listener (passive to avoid blocking)
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Touch events to detect user interaction
    window.addEventListener('touchstart', handleInteractionStart, { passive: true });
    window.addEventListener('touchend', handleInteractionEnd, { passive: true });
    
    // Mouse events for drag detection
    window.addEventListener('mousedown', handleInteractionStart);
    window.addEventListener('mouseup', handleInteractionEnd);
    
    // Wheel events for mouse wheel
    window.addEventListener('wheel', handleInteractionStart, { passive: true });
    // End wheel interaction after a short delay
    let wheelTimer: NodeJS.Timeout;
    const handleWheel = () => {
      handleInteractionStart();
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(handleInteractionEnd, 100);
    };
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleInteractionStart);
      window.removeEventListener('touchend', handleInteractionEnd);
      window.removeEventListener('mousedown', handleInteractionStart);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('wheel', handleWheel);
      
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
      if (wheelTimer) {
        clearTimeout(wheelTimer);
      }
    };
  }, [cardSelector, debounceMs]);

  return {
    handleTapAdvance,
    scrollToCard,
    isUserInteracting: isUserInteracting.current
  };
};