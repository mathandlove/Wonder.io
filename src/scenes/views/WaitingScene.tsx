/**
 * Displays waiting states that require user interaction to continue.
 * Shows a dashed border box with continue button.
 */
import React from "react";
import type { SceneProps } from "../registry";
import type { WaitingScene } from "../../types/scene";

export default function WaitingScene({ scene, onComplete }: SceneProps<WaitingScene>) {
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
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '3rem',
        borderRadius: '16px',
        textAlign: 'center',
        border: '3px dashed #666',
        maxWidth: '500px'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>Waiting State</h3>
        <p style={{ color: '#666', marginBottom: '2rem' }}>User interaction required</p>
        <button
          onClick={onComplete}
          style={{
            padding: '12px 24px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}