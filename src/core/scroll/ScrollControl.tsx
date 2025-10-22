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
import React, { useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import type { Scene } from '@core/types/scene';
import { useStepScroll } from './useStepScroll';
import { useSceneManager } from '@core/scenes/SceneManager';
import { useSceneOrchestrator } from '../scenes/useSceneOrchestrator';
import { SceneOrchestratorProvider } from '../scenes/SceneOrchestratorContext';
import { useSceneStates } from '@core/scenes/SceneStates';
import './ScrollControl.css';

export interface ScrollControlProps {
  // Core scene management
  scenes: Scene[];
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

  // Get navigation from SceneManager (single source of truth)
  const sceneManager = useSceneManager();
  const { advanceNavigation, navigationIndex, navigationArray } = sceneManager;

  // Get SceneStates for persistent state cache
  const sceneStates = useSceneStates();

  // Scene orchestrator for input scene runtime state management
  const sceneOrchestrator = useSceneOrchestrator({
    scenes,
    currentIndex: navigationIndex,
  });

  // Update SceneStates whenever navigationIndex changes
  // This keeps a persistent cache of scene states that persists even when scrolling past scenes
  // Required for ImageScene captions to remember their state after scrolling past
  useEffect(() => {
    const currentNavItem = navigationArray[navigationIndex];
    if (!currentNavItem) {
      console.log('[ScrollControl] ⚠️ No current navigation item at index', navigationIndex);
      return;
    }

    const { sceneId, sceneState } = currentNavItem;
    console.log('[ScrollControl] 🔄 Updating SceneStates for sceneId:', sceneId, 'state:', sceneState);
    sceneStates.updateSceneState(sceneId, sceneState);
  }, [navigationIndex, navigationArray, sceneStates]);

  // Check if input is focused
  const isInputFocused = useCallback(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return false;
    const tag = a.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || a.isContentEditable;
  }, []);

  // Pure gesture detection - emits direction, SceneManager handles navigation
  useStepScroll(containerRef, {
    onNavigate: advanceNavigation, // Direct connection to SceneManager!
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

  // Focus management for accessibility
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const node = el.querySelectorAll<HTMLElement>('.scene')[currentIndex];
    if (!node) return;
    node.setAttribute('tabindex', '-1');
    node.focus({ preventScroll: true });
  }, [currentIndex]);

  // Merge default styles with user styles
  const containerStyle: React.CSSProperties = {
    height: '100vh',
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
