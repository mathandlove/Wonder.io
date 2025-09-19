/**
 * Hook that encapsulates scroll offset management, programmatic scroll control,
 * and synchronization with NavigationContext.
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
    targetIndex
  };
}