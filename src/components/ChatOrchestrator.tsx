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

  console.log('[CHAT_ORCHESTRATOR] Component mounted/rendered, scenes.length:', scenes.length, 'currentIndex:', currentIndex);

  // Get current scene
  const currentScene = scenes[currentIndex];
  const shouldShowChat = (currentScene as any)?.lastInFlow;

  // Use the corrected shouldShowChat logic
  const shouldShowChatFinal = shouldShowChat;

  // Debug logging - only log when relevant
  if (currentScene?.type === 'input' || shouldShowChat || chatVisible) {
    console.log('[CHAT_DEBUG] Scene:', currentIndex, 'type:', currentScene?.type, 'lastInFlow:', shouldShowChat, 'chatVisible:', chatVisible);
  }

  // Grant player turn when we navigate to a lastInFlow scene
  useEffect(() => {
    // Only update if we're actually changing to a different scene
    if (currentIndex !== lastProcessedIndex) {
      setLastProcessedIndex(currentIndex);

      // Coordinate all state changes together to prevent flashing
      if (shouldShowChatFinal) {
        // New scene needs chat - grant turn if needed and show
        if (!hasGrantedTurn) {
          grantPlayerTurn(`flow-${currentIndex}`);
          setHasGrantedTurn(true);
        }
        setChatVisible(true);
      } else {
        // New scene doesn't need chat - hide and reset
        setChatVisible(false);
        setHasGrantedTurn(false);
      }
    }
  }, [currentIndex, shouldShowChatFinal, hasGrantedTurn, grantPlayerTurn, lastProcessedIndex]);

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

  // Always render ChatLayer to prevent unmounting/remounting flashes
  return (
    <ChatLayer
      visible={chatVisible}
      sceneIndex={currentIndex}
      onHide={handleChatHide}
    />
  );
};