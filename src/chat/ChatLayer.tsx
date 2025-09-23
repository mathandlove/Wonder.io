import React, { useState, useEffect, useRef } from 'react';
import { ChatComposer } from './ChatComposer';
import { TurnCue } from './TurnCue';
import { AdvanceBar } from './AdvanceBar';
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
    submitPlayerUtterance,
    suggestions
  } = useDialogue();

  const { next } = useNavigation();
  const scrollGuard = useScrollGuardAPI();
  const [showTurnCue, setShowTurnCue] = useState(false);
  const [exitingChat, setExitingChat] = useState(false);
  const turnCueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lockTokenRef = useRef<symbol | null>(null);

  // Show turn cue briefly when it becomes player's turn
  useEffect(() => {
    if (isPlayerTurn && visible) {
      setShowTurnCue(true);
      if (turnCueTimeoutRef.current) {
        clearTimeout(turnCueTimeoutRef.current);
      }
      turnCueTimeoutRef.current = setTimeout(() => {
        setShowTurnCue(false);
      }, 2000); // Show for 2 seconds
    }

    return () => {
      if (turnCueTimeoutRef.current) {
        clearTimeout(turnCueTimeoutRef.current);
      }
    };
  }, [isPlayerTurn, visible]);

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
      {/* Turn cue overlay */}
      <TurnCue visible={showTurnCue} />

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