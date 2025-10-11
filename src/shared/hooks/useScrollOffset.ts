/**
 * useScrollOffset - Centralized continuous scroll offset tracking
 *
 * Listens to the rail's scroll and emits:
 * - offset: continuous float (e.g. 2.37 scenes)
 * - index: discrete current scene (e.g. 2)
 * - isProgrammatic: guard during smooth scrolls
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react";

export type ScrollOffsetState = {
  offset: number;          // continuous, e.g. 2.37 scenes
  index: number;           // discrete, e.g. 2
  isProgrammatic: boolean; // guard during scrollIntoView()
  setIsProgrammatic: (v: boolean) => void;
};

export function useScrollOffset(railRef: React.RefObject<HTMLDivElement | null>): ScrollOffsetState {
  const [offset, setOffset] = useState(0);
  const [index, setIndex] = useState(0);
  const [isProgrammatic, setIsProgrammatic] = useState(false);

  const onScroll = useCallback(() => {
    if (isProgrammatic) {
      return;
    }

    // Use window scroll position since that's what's actually scrolling
    const viewportHeight = window.innerHeight;
    const scrollTop = window.scrollY;
    const nextOffset = scrollTop / viewportHeight;

    setOffset(nextOffset);
    setIndex(Math.round(nextOffset));
  }, [isProgrammatic]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) {
      // Fallback: listen to window scroll events
      const onWindowScroll = () => {
        onScroll();
      };

      window.addEventListener('scroll', onWindowScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', onWindowScroll);
      };
    }

    // Add scroll listener to rail element
    el.addEventListener('scroll', onScroll, { passive: true });

    // Also add window scroll listener as backup
    const onWindowScroll = () => {
      onScroll();
    };
    window.addEventListener('scroll', onWindowScroll, { passive: true });

    // Initial measurement
    onScroll();

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onWindowScroll);
    };
  }, [railRef, onScroll]);

  return useMemo(() => ({
    offset,
    index,
    isProgrammatic,
    setIsProgrammatic
  }), [offset, index, isProgrammatic]);
}