/**
 * useScrollLock - Robust scroll prevention system for fast momentum scrolling
 *
 * This hook provides active scroll prevention using non-passive event listeners
 * to handle cases where CSS scroll-snap fails with fast momentum scrolling.
 */
import { useCallback, useEffect, useRef } from 'react';

interface ScrollLockConfig {
  isLocked: boolean;
  lockedPosition: number; // Y position in pixels to lock to
  onUnlockRequest?: () => void; // Called when user tries to scroll while locked
}

export function useScrollLock({ isLocked, lockedPosition, onUnlockRequest }: ScrollLockConfig) {
  const preventScrollRef = useRef(false);
  const lockedPositionRef = useRef(lockedPosition);
  const unlockTimeoutRef = useRef<number | null>(null);

  // Update locked position ref
  useEffect(() => {
    lockedPositionRef.current = lockedPosition;
  }, [lockedPosition]);

  // Force scroll to locked position
  const forceScrollPosition = useCallback(() => {
    if (isLocked && Math.abs(window.scrollY - lockedPositionRef.current) > 10) {
      window.scrollTo({
        top: lockedPositionRef.current,
        behavior: 'auto' // Instant, no smooth scrolling during lock
      });
    }
  }, [isLocked]);

  // Prevent scroll with immediate position reset
  const preventScroll = useCallback((e: Event) => {
    if (!isLocked) return;

    e.preventDefault();
    e.stopPropagation();

    // Notify that user attempted to scroll while locked
    onUnlockRequest?.();

    // Force scroll position back immediately
    requestAnimationFrame(() => {
      forceScrollPosition();
    });

    return false;
  }, [isLocked, onUnlockRequest, forceScrollPosition]);

  // Handle scroll events - force position back if locked
  const handleScroll = useCallback(() => {
    if (!isLocked) return;

    // Force position back during scroll lock
    forceScrollPosition();
  }, [isLocked, forceScrollPosition]);

  // Prevent touch interactions during lock
  const preventTouch = useCallback((e: TouchEvent) => {
    if (!isLocked) return;

    // Allow single touches for interface interaction, prevent scroll gestures
    if (e.touches.length > 1 || (e.type === 'touchmove' && e.touches.length === 1)) {
      e.preventDefault();
      e.stopPropagation();
      onUnlockRequest?.();
      return false;
    }
  }, [isLocked, onUnlockRequest]);

  // Main effect - add/remove event listeners based on lock state
  useEffect(() => {
    if (!isLocked) {
      // Remove all scroll prevention when unlocked
      preventScrollRef.current = false;
      return;
    }

    preventScrollRef.current = true;

    // Force immediate scroll to locked position
    forceScrollPosition();

    // Add non-passive event listeners for scroll prevention
    const options = { passive: false, capture: true };

    // Prevent mouse wheel scrolling
    document.addEventListener('wheel', preventScroll, options);

    // Prevent keyboard scrolling
    document.addEventListener('keydown', (e) => {
      if (isLocked && (
        e.code === 'Space' || e.code === 'PageUp' || e.code === 'PageDown' ||
        e.code === 'ArrowUp' || e.code === 'ArrowDown' ||
        e.code === 'Home' || e.code === 'End'
      )) {
        e.preventDefault();
        onUnlockRequest?.();
      }
    }, options);

    // Prevent touch scrolling (but allow taps)
    document.addEventListener('touchstart', preventTouch, options);
    document.addEventListener('touchmove', preventTouch, options);

    // Monitor scroll position and force it back
    const scrollOptions = { passive: true }; // Passive for monitoring, we force position in handler
    window.addEventListener('scroll', handleScroll, scrollOptions);

    // Cleanup
    return () => {
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('keydown', preventScroll);
      document.removeEventListener('touchstart', preventTouch);
      document.removeEventListener('touchmove', preventTouch);
      window.removeEventListener('scroll', handleScroll);
      preventScrollRef.current = false;

      // Clear any pending timeout
      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
        unlockTimeoutRef.current = null;
      }
    };
  }, [isLocked, preventScroll, preventTouch, handleScroll, forceScrollPosition, onUnlockRequest]);

  // Apply/remove CSS scroll lock styles
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    if (isLocked) {
      // Add scroll lock CSS classes
      body.classList.add('scroll-locked');
      html.classList.add('scroll-locked');

      // Set CSS custom property for iOS Safari position fix
      const scrollOffset = -lockedPositionRef.current;
      document.documentElement.style.setProperty('--scroll-lock-offset', `${scrollOffset}px`);
    } else {
      // Remove scroll lock CSS classes
      body.classList.remove('scroll-locked');
      html.classList.remove('scroll-locked');

      // Clear CSS custom property
      document.documentElement.style.removeProperty('--scroll-lock-offset');
    }

    return () => {
      // Cleanup on unmount
      body.classList.remove('scroll-locked');
      html.classList.remove('scroll-locked');
      document.documentElement.style.removeProperty('--scroll-lock-offset');
    };
  }, [isLocked]);

  return {
    forceScrollPosition,
    isScrollLocked: isLocked
  };
}