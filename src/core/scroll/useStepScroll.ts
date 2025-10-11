/**
 * useStepScroll - One-scene-at-a-time scroll control
 *
 * Intercepts wheel/touch/keyboard events and enforces single-scene transitions.
 * Prevents native scrolling and implements momentum-free, deliberate navigation.
 */
import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface HTMLElementEventMap {
    scrollend: Event;
  }
}

type Direction = 'forward' | 'backward';

type StepScrollOpts = {
  onIndexChange: (nextIndex: number) => void;
  getIndex: () => number;
  count: () => number;
  durationMs?: number;
  thresholdPx?: number;
  isInputFocused?: () => boolean;
  checkContentLocks?: (direction: Direction, currentIndex: number) => boolean;
};

export function useStepScroll(
  containerRef: React.RefObject<HTMLElement | HTMLDivElement | null>,
  {
    onIndexChange,
    getIndex,
    count,
    durationMs = 380,
    thresholdPx = 60,
    isInputFocused = () => false,
    checkContentLocks
  }: StepScrollOpts
) {
  const animatingRef = useRef(false);
  const touchStartYRef = useRef(0);
  const wheelAccumRef = useRef(0);
  const settleTimerRef = useRef<number | null>(null);

  // Debug state emitter
  const emitDebug = useCallback((lastEvent: string, lockState?: { isLocked: boolean; reason: string; direction?: 'forward' | 'backward' }) => {
    const currentIndex = getIndex();
    const lockedForward = checkContentLocks?.('forward', currentIndex) ?? false;
    const lockedBackward = checkContentLocks?.('backward', currentIndex) ?? false;

    window.dispatchEvent(new CustomEvent('stepscroll:debug', {
      detail: {
        animating: animatingRef.current,
        wheelAccum: wheelAccumRef.current,
        currentIndex,
        isLocked: lockState?.isLocked ?? false,
        lockReason: lockState?.reason ?? '',
        lockedForward,
        lockedBackward,
        blockDismissActive: false,
        settleTimerActive: settleTimerRef.current !== null,
        lastEvent,
        timestamp: Date.now(),
      }
    }));
  }, [getIndex, checkContentLocks]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Ensure container has required CSS properties
    el.style.overscrollBehavior = 'contain';
    el.style.scrollSnapType = 'y mandatory';

    // Emit initial state
    emitDebug('useStepScroll initialized');

    // ============ CORE FUNCTIONS ============

    const scrollToIndex = (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, count() - 1));
      const section = el.querySelectorAll<HTMLElement>('.scene')[clamped];
      if (!section) return;

      animatingRef.current = true;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      emitDebug(`scrollToIndex(${clamped})`);

      // Fallback timer in case scrollend doesn't fire
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        animatingRef.current = false;
        emitDebug('settle timer fired - checking new scene locks');
      }, 600);
    };

    const checkDomLocks = (direction: Direction, currentIndex: number): boolean => {
      const sections = el.querySelectorAll<HTMLElement>('.scene');
      const currentSection = sections[currentIndex];
      if (!currentSection) return false;

      const lockAttribute = direction === 'forward' ? 'data-lock-forward' : 'data-lock-backward';
      return currentSection.hasAttribute(lockAttribute);
    };

    const isLocked = (direction: Direction, currentIndex: number): boolean => {
      const domLocked = checkDomLocks(direction, currentIndex);
      const contentLocked = checkContentLocks?.(direction, currentIndex) ?? false;
      return domLocked || contentLocked;
    };

    const attemptTransition = (direction: Direction) => {
      const currentIndex = getIndex();
      const locked = isLocked(direction, currentIndex);

      if (locked) {
        emitDebug(`BLOCKED: ${direction}`, { isLocked: true, reason: 'content lock' });
        return false; // Blocked
      }

      // Commit to transition - set flag immediately to block subsequent events
      animatingRef.current = true;

      const delta = direction === 'forward' ? 1 : -1;
      const next = currentIndex + delta;
      const clamped = Math.max(0, Math.min(next, count() - 1));

      emitDebug(`TRANSITION: ${direction} to index ${clamped}`, { isLocked: false, reason: '' });
      onIndexChange(clamped);
      scrollToIndex(clamped);

      return true; // Success
    };

    // ============ EVENT HANDLERS ============

    const onWheel = (evt: Event) => {
      const e = evt as WheelEvent;

      // Allow normal scrolling for inputs
      if (isInputFocused()) return;

      // Only handle vertical scrolling
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;

      // Block all scrolling during animation
      if (animatingRef.current) {
        e.preventDefault();
        return;
      }

      e.preventDefault(); // Always prevent native scroll

      // Accumulate delta until threshold
      wheelAccumRef.current += e.deltaY;

      if (wheelAccumRef.current > thresholdPx) {
        wheelAccumRef.current = 0;
        emitDebug(`wheel threshold exceeded: forward`);
        attemptTransition('forward');
      } else if (wheelAccumRef.current < -thresholdPx) {
        wheelAccumRef.current = 0;
        emitDebug(`wheel threshold exceeded: backward`);
        attemptTransition('backward');
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

      if (animatingRef.current) {
        e.preventDefault();
        return;
      }

      const dy = touchStartYRef.current - e.touches[0].clientY;

      if (Math.abs(dy) > thresholdPx) {
        e.preventDefault();
        touching = false;
        attemptTransition(dy > 0 ? 'forward' : 'backward');
      }
    };

    const onTouchEnd = () => {
      touching = false;
    };

    const onKeyDown = (evt: Event) => {
      const e = evt as KeyboardEvent;
      if (isInputFocused()) return;
      if (animatingRef.current) return;

      let direction: Direction | null = null;

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        direction = 'forward';
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        direction = 'backward';
      }

      if (direction) {
        e.preventDefault();
        attemptTransition(direction);
      }
    };

    const onScrollEnd = () => {
      animatingRef.current = false;
    };

    // ============ EVENT LISTENERS ============

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('keydown', onKeyDown, { passive: false });
    el.addEventListener('scrollend', onScrollEnd);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('keydown', onKeyDown);
      el.removeEventListener('scrollend', onScrollEnd);
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };
  }, [containerRef, onIndexChange, getIndex, count, durationMs, thresholdPx, isInputFocused, checkContentLocks, emitDebug]);
}
