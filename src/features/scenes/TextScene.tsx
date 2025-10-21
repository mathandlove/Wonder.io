/**
 * TextScene Component
 * Displays simple text scenes with optional character and background
 */
import React from 'react';
import type { TextScene } from '@core/types/scene';
import type { SceneProps } from './registry';

export default function TextScene({ scene }: SceneProps<TextScene>) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        background: scene.background || 'transparent',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          fontSize: '1.5rem',
          lineHeight: '1.8',
          textAlign: 'center',
          color: '#333',
        }}
      >
        {scene.text}
      </div>
    </div>
  );
}
