/**
 * ChatOrchestrator monitors the current scene and shows the chat UI
 * when the scene has lastInFlow property, allowing input on any
 * scene that's the last in a character flow.
 */
import React, { useEffect, useState } from 'react";
import { useNavigation } from '../../context/NavigationContext";
import { useDialogue as useChatDialogue } from '../context/ChatDialogueContext";
import { ChatLayer } from '../ChatLayer";
import type { Scene } from '../../types/scene";

// Extended scene type that includes the dynamically added lastInFlow property
type SceneWithLastInFlow = Scene & {
  lastInFlow?: boolean;
  sceneId?: string;
};

export const ChatOrchestrator: React.FC = () => {
  const { currentIndex, scenes } = useNavigation();
  const { grantPlayerTurn, questState } = useChatDialogue();
  const [chatVisible, setChatVisible] = useState(false);
  const [hasGrantedTurn, setHasGrantedTurn] = useState(false);
  const [lastProcessedIndex, setLastProcessedIndex] = useState(-1);


  // Get current scene
  const currentScene = scenes[currentIndex] as SceneWithLastInFlow | undefined;
  const shouldShowChat = currentScene?.lastInFlow;

  // Use the corrected shouldShowChat logic
  const shouldShowChatFinal = shouldShowChat;


  // Grant player turn when we navigate to a lastInFlow scene
  useEffect(() => {
    // Force scene change processing if shouldShowChatFinal changed from false to true
    // This handles cases where the same scene becomes lastInFlow due to scene hiding
    const shouldForceProcessing = shouldShowChatFinal && !chatVisible && !hasGrantedTurn;

    // Check if we're changing to a different scene (index OR scene content changed)
    const currentSceneId = currentScene?.sceneId;
    const lastSceneId = (scenes[lastProcessedIndex] as SceneWithLastInFlow | undefined)?.sceneId;
    const indexChanged = currentIndex !== lastProcessedIndex;
    const sceneChanged = currentSceneId !== lastSceneId;
    const hasSceneChanged = indexChanged || sceneChanged || shouldForceProcessing;


    if (hasSceneChanged) {
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
  }, [currentIndex, shouldShowChatFinal, hasGrantedTurn, grantPlayerTurn, lastProcessedIndex, currentScene, scenes, chatVisible]);

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