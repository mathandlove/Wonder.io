/**
 * ScrollControl - Navigation-driven scroll management
 *
 * Orchestrates navigation through scenes and scene states:
 * - Gesture detection (useStepScroll) advances navigation index
 * - Navigation index changes trigger state transitions (useSceneOrchestrator)
 * - Physical scroll animations follow navigation changes
 *
 * Navigation always advances, regardless of content state. State transitions
 * (like showing captions) happen automatically when navigation lands on a new state.
 */
import React, { useRef, useCallback, useLayoutEffect } from 'react';
import type { Scene } from '@core/types/scene';
import { useStepScroll } from './useStepScroll';
import * as navigationBus from '@core/navigation/events/navigationBus';
import { useSceneOrchestrator } from '../scenes/useSceneOrchestrator';
import { SceneOrchestratorProvider } from '../scenes/SceneOrchestratorContext';
import './ScrollControl.css';

export interface ScrollControlProps {
  // Core scene management
  scenes: Scene[] | { scene: Scene; nodeId: string }[];
  currentIndex: number;
  onIndexChange: (index: number) => void;

  // Optional scroll configuration
  scrollConfig?: {
    thresholdPx?: number;
  };

  // Child content to render inside scroll container
  children: React.ReactNode;

  // Optional CSS class for container
  className?: string;

  // Optional inline styles for container
  style?: React.CSSProperties;
}

export function ScrollControl({
  scenes,
  currentIndex,
  scrollConfig = {},
  children,
  className = 'scroll-control',
  style = {},
}: ScrollControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize scenes array - extract Scene objects if wrapped in { scene, nodeId } structure
  const normalizedScenes = React.useMemo(() => {
    if (scenes.length === 0) return [];
    // Check if first element has 'scene' property (indicates wrapped structure)
    if ('scene' in scenes[0]) {
      return (scenes as { scene: Scene; nodeId: string }[]).map(item => item.scene);
    }
    return scenes as Scene[];
  }, [scenes]);

  // Create scene orchestrator for runtime state management
  const sceneOrchestrator = useSceneOrchestrator({
    scenes: normalizedScenes,
    currentIndex,
  });

  // Check if input is focused
  const isInputFocused = useCallback(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return false;
    const tag = a.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || a.isContentEditable;
  }, []);

  // Pure gesture detection - emits scroll events to XState machine
  // The machine owns routing and decides how to handle the scroll
  useStepScroll(containerRef, {
    onNavigate: (direction) => {
      // Emit SCROLL_DOWN_STEP or SCROLL_UP_STEP to the navigation bus
      // The XState machine will update activeNodeId and route to the correct scene
      navigationBus.emit({
        type: direction === 'forward' ? 'SCROLL_DOWN_STEP' : 'SCROLL_UP_STEP',
        source: 'wheel',
      });
    },
    thresholdPx: scrollConfig.thresholdPx ?? 10,
    isInputFocused,
  });

  // Watch for scene index changes and perform scroll animations
  // (Scene index changes when navigation advances to a different physical scene)
  const prevSceneIndexRef = React.useRef(currentIndex);
  const isInitialMount = React.useRef(true);
  const animationFrameRef = React.useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Skip scroll on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevSceneIndexRef.current = currentIndex;
      return;
    }

    // Only scroll if scene index actually changed (not just recalculated to same value)
    if (currentIndex !== prevSceneIndexRef.current) {
      const section = el.querySelectorAll<HTMLElement>('.scene')[currentIndex];
      if (section) {
        // Custom smooth scroll with 600ms duration to match background transition
        const startPosition = el.scrollTop;
        const targetPosition = section.offsetTop;
        const distance = targetPosition - startPosition;
        const duration = 600; // Match background transition duration
        const startTime = performance.now();

        // Cancel any existing animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Temporarily disable scroll-snap to allow smooth animation
        const originalScrollSnapType = el.style.scrollSnapType;
        el.style.scrollSnapType = 'none';

        // Easing function (ease-out) to match background
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easedProgress = easeOut(progress);

          el.scrollTop = startPosition + (distance * easedProgress);

          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(animate);
          } else {
            // Re-enable scroll-snap after animation completes
            el.style.scrollSnapType = originalScrollSnapType;
          }
        };

        animationFrameRef.current = requestAnimationFrame(animate);
      }
      prevSceneIndexRef.current = currentIndex;
    }
  }, [currentIndex]);

  // Cleanup animation on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Keep current scene in view on window resize
  // Without this, vh-based scene heights cause scroll drift during resize
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleResize = () => {
      const section = el.querySelectorAll<HTMLElement>('.scene')[currentIndex];
      if (section) {
        // Instantly snap to current scene (no animation)
        el.scrollTop = section.offsetTop;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentIndex]);

  // Focus management for accessibility
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const node = el.querySelectorAll<HTMLElement>('.scene')[currentIndex];
    if (!node) return;
    node.setAttribute('tabindex', '-1');
    node.focus({ preventScroll: true });
  }, [currentIndex]);

  // Prevent native drag scrolling on mobile so navigation remains quantum
  React.useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const IS_MOBILE = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);
    if (!IS_MOBILE) return;
    const el = containerRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  // Lock document scroll on mobile while ScrollControl is mounted
  React.useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const IS_MOBILE = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);
    if (!IS_MOBILE) return;
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;

    const originalHtmlOverflow = html.style.overflow;
    const originalBodyOverflow = body.style.overflow;
    const originalBodyPosition = body.style.position;
    const originalBodyWidth = body.style.width;
    const originalBodyTop = body.style.top;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    // Freeze the body to prevent page scrolling
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';

    return () => {
      // Restore original styles and scroll position
      html.style.overflow = originalHtmlOverflow;
      body.style.overflow = originalBodyOverflow;
      body.style.position = originalBodyPosition;
      body.style.width = originalBodyWidth;
      body.style.top = originalBodyTop;

      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Disable pinch-to-zoom and double-tap zoom on mobile
  React.useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const IS_MOBILE = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);
    if (!IS_MOBILE) return;
    if (typeof document === 'undefined') return;

    // Prevent pinch-to-zoom (multi-touch gesture)
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Prevent zoom during pinch gesture
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Prevent Safari gesture events (pinch zoom)
    const onGestureStart = (e: Event) => {
      e.preventDefault();
    };

    const onGestureChange = (e: Event) => {
      e.preventDefault();
    };

    // Add listeners with passive: false to allow preventDefault
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('gesturestart', onGestureStart);
    document.addEventListener('gesturechange', onGestureChange);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('gesturestart', onGestureStart);
      document.removeEventListener('gesturechange', onGestureChange);
    };
  }, []);

  // Merge default styles with user styles
  // Note: height uses 100svh for iOS Safari (small viewport - visible area when toolbar shown)
  const containerStyle: React.CSSProperties = {
    height: '100svh', // Small viewport height - iOS Safari fix for centering
    overflowY: 'auto',
    scrollSnapType: 'y mandatory',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none', // Firefox
    msOverflowStyle: 'none', // IE and Edge
    ...style,
  };

  return (
    <SceneOrchestratorProvider orchestrator={sceneOrchestrator}>
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
        tabIndex={0}
      >
        {children}
      </div>
    </SceneOrchestratorProvider>
  );
}
