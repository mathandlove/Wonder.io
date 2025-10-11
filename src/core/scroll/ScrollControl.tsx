/**
 * ScrollControl - Unified scroll management component
 *
 * Encapsulates all scroll behavior including:
 * - One-scene-at-a-time step scrolling (useStepScroll)
 * - Content-based scroll locking (useContentLocks)
 * - Scene transition events
 * - Caption triggering and dismissal
 *
 * This component hides implementation details and provides a clean API
 * for controlled scrolling through story scenes.
 */
import React, { useRef, useCallback, useLayoutEffect } from 'react';
import type { Scene } from '@core/types/scene';
import { useStepScroll } from './useStepScroll';
import { useContentLocks } from './useContentLocks';
import { useSceneOrchestrator } from './useSceneOrchestrator';
import { SceneOrchestratorProvider } from './SceneOrchestratorContext';

export interface ScrollControlProps {
  // Core scene management
  scenes: Scene[];
  currentIndex: number;
  onIndexChange: (index: number) => void;

  // Content lock state (for input/quest scenes)
  isPlayerTurn?: boolean;
  waiting?: boolean;
  questState?: 'idle' | 'active' | 'completed' | 'complete' | 'failed';

  // Optional scroll configuration
  scrollConfig?: {
    thresholdPx?: number;
    durationMs?: number;
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
  isPlayerTurn = false,
  waiting = false,
  questState = 'idle',
  scrollConfig = {},
  children,
  className = 'scroll-control',
  style = {},
}: ScrollControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Get index from scroll position
  const getIndex = useCallback(() => {
    const el = containerRef.current;
    if (!el) return 0;
    const y = el.scrollTop;
    let best = 0;
    let bestDist = Infinity;
    const sections = el.querySelectorAll<HTMLElement>('.scene');
    sections.forEach((s, i) => {
      const dist = Math.abs(s.offsetTop - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }, []);

  // Check if input is focused
  const isInputFocused = useCallback(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return false;
    const tag = a.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || a.isContentEditable;
  }, []);

  // Scene orchestrator - manages runtime state for scenes
  const sceneOrchestrator = useSceneOrchestrator({
    scenes,
    currentIndex,
  });

  // Content locking system
  const { checkContentLocks } = useContentLocks({
    scenes,
    isPlayerTurn,
    waiting,
    questState,
    getCaptionState: sceneOrchestrator.getCaptionState,
  });

  // Step scroll system
  useStepScroll(containerRef, {
    onIndexChange,
    getIndex,
    count: () => scenes.length,
    durationMs: scrollConfig.durationMs ?? 380,
    thresholdPx: scrollConfig.thresholdPx ?? 60,
    isInputFocused,
    checkContentLocks,
  });

  // Watch for external currentIndex changes (programmatic navigation)
  // and scroll to that index
  const prevIndexRef = React.useRef(currentIndex);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Only scroll if index changed externally (not from our own scroll events)
    if (currentIndex !== prevIndexRef.current) {
      const section = el.querySelectorAll<HTMLElement>('.scene')[currentIndex];
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      prevIndexRef.current = currentIndex;
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
