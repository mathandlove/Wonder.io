import React, { useState, useEffect, useRef } from 'react';
import { ChatComposer } from './ChatComposer';
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
  const waitingLockTokenRef = useRef<symbol | null>(null);

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
  }, [isPlayerTurn, questState, visible, sceneIndex]);

  // Lock all scrolling when waiting for AI response
  useEffect(() => {
    if (waiting && visible) {
      if (!waitingLockTokenRef.current) {
        // Lock both forward and backward scrolling during AI processing
        waitingLockTokenRef.current = scrollGuard.lockBoth();
        console.log('[CHAT_LAYER] Locking all scrolling - waiting for AI');
      }
    } else {
      if (waitingLockTokenRef.current) {
        scrollGuard.clear(waitingLockTokenRef.current);
        waitingLockTokenRef.current = null;
        console.log('[CHAT_LAYER] Unlocking scrolling - AI response received');
      }
    }

    // Cleanup on unmount
    return () => {
      if (waitingLockTokenRef.current) {
        scrollGuard.clear(waitingLockTokenRef.current);
        waitingLockTokenRef.current = null;
      }
    };
  }, [waiting, visible, scrollGuard]);

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

  // Always render but control visibility with CSS to prevent flashing
  console.log('[CHAT_LAYER] Rendering with visible:', visible, 'className:', `chat-layer ${visible ? 'visible' : 'hidden'}`);

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