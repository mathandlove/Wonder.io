/**
 * Displays input prompts that require text entry from the user.
 * Shows a form with text input and submit button.
 */
import React, { useState } from "react";
import type { SceneProps } from "../registry";
import type { InputScene } from "../../types/scene";

export default function InputScene({ scene, onComplete }: SceneProps<InputScene>) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onComplete?.();
    }
  };

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
        maxWidth: '600px',
        width: '100%'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💭</div>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>Input Required</h3>
        {scene.text && (
          <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
            {scene.text}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your response..."
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '1rem',
              border: '2px solid #ddd',
              borderRadius: '8px',
              marginBottom: '1rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            style={{
              padding: '12px 24px',
              background: input.trim() ? '#28a745' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: input.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}