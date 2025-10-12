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
import { useImageState } from '@features/image-scene/ImageStateContext';
import { useSceneOrchestrator } from '../scenes/useSceneOrchestrator';
import { SceneOrchestratorProvider } from '../scenes/SceneOrchestratorContext';
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

  // Get navigation from SceneManager
  const sceneManager = useSceneManager();
  const { advanceNavigation, navigationIndex, navigationArray } = sceneManager;

  // Get image state for caption management
  const imageState = useImageState();

  // Scene orchestrator for input scene runtime state management
  const sceneOrchestrator = useSceneOrchestrator({
    scenes,
    currentIndex: navigationIndex,
  });

  // Check if input is focused
  const isInputFocused = useCallback(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return false;
    const tag = a.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || a.isContentEditable;
  }, []);

  // Watch navigationIndex and trigger state transitions
  useEffect(() => {
    const currentNavItem = navigationArray[navigationIndex];
    if (!currentNavItem) return;

    const { sceneId, scene, sceneState } = currentNavItem;

    // Handle image caption transitions
    if (sceneState.type === 'image' && sceneState.state === 'hidden') {
      const imageScene = scene as Scene & { caption?: string; text?: string };
      const captionText = imageScene.caption || imageScene.text;

      if (captionText && captionText.trim()) {
        // Transition from hidden → showing
        imageState.setImageState(sceneId, 'showing');
        console.log(`📸 Caption transition: ${sceneId} hidden → showing`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationIndex, navigationArray, imageState.setImageState]);

  // Pure gesture detection - emits direction, SceneManager handles navigation
  useStepScroll(containerRef, {
    onNavigate: advanceNavigation, // Direct connection to SceneManager!
    thresholdPx: scrollConfig.thresholdPx ?? 60,
    isInputFocused,
  });

  // Watch for scene index changes and perform scroll animations
  // (Scene index changes when navigation advances to a different physical scene)
  const prevSceneIndexRef = React.useRef(currentIndex);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Only scroll if scene changed (not just state within same scene)
    if (currentIndex !== prevSceneIndexRef.current) {
      const section = el.querySelectorAll<HTMLElement>('.scene')[currentIndex];
      if (section) {
        console.log(`📜 Scrolling to scene ${currentIndex}`);
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      prevSceneIndexRef.current = currentIndex;
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
