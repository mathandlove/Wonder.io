/**
 * useStepScroll - Simple scroll-to-navigate control
 *
 * Detects scroll gestures (wheel/touch/keyboard) and advances the navigation index.
 * Uses debouncing to prevent rapid-fire navigation attempts.
 */
import { useEffect, useRef, useCallback } from 'react';

export type ScrollDirection = 'forward' | 'backward';

type StepScrollOpts = {
  onNavigate: (direction: ScrollDirection) => void;
  thresholdPx?: number;
  isInputFocused?: () => boolean;
};

export function useStepScroll(
  containerRef: React.RefObject<HTMLElement | HTMLDivElement | null>,
  {
    onNavigate,
    thresholdPx = 10,
    isInputFocused = () => false,
  }: StepScrollOpts
) {
  const debounceRef = useRef(false); // Prevents rapid-fire navigation
  const touchStartYRef = useRef(0);
  const wheelAccumRef = useRef(0);

  // Debug state emitter
  const emitDebug = useCallback((lastEvent: string) => {
    window.dispatchEvent(new CustomEvent('stepscroll:debug', {
      detail: {
        wheelAccum: wheelAccumRef.current,
        debounceActive: debounceRef.current,
        lastEvent,
        timestamp: Date.now(),
      }
    }));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Prevent native scrolling - we control navigation
    el.style.overscrollBehavior = 'contain';

    // Emit initial state
    emitDebug('useStepScroll initialized');

    // Start debounce period to prevent rapid-fire navigation
    const startDebounce = () => {
      debounceRef.current = true;
      setTimeout(() => {
        debounceRef.current = false;
        emitDebug('debounce complete');
      }, 300);
    };

    // Emit navigation direction and start debounce
    const handleNavigation = (direction: ScrollDirection) => {

      onNavigate(direction);
      emitDebug(`navigation ${direction}`);
      startDebounce();
    };

    // ============ EVENT HANDLERS ============

    const onWheel = (evt: Event) => {
      const e = evt as WheelEvent;

      // Allow normal scrolling for inputs
      if (isInputFocused()) return;

      // Only handle vertical scrolling
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;

      // Block during debounce
      if (debounceRef.current) {
        e.preventDefault();
        return;
      }

      e.preventDefault(); // Always prevent native scroll

      // Accumulate delta until threshold
      wheelAccumRef.current += e.deltaY;

      if (wheelAccumRef.current > thresholdPx) {
        wheelAccumRef.current = 0;
        handleNavigation('forward');
      } else if (wheelAccumRef.current < -thresholdPx) {
        wheelAccumRef.current = 0;
        handleNavigation('backward');
      } else {
        emitDebug(`wheel accumulating: ${wheelAccumRef.current.toFixed(0)}px`);
      }
    };

    let touching = false;
    const onTouchStart = (evt: Event) => {
      const e = evt as TouchEvent;
      if (isInputFocused()) return;
      touching = true;
      touchStartYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (evt: Event) => {
      const e = evt as TouchEvent;
      if (!touching) return;

      if (debounceRef.current) {
        e.preventDefault();
        return;
      }

      const dy = touchStartYRef.current - e.touches[0].clientY;

      if (Math.abs(dy) > thresholdPx) {
        e.preventDefault();
        touching = false;
        handleNavigation(dy > 0 ? 'forward' : 'backward');
      }
    };

    const onTouchEnd = () => {
      touching = false;
    };

    const onKeyDown = (evt: Event) => {
      const e = evt as KeyboardEvent;
      if (isInputFocused()) return;
      if (debounceRef.current) return;

      let direction: ScrollDirection | null = null;

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        direction = 'forward';
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        direction = 'backward';
      }

      if (direction) {
        e.preventDefault();
        handleNavigation(direction);
      }
    };

    // ============ EVENT LISTENERS ============

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('keydown', onKeyDown, { passive: false });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('keydown', onKeyDown);
    };
  }, [containerRef, onNavigate, thresholdPx, isInputFocused, emitDebug]);
}