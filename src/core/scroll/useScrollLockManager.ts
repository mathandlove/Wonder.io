/**
 * useScrollLockManager - Manages scroll lock state based on scene type and navigation context
 *
 * This hook determines when scrolling should be locked based on the current scene
 * and integrates with the navigation system to provide scroll lock for interactive scenes.
 */
import { useEffect, useMemo, useState } from 'react';
import { useScrollLock } from './useScrollLock';
import { useNavigation } from '@core/navigation/NavigationContext';

export function useScrollLockManager() {
  const { visibleScenes, currentIndex } = useNavigation();
  const [unlockAttempts, setUnlockAttempts] = useState(0);

  // Determine if the current scene should have scroll lock
  const scrollLockState = useMemo(() => {
    const currentScene = visibleScenes[currentIndex];
    if (!currentScene) {
      return { shouldLock: false, lockedPosition: 0 };
    }

    // For now, lock scrolling on all interactive-bubble scenes
    // TODO: Integrate with dialogue context to check message states
    if (currentScene.type === 'interactive-bubble') {
      const lockedPosition = currentIndex * window.innerHeight;
      return { shouldLock: true, lockedPosition };
    }

    return { shouldLock: false, lockedPosition: 0 };
  }, [visibleScenes, currentIndex]);

  // Handle unlock attempts - user trying to scroll while locked
  const handleUnlockRequest = () => {
    setUnlockAttempts(prev => prev + 1);

    // Provide user feedback after multiple attempts
    if (unlockAttempts >= 2) {
      const currentScene = visibleScenes[currentIndex];
      if (currentScene?.type === 'interactive-bubble') {
        // TODO: Show visual indicator that scroll is locked
      }
    }

    // Reset attempts after a delay
    setTimeout(() => {
      setUnlockAttempts(0);
    }, 3000);
  };

  // Use the scroll lock hook
  const { forceScrollPosition, isScrollLocked } = useScrollLock({
    isLocked: scrollLockState.shouldLock,
    lockedPosition: scrollLockState.lockedPosition,
    onUnlockRequest: handleUnlockRequest
  });

  // Reset unlock attempts when scene changes
  useEffect(() => {
    setUnlockAttempts(0);
  }, [currentIndex]);



  return {
    isScrollLocked,
    unlockAttempts,
    currentScene: visibleScenes[currentIndex],
    forceScrollPosition
  };
}