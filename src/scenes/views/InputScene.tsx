/**
 * Simple input scene placeholder.
 * Chat functionality is now handled by the global ChatOrchestrator.
 */
import React from 'react';
import type { SceneProps } from '../registry';
import type { InputScene } from '../../types/scene';
import { useDialogue } from '../../chat/ChatDialogueContext';

export default function InputScene({ scene, onComplete, sceneIndex }: SceneProps<InputScene>) {
  const { isPlayerTurn, waiting, questState } = useDialogue();

  // Lock forward scroll when:
  // - Player turn is active (input needed)
  // - System is waiting for response
  // - Quest is not complete
  const shouldLockForward = isPlayerTurn || waiting || questState === 'active';

  return (
    <>
      {/* Empty scene - characters rendered by CharacterOrchestrator */}
      {/* Chat UI handled by global ChatOrchestrator */}
      <div
        style={{
          height: '100vh',
          width: '100%',
          position: 'relative'
        }}
        data-lock-forward={shouldLockForward ? 'true' : undefined}
      >
      </div>
    </>
  );
}