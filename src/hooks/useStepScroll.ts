// src/hooks/useStepScroll.ts
import {useEffect, useRef} from 'react';

type StepScrollOpts = {
  onIndexChange: (nextIndex: number) => void;
  getIndex: () => number;
  count: () => number;
  durationMs?: number;
  thresholdPx?: number;
  isInputFocused?: () => boolean; // returns true if an input/textarea/contenteditable is focused
};

export function useStepScroll(
  containerRef: React.RefObject<HTMLElement>,
  { onIndexChange, getIndex, count, durationMs = 380, thresholdPx = 60, isInputFocused = () => false }: StepScrollOpts
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
      }, 200); // Shorter blocking period to allow quicker scroll reversals
    };

    const snapRelative = (delta: number) => {
      if (delta === 0) return;
      const next = getIndex() + (delta > 0 ? 1 : -1);
      onIndexChange(Math.max(0, Math.min(next, count() - 1)));
      scrollToIndex(next);
    };

    const onWheel = (e: WheelEvent) => {

      if (isInputFocused()) return; // let inputs scroll
      // Only vertical intent
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;

      if (animatingRef.current) {
        e.preventDefault();
        return;
      }

      wheelAccumRef.current += e.deltaY;

      if (wheelAccumRef.current > thresholdPx) {
        e.preventDefault();
        wheelAccumRef.current = 0;
        snapRelative(+1);
      } else if (wheelAccumRef.current < -thresholdPx) {
        e.preventDefault();
        wheelAccumRef.current = 0;
        snapRelative(-1);
      }
    };

    let touching = false;
    const onTouchStart = (e: TouchEvent) => {
      if (isInputFocused()) return;
      touching = true;
      touchStartYRef.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touching) return;
      if (animatingRef.current) { e.preventDefault(); return; }
      const dy = touchStartYRef.current - e.touches[0].clientY;
      if (Math.abs(dy) > thresholdPx) {
        e.preventDefault();
        touching = false;
        snapRelative(dy > 0 ? +1 : -1);
      }
    };
    const onTouchEnd = () => { touching = false; };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (animatingRef.current) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        snapRelative(+1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        snapRelative(-1);
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
    el.addEventListener('scrollend', onScrollEnd as any);

    return () => {
      el.removeEventListener('wheel', onWheel as any);
      el.removeEventListener('touchstart', onTouchStart as any);
      el.removeEventListener('touchmove', onTouchMove as any);
      el.removeEventListener('touchend', onTouchEnd as any);
      el.removeEventListener('keydown', onKeyDown as any);
      el.removeEventListener('scrollend', onScrollEnd as any);
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };
  }, [containerRef, onIndexChange, getIndex, count, durationMs, thresholdPx, isInputFocused]);
}