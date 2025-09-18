/**
 * Displays quest prompts with golden styling and accept button.
 * Used for key story moments that require player acknowledgment.
 */
import React from "react";
import type { SceneProps } from "../registry";
import type { QuestScene } from "../../types/scene";

export default function QuestScene({ scene, onComplete }: SceneProps<QuestScene>) {
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
        background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
        padding: '3rem',
        borderRadius: '16px',
        textAlign: 'center',
        border: '3px solid #d4a700',
        maxWidth: '600px',
        boxShadow: '0 8px 24px rgba(212, 167, 0, 0.3)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>Quest</h3>
        <p style={{ fontSize: '1.2rem', lineHeight: '1.6', color: '#555', marginBottom: '2rem' }}>
          {scene.text}
        </p>
        <button
          onClick={onComplete}
          style={{
            padding: '12px 24px',
            background: '#d4a700',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          Accept Quest
        </button>
      </div>
    </div>
  );
}