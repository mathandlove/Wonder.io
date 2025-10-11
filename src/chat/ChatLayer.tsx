import React, { useState, useEffect, useRef } from 'react';
import { ChatComposer } from './ChatComposer';
import TurnCueBanner from './components/TurnCueBanner';
import { useDialogue } from './context/ChatDialogueContext';
import { useNavigation } from '../context/NavigationContext';
import './Chat.css';

interface ChatLayerProps {
  visible: boolean;
  sceneIndex: number; // Index of the scene where chat is active
  onHide?: () => void;
}

export const ChatLayer: React.FC<ChatLayerProps> = ({ visible, sceneIndex, onHide }) => {
  const {
    isPlayerTurn,
    waiting,
    questState,
    showTurnBanner,
    turnBannerText,
    submitPlayerUtterance,
    suggestions
  } = useDialogue();

  const { goToNext } = useNavigation();
  const [exitingChat, setExitingChat] = useState(false);


  const handleContinue = () => {
    setExitingChat(true);

    // Animate out, then navigate
    setTimeout(() => {
      goToNext();
      if (onHide) {
        onHide();
      }
    }, 600); // Match animation duration
  };

  const handleKeepChatting = () => {
    // For future implementation - allow player to continue chatting
  };

  // Always render but control visibility with CSS to prevent flashing

  return (
    <div className={`chat-layer ${visible ? 'visible' : 'hidden'}`}>
      {/* Turn cue banner above composer */}
      <TurnCueBanner show={showTurnBanner} text={turnBannerText} />

      {/* Chat composer with integrated next button */}
      <div className={`chat-composer-container ${exitingChat ? 'exit-bottom' : ''}`}>
        <ChatComposer
          disabled={!isPlayerTurn || waiting}
          questState={questState}
          onNext={handleContinue}
        />
      </div>
    </div>
  );
};