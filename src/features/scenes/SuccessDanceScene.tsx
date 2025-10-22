/**
 * SuccessDanceScene - Empty transparent scene for correct answers
 *
 * This scene provides a transparent container that allows the CharacterOrchestrator
 * to handle character animations for success states. The scene itself renders nothing,
 * delegating all visual feedback to the character panel system.
 *
 * Lifecycle:
 * 1. Scene is inserted into navigation after answer-right state
 * 2. CharacterOrchestrator detects success-dance scene type and triggers jiggle animations
 * 3. When both character panels complete jiggling (~1.5s):
 *    a. Wait 100ms
 *    b. Auto-navigate forward to next scene (FIRST)
 *    c. Schedule deletion of success-dance scene (SECOND - after navigation)
 * 4. Scene auto-deletes either:
 *    - After 3 seconds (timer-based cleanup)
 *    - OR on next user navigation (triggers processPendingDeletions)
 * 5. User sees seamless transition: jiggle → auto-scroll to next scene → cleanup in background
 */

import { useEffect, useRef } from 'react';
import { useCharacterAnimation } from '@features/characters/CharacterAnimationContext';
import { useSceneManager } from '@core/scenes/SceneManager';

export default function SuccessDanceScene() {
  const { addEventListener, removeEventListener } = useCharacterAnimation();
  const { deleteNavigationItem, forceAdvanceNavigation, navigationIndex } = useSceneManager();
  const hasNavigatedRef = useRef(false);

  // Listen for both character panels to complete their jiggle animations
  useEffect(() => {
    const handleJiggleComplete = (sceneIndex: number) => {
      // Only act if this event is for OUR scene index and we haven't already navigated
      if (sceneIndex === navigationIndex && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;

        console.log('[SuccessDance] 🎊 Both panels finished jiggling, navigating forward and scheduling deletion');
        const currentIndex = navigationIndex;

        // IMPORTANT: Navigate FIRST, then schedule deletion
        // forceAdvanceNavigation processes pending deletions at the start,
        // so we need to navigate before the deletion is scheduled
        setTimeout(() => {
          console.log('[SuccessDance] ➡️  Auto-navigating to next scene');
          forceAdvanceNavigation('forward');

          // Now that we've navigated away, schedule deletion of the success-dance scene
          // This will delete in 3 seconds OR on the next user navigation (whichever comes first)
          console.log('[SuccessDance] 🗑️  Scheduling deletion of index', currentIndex);
          deleteNavigationItem(currentIndex);
        }, 100);
      }
    };

    addEventListener('jiggle-complete', handleJiggleComplete);

    return () => {
      removeEventListener('jiggle-complete', handleJiggleComplete);
    };
  }, [navigationIndex, addEventListener, removeEventListener, deleteNavigationItem, forceAdvanceNavigation]);

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      position: 'relative',
      overflow: 'hidden',
      pointerEvents: 'none', // Let clicks pass through
      background: 'transparent' // Transparent so characters underneath show through
    }}>
      {/* Empty scene - CharacterOrchestrator handles all animations */}
    </div>
  );
}
