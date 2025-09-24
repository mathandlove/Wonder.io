/**
 * Hook that encapsulates scroll offset management, programmatic scroll control,
 * scroll lock management, and synchronization with NavigationContext.
 */
import { useEffect, useRef } from 'react';
import { useScrollOffset } from './useScrollOffset';
import { useScrollLockManager } from './useScrollLockManager';

interface UseScrollManagerProps {
  setCurrentIndex: (index: number) => void;
}

export function useScrollManager({ setCurrentIndex }: UseScrollManagerProps) {
  // Multi-layered scroll architecture
  const railRef = useRef<HTMLDivElement>(null);
  const { index, setIsProgrammatic } = useScrollOffset(railRef);

  // Scroll lock management for interactive scenes
  const { isScrollLocked, unlockAttempts, currentScene } = useScrollLockManager();

  // Temporarily disable magnetic scroller to test pure CSS snap
  // const { targetIndex } = useMagneticScroller({ railRef, index, offset, isProgrammatic });
  const targetIndex = undefined;

  // Keep NavigationContext up-to-date with rail scroll index
  useEffect(() => {
    setCurrentIndex(index);
  }, [index, setCurrentIndex]);

  // Log scroll lock state for debugging
  useEffect(() => {
    if (isScrollLocked && unlockAttempts > 0) {
    }
  }, [isScrollLocked, unlockAttempts, index]);

  return {
    railRef,
    index,
    setIsProgrammatic,
    targetIndex,
    isScrollLocked,
    unlockAttempts,
    currentScene
  };
}