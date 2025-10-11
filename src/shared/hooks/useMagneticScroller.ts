/**
 * useMagneticScroller - Momentum-based scroll snapping with small swipe detection
 *
 * Tracks gesture start, direction, distance and decides whether to:
 * - snap to nearest (for tiny gestures)
 * - nudge exactly ±1 item (for small swipes with clear direction)
 * - snap to nearest (for large scrolls)
 *
 * Emits a targetIndex when a programmatic nudge is warranted (debounced)
 */
import { useEffect, useRef, useState } from 'react";

export type MagneticConfig = {
  minGesturePx?: number;        // default 50
  minDeltaForDirection?: number;// default 5
  debounceMs?: number;          // default 200
};

type Params = {
  railRef: React.RefObject<HTMLDivElement | null>;
  index: number;
  offset: number;
  isProgrammatic: boolean;
};

export function useMagneticScroller(
  { railRef, index, offset, isProgrammatic }: Params,
  config: MagneticConfig = {}
) {
  const { minGesturePx = 50, minDeltaForDirection = 5, debounceMs = 200 } = config;

  const [targetIndex, setTargetIndex] = useState<number | undefined>(undefined);
  const startTopRef = useRef<number | null>(null);
  const startIndexRef = useRef<number | null>(null);
  const directionRef = useRef<-1 | 0 | 1>(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    const onScroll = () => {
      if (isProgrammatic) return;

      const top = el.scrollTop;

      // Start tracking gesture on first scroll event
      if (startTopRef.current == null) {
        startTopRef.current = top;
        startIndexRef.current = index;
        directionRef.current = 0;
      } else {
        // Update direction based on movement
        const delta = top - startTopRef.current;
        if (Math.abs(delta) > minDeltaForDirection) {
          directionRef.current = delta > 0 ? 1 : -1;
        }
      }

      // Debounce "scroll end" detection
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const startTop = startTopRef.current ?? top;
        const distancePx = Math.abs(top - startTop);
        const viewport = el.clientHeight || 1;
        const itemHeight = viewport; // Each target is 100vh
        let nextTarget: number | undefined;

        // 1) Too tiny: let native snap to nearest
        if (distancePx < minGesturePx) {
          nextTarget = undefined; // do nothing => native snap
        } else {
          const scrolledItems = Math.floor(distancePx / itemHeight);
          const startIdx = startIndexRef.current ?? index;
          const dir = directionRef.current;

          if (scrolledItems < 1 && dir !== 0) {
            // 2) Small swipe (within 1 item) → advance exactly 1 in direction
            nextTarget = startIdx + (dir > 0 ? 1 : -1);
          } else {
            // 3) Larger move → snap to nearest
            nextTarget = Math.round(offset);
          }
        }

        // Clamp to valid range
        if (nextTarget != null) {
          const max = el.children.length - 1;
          if (nextTarget < 0) nextTarget = 0;
          if (nextTarget > max) nextTarget = max;
        }

        setTargetIndex(nextTarget);

        // Reset gesture tracking
        startTopRef.current = null;
        startIndexRef.current = null;
        directionRef.current = 0;
      }, debounceMs);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [railRef, index, offset, isProgrammatic, minGesturePx, minDeltaForDirection, debounceMs]);

  return { targetIndex };
}