/**
 * Displays input prompts that require text entry from the user.
 * Shows a form with text input and submit button.
 */
import React, { useState } from "react";
import type { SceneProps } from "../registry";
import type { InputScene } from "../../types/scene";
import { useDialogue } from "../../context/DialogueContext";

export default function InputScene({ scene, onComplete }: SceneProps<InputScene>) {
  const [input, setInput] = useState("Hi, this input text is working hopefully.");
  const { submitUserMessage } = useDialogue();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (input.trim()) {
      // Submit the user message to dialogue context
      submitUserMessage(input);

      // Clear the input
      setInput("");

      // Note: onComplete is not called here because PageFactory handles navigation automatically
      // when it detects new user text from submitUserMessage
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      {/* Input form overlay - positioned to not block characters */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '2rem',
        borderRadius: '16px',
        textAlign: 'center',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        zIndex: 10
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💭</div>
        {scene.text && (
          <p style={{ fontSize: '1rem', color: '#555', marginBottom: '1.5rem', margin: '0 0 1.5rem 0' }}>
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
              outline: 'none',
              boxSizing: 'border-box'
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

      {/* Empty scroll target - characters rendered by CharacterOrchestrator */}
    </div>
  );
}