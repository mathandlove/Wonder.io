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
import { getCurrentNodeId } from '@core/navigation/navigationHelpers';
import { emit } from '@core/navigation/events/navigationBus';

export default function SuccessDanceScene() {
  const { addEventListener, removeEventListener } = useCharacterAnimation();
  const hasEmittedEventRef = useRef(false);
  const currentNodeId = getCurrentNodeId();

  console.log('[SuccessDanceScene] 🎬 Mounted with currentNodeId:', currentNodeId);

  // Listen for both character panels to complete their jiggle animations
  useEffect(() => {
    console.log('[SuccessDanceScene] 👂 Registering jiggle-complete listener');

    const handleJiggleComplete = () => {
      console.log('[SuccessDanceScene] 🎊 Received jiggle-complete event!', {
        hasEmittedEvent: hasEmittedEventRef.current,
        currentNodeId
      });

      // Only emit event once
      if (!hasEmittedEventRef.current && currentNodeId) {
        hasEmittedEventRef.current = true;

        console.log('[SuccessDanceScene] ✅ Jiggle complete - emitting VIDEO_COMPLETE event');

        // Emit VIDEO_COMPLETE event to navigation machine
        // The machine will handle navigation forward and deletion of this scene
        emit({
          type: 'VIDEO_COMPLETE',
          nodeId: currentNodeId,
          videoType: 'success-dance'
        });
      }
    };

    addEventListener('jiggle-complete', handleJiggleComplete);

    return () => {
      console.log('[SuccessDanceScene] 🔇 Removing jiggle-complete listener');
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
