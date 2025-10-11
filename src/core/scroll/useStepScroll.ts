// src/hooks/useStepScroll.ts
import {useEffect, useRef} from 'react';

// Extend DOM interface for experimental scrollend event
declare global {
  interface HTMLElementEventMap {
    scrollend: Event;
  }
}

type StepScrollOpts = {
  onIndexChange: (nextIndex: number) => void;
  getIndex: () => number;
  count: () => number;
  durationMs?: number;
  thresholdPx?: number;
  isInputFocused?: () => boolean; // returns true if an input/textarea/contenteditable is focused
  checkContentLocks?: (direction: 'forward' | 'backward', currentIndex: number) => boolean; // returns true if content is locked
};

export function useStepScroll(
  containerRef: React.RefObject<HTMLElement | HTMLDivElement | null>,
  { onIndexChange, getIndex, count, durationMs = 380, thresholdPx = 60, isInputFocused = () => false, checkContentLocks }: StepScrollOpts
) {
  const animatingRef = useRef(false);
  const touchStartYRef = useRef(0);
  const wheelAccumRef = useRef(0);
  const settleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Ensure container has required CSS properties
    el.style.overscrollBehavior = 'contain';
    el.style.scrollSnapType = 'y mandatory';

    const scrollToIndex = (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, count() - 1));
      const section = el.querySelectorAll<HTMLElement>('.scene')[clamped];
      if (!section) return;
      animatingRef.current = true;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Fallback settle in case scrollend is not fired
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        animatingRef.current = false;
      }, 600); // Match smooth scroll duration to prevent overlapping animations
    };

    const checkDomLocks = (direction: 'forward' | 'backward', currentIndex: number): boolean => {
      const sections = el.querySelectorAll<HTMLElement>('.scene');
      const currentSection = sections[currentIndex];
      if (!currentSection) return false;

      const lockAttribute = direction === 'forward' ? 'data-lock-forward' : 'data-lock-backward';
      return currentSection.hasAttribute(lockAttribute);
    };

    const snapRelative = (delta: number) => {
      if (delta === 0) return;

      const next = getIndex() + (delta > 0 ? 1 : -1);
      onIndexChange(Math.max(0, Math.min(next, count() - 1)));
      scrollToIndex(next);
    };

    const onWheel = (evt: Event) => {
      const e = evt as WheelEvent;
      if (isInputFocused()) return; // let inputs scroll
      // Only vertical intent
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;

      if (animatingRef.current) {
        e.preventDefault();
        return;
      }

      // Check locks before accumulating wheel delta
      const currentIndex = getIndex();
      const direction = e.deltaY > 0 ? 'forward' : 'backward';
      const domLocked = checkDomLocks(direction, currentIndex);
      const contentLocked = checkContentLocks ? checkContentLocks(direction, currentIndex) : false;

      if (domLocked || contentLocked) {
        e.preventDefault(); // Block all wheel scrolling when locked
        const reason = domLocked ? 'DOM lock' : 'Content lock';

        // Emit custom event for debugger
        window.dispatchEvent(new CustomEvent('scroll-blocked', {
          detail: { direction, currentIndex, reason, domLocked, contentLocked }
        }));
        return;
      }

      e.preventDefault(); // Always prevent native scroll
      wheelAccumRef.current += e.deltaY;

      if (wheelAccumRef.current > thresholdPx) {
        wheelAccumRef.current = 0;
        snapRelative(+1);
      } else if (wheelAccumRef.current < -thresholdPx) {
        wheelAccumRef.current = 0;
        snapRelative(-1);
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
      if (animatingRef.current) { e.preventDefault(); return; }

      const dy = touchStartYRef.current - e.touches[0].clientY;
      if (Math.abs(dy) > thresholdPx) {
        const currentIndex = getIndex();
        const direction = dy > 0 ? 'forward' : 'backward';
        const domLocked = checkDomLocks(direction, currentIndex);
        const contentLocked = checkContentLocks ? checkContentLocks(direction, currentIndex) : false;

        if (domLocked || contentLocked) {
          e.preventDefault(); // Block touch scrolling when locked
          touching = false;
          const reason = domLocked ? 'DOM lock' : 'Content lock';

          // Emit custom event for debugger
          window.dispatchEvent(new CustomEvent('scroll-blocked', {
            detail: { direction, currentIndex, reason, domLocked, contentLocked }
          }));
          return;
        }

        e.preventDefault();
        touching = false;
        snapRelative(dy > 0 ? +1 : -1);
      }
    };
    const onTouchEnd = () => { touching = false; };

    const onKeyDown = (evt: Event) => {
      const e = evt as KeyboardEvent;
      if (isInputFocused()) return;
      if (animatingRef.current) return;

      let direction: 'forward' | 'backward' | null = null;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        direction = 'forward';
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        direction = 'backward';
      }

      if (direction) {
        const currentIndex = getIndex();
        const domLocked = checkDomLocks(direction, currentIndex);
        const contentLocked = checkContentLocks ? checkContentLocks(direction, currentIndex) : false;

        if (domLocked || contentLocked) {
          e.preventDefault(); // Block keyboard scrolling when locked
          const reason = domLocked ? 'DOM lock' : 'Content lock';

          // Emit custom event for debugger
          window.dispatchEvent(new CustomEvent('scroll-blocked', {
            detail: { direction, currentIndex, reason, domLocked, contentLocked }
          }));
          return;
        }

        e.preventDefault();
        snapRelative(direction === 'forward' ? +1 : -1);
      }
    };

    const onScrollEnd = () => {
      // Some browsers fire this, many do not yet
      animatingRef.current = false;
    };

    // listeners (critical: passive false where we call preventDefault)
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('keydown', onKeyDown, { passive: false });
    // scrollend is experimental, safe to add
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
  }, [containerRef, onIndexChange, getIndex, count, durationMs, thresholdPx, isInputFocused, checkContentLocks]);
}