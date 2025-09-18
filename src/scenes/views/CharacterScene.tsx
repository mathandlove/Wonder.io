/**
 * Displays character dialogue scenes with speaker identification.
 * Shows text in a speech bubble with character name and background.
 */
import React from "react";
import type { SceneProps } from "../registry";
import type { CharacterScene } from "../../types/scene";

export default function CharacterScene({ scene }: SceneProps<CharacterScene>) {
  // TODO: mount your BubbleSystem here using scene.speaker, scene.text, background, etc.
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: scene.background ? `url(/stories/gingerbread.bundle/images/backgrounds/${scene.background})` : '#f0f0f0',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '2rem',
        borderRadius: '12px',
        maxWidth: '600px',
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>
          {scene.speaker === 'left' ? (scene["left-character"] || 'Left') :
           scene.speaker === 'right' ? (scene["right-character"] || 'Right') :
           'Narrator'}
        </h3>
        <p style={{ fontSize: '1.2rem', lineHeight: '1.6', color: '#555' }}>
          {scene.text}
        </p>
      </div>
    </div>
  );
}