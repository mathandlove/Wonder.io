/**
 * useSceneVisibility - Hook to detect when a scene becomes visible
 *
 * Uses IntersectionObserver to track when a component scrolls into view.
 * Returns true once the element has been visible (and stays true - no reset on scroll away).
 */
import { useState, useEffect, RefObject } from 'react';

interface UseSceneVisibilityOptions {
  /** Threshold for intersection (0-1). Default: 0.5 (50% visible) */
  threshold?: number;
  /** Root margin for intersection. Default: '0px' */
  rootMargin?: string;
  /** Whether to reset visibility when scrolling away. Default: false */
  resetOnExit?: boolean;
}

/**
 * Hook that returns true once the referenced element becomes visible.
 * By default, once visible, it stays "visible" even if user scrolls away.
 *
 * @param ref - React ref to the element to observe
 * @param options - Configuration options
 * @returns boolean indicating if the element has been visible
 */
export function useSceneVisibility(
  ref: RefObject<HTMLElement | null>,
  options: UseSceneVisibilityOptions = {}
): boolean {
  const {
    threshold = 0.5,
    rootMargin = '0px',
    resetOnExit = false,
  } = options;

  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If already marked as visible and we don't reset on exit, no need to observe
    if (hasBeenVisible && !resetOnExit) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasBeenVisible(true);
            // If we don't reset on exit, we can disconnect after first visibility
            if (!resetOnExit) {
              observer.disconnect();
            }
          } else if (resetOnExit) {
            setHasBeenVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, rootMargin, resetOnExit, hasBeenVisible]);

  return hasBeenVisible;
}
