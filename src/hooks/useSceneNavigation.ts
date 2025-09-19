/**
 * Hook that handles updating NavigationContext when story changes.
 * Manages the synchronization between loaded story scenes and navigation state.
 */
import { useEffect } from 'react';
import type { Scene } from '../types/scene';

interface UseSceneNavigationProps {
  initialScenes: Scene[];
  setScenes: (scenes: Scene[]) => void;
}

export function useSceneNavigation({
  initialScenes,
  setScenes
}: UseSceneNavigationProps) {
  // Update navigation context when initial scenes change
  useEffect(() => {
    setScenes(initialScenes);
  }, [initialScenes, setScenes]);
}