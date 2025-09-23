import React, { useState, useEffect, useRef } from 'react';
import { ChatComposer } from './ChatComposer';
import { AdvanceBar } from './AdvanceBar';
import TurnCueBanner from '../components/chat/TurnCueBanner';
import { useDialogue } from './ChatDialogueContext';
import { useNavigation } from '../context/NavigationContext';
import { useScrollGuardAPI } from '../context/ScrollGuardContext';
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

  const { next } = useNavigation();
  const scrollGuard = useScrollGuardAPI();
  const [exitingChat, setExitingChat] = useState(false);
  const lockTokenRef = useRef<symbol | null>(null);

  // Lock forward scrolling at this scene when it's player's turn
  useEffect(() => {
    if (isPlayerTurn && visible) {
      if (!lockTokenRef.current) {
        // Lock forward scrolling FROM this input scene
        // This allows scrolling TO the input scene but not FROM it
        lockTokenRef.current = scrollGuard.lockForwardAt(sceneIndex);
      }
    } else if (questState === 'complete' || !visible) {
      if (lockTokenRef.current) {
        scrollGuard.clear(lockTokenRef.current);
        lockTokenRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (lockTokenRef.current) {
        scrollGuard.clear(lockTokenRef.current);
        lockTokenRef.current = null;
      }
    };
  }, [isPlayerTurn, questState, visible, scrollGuard, sceneIndex]);

  const handleContinue = () => {
    setExitingChat(true);
    if (lockTokenRef.current) {
      scrollGuard.clear(lockTokenRef.current);
      lockTokenRef.current = null;
    }

    // Animate out, then navigate
    setTimeout(() => {
      next();
      if (onHide) {
        onHide();
      }
    }, 600); // Match animation duration
  };

  const handleKeepChatting = () => {
    // For future implementation - allow player to continue chatting
    console.log('Keep chatting not yet implemented');
  };

  if (!visible) return null;

  return (
    <>
      {/* Turn cue banner above composer */}
      <TurnCueBanner show={showTurnBanner} text={turnBannerText} />

      {/* Chat composer with advance bar */}
      <div className={`chat-composer-container ${exitingChat ? 'exit-bottom' : ''}`}>
        <ChatComposer
          disabled={!isPlayerTurn || waiting}
          onSubmit={submitPlayerUtterance}
          suggestions={suggestions}
        />
        <AdvanceBar
          canAdvance={questState === 'complete'}
          onNext={handleContinue}
          onKeepChatting={handleKeepChatting}
        />
      </div>
    </>
  );
};