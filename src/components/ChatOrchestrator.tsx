/**
 * ChatOrchestrator monitors the current scene and shows the chat UI
 * when the scene has lastInFlow property, allowing input on any
 * scene that's the last in a character flow.
 */
import React, { useEffect, useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useDialogue as useChatDialogue } from '../chat/ChatDialogueContext';
import { ChatLayer } from '../chat/ChatLayer';

export const ChatOrchestrator: React.FC = () => {
  const { currentIndex, scenes } = useNavigation();
  const { grantPlayerTurn, questState } = useChatDialogue();
  const [chatVisible, setChatVisible] = useState(false);
  const [hasGrantedTurn, setHasGrantedTurn] = useState(false);
  const [lastProcessedIndex, setLastProcessedIndex] = useState(-1);

  // Get current scene
  const currentScene = scenes[currentIndex];
  const shouldShowChat = (currentScene as any)?.lastInFlow || (currentScene as any)?.type === 'input';

  // Grant player turn when we navigate to a lastInFlow scene
  useEffect(() => {
    // Reset when navigating to a different scene
    if (currentIndex !== lastProcessedIndex) {
      setHasGrantedTurn(false);
      setChatVisible(false);
      setLastProcessedIndex(currentIndex);
    }

    if (shouldShowChat && !hasGrantedTurn) {
      // Grant player turn for this scene
      grantPlayerTurn(`flow-${currentIndex}`);
      setChatVisible(true);
      setHasGrantedTurn(true);
    } else if (!shouldShowChat && hasGrantedTurn) {
      // Hide chat if we're no longer on a lastInFlow scene
      setChatVisible(false);
      setHasGrantedTurn(false);
    }
  }, [currentIndex, shouldShowChat, hasGrantedTurn, grantPlayerTurn, lastProcessedIndex]);

  // Monitor quest completion
  useEffect(() => {
    if (questState === 'complete' && hasGrantedTurn) {
      // Scene complete - can be handled by navigation system
      setChatVisible(false);
      setHasGrantedTurn(false);
    }
  }, [questState, hasGrantedTurn]);

  const handleChatHide = () => {
    setChatVisible(false);
    setHasGrantedTurn(false);
  };

  // Only render if we should show chat
  if (!shouldShowChat) return null;

  return (
    <ChatLayer
      visible={chatVisible}
      sceneIndex={currentIndex}
      onHide={handleChatHide}
    />
  );
};