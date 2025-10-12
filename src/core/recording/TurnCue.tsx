import React from 'react';
import './Chat.css';

interface TurnCueProps {
  visible: boolean;
  message?: string;
}

export const TurnCue: React.FC<TurnCueProps> = ({ visible, message = "Your turn!" }) => {
  if (!visible) return null;

  return (
    <div className="turn-cue">
      <div className="turn-cue-content">
        <span className="turn-cue-icon">💬</span>
        <span className="turn-cue-text">{message}</span>
      </div>
    </div>
  );
};