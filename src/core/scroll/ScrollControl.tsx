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
  onIndexChange,
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
  // This keeps a persistent cache of scene states that survives navigation
  // Note: We deliberately don't include navigationArray in dependencies to avoid loops
  // when the array is modified. We only care about the current index changing.
  useEffect(() => {
    const currentNavItem = navigationArray[navigationIndex];
    if (!currentNavItem) return;

    const { sceneId, sceneState } = currentNavItem;
    sceneStates.updateSceneState(sceneId, sceneState);

    console.log(`🗃️ SceneStates updated: ${sceneId} -> ${sceneState.type}${sceneState.type === 'image' ? `:${sceneState.state}` : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationIndex, sceneStates.updateSceneState]);

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
        // Use instant scroll when going backward (e.g., cancelling recording)
        // to prevent visual glitches during DOM restructuring
        const isGoingBackward = currentIndex < prevSceneIndexRef.current;
        const behavior = isGoingBackward ? 'auto' : 'smooth';

        console.log(`📜 Scrolling to scene ${currentIndex} (from ${prevSceneIndexRef.current}) - ${behavior}`);
        section.scrollIntoView({ behavior, block: 'start' });
      }
      prevSceneIndexRef.current = currentIndex;
    } else {
      console.log(`📜 Skip scroll - same scene index ${currentIndex}`);
    }
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
