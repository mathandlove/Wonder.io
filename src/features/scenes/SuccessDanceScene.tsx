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
import { forceAdvanceNavigation, deleteNode, getCurrentNodeId } from '@core/navigation/navigationHelpers';

export default function SuccessDanceScene() {
  const { addEventListener, removeEventListener } = useCharacterAnimation();
  const hasNavigatedRef = useRef(false);
  const currentNodeId = getCurrentNodeId();

  // Listen for both character panels to complete their jiggle animations
  useEffect(() => {
    const handleJiggleComplete = () => {
      // Only navigate once
      if (!hasNavigatedRef.current && currentNodeId) {
        hasNavigatedRef.current = true;

        const successDanceNodeId = currentNodeId;

        // Navigate forward after jiggle completes, then delete this temporary scene
        setTimeout(() => {
          forceAdvanceNavigation('forward');

          // Delete the success-dance node after navigating away
          setTimeout(() => {
            deleteNode(successDanceNodeId);
          }, 50);
        }, 100);
      }
    };

    addEventListener('jiggle-complete', handleJiggleComplete);

    return () => {
      removeEventListener('jiggle-complete', handleJiggleComplete);
    };
  }, [addEventListener, removeEventListener, currentNodeId]);

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
