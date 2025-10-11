/**
 * Simple input scene placeholder.
 * Chat functionality is now handled by the global ChatOrchestrator.
 */
import React from 'react';
import type { SceneProps } from '../registry';
import type { InputScene } from '../../types/scene';

export default function InputScene({ scene, onComplete, sceneIndex }: SceneProps<InputScene>) {
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
        data-lock-forward="true"
      >
      </div>
    </>
  );
}