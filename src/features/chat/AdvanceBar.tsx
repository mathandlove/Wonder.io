import React from 'react";
import './Chat.css";

interface AdvanceBarProps {
  canAdvance: boolean;
  onNext: () => void;
  onKeepChatting: () => void;
}

export const AdvanceBar: React.FC<AdvanceBarProps> = ({
  canAdvance,
  onNext,
  onKeepChatting
}) => {
  return (
    <button
      className={`chat-continue-button ${canAdvance ? 'enabled' : 'disabled'}`}
      onClick={canAdvance ? onNext : undefined}
      disabled={!canAdvance}
      title={canAdvance ? "Continue to next scene" : "Complete the quest first"}
    >
      Continue
    </button>
  );
};