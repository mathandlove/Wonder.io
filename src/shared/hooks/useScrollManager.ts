/**
 * Hook that encapsulates scroll offset management and synchronization with NavigationContext.
 *
 * NOTE: This hook is legacy and only used as a fallback in CharacterOrchestrator.
 * New code should use ScrollControl component instead.
 */
import { useEffect, useRef } from 'react';
import { useScrollOffset } from './useScrollOffset';

interface UseScrollManagerProps {
  setCurrentIndex: (index: number) => void;
}

export function useScrollManager({ setCurrentIndex }: UseScrollManagerProps) {
  // Multi-layered scroll architecture
  const railRef = useRef<HTMLDivElement>(null);
  const { index, setIsProgrammatic } = useScrollOffset(railRef);

  // Temporarily disable magnetic scroller to test pure CSS snap
  // const { targetIndex } = useMagneticScroller({ railRef, index, offset, isProgrammatic });
  const targetIndex = undefined;

  // Keep NavigationContext up-to-date with rail scroll index
  useEffect(() => {
    setCurrentIndex(index);
  }, [index, setCurrentIndex]);

  return {
    railRef,
    index,
    setIsProgrammatic,
    targetIndex,
  };
}