/**
 * Interactive input scene that triggers the chat dialogue system.
 * Shows empty scene while chat UI handles interaction.
 */
import React, { useEffect, useState } from 'react';
import type { SceneProps } from '../registry';
import type { InputScene } from '../../types/scene';
import { useDialogue as useChatDialogue } from '../../chat/ChatDialogueContext';
import { ChatLayer } from '../../chat/ChatLayer';
import { useNavigation } from '../../context/NavigationContext';

export default function InputScene({ scene, onComplete, sceneIndex }: SceneProps<InputScene>) {
  const { grantPlayerTurn, questState } = useChatDialogue();
  const { currentIndex } = useNavigation();
  const [chatVisible, setChatVisible] = useState(false);
  const [hasGrantedTurn, setHasGrantedTurn] = useState(false);

  // Check if this input scene is currently active
  const isActiveScene = sceneIndex === currentIndex;

  // Grant player turn when scene becomes active
  useEffect(() => {
    if (isActiveScene && !hasGrantedTurn) {
      // Grant player turn with the input prompt
      grantPlayerTurn(`input-${sceneIndex}`);
      setChatVisible(true);
      setHasGrantedTurn(true);
    }
  }, [isActiveScene, hasGrantedTurn, grantPlayerTurn, sceneIndex]);

  // Monitor quest completion
  useEffect(() => {
    if (questState === 'complete' && hasGrantedTurn) {
      // Mark scene as complete when quest completes
      onComplete?.();
    }
  }, [questState, hasGrantedTurn, onComplete]);

  const handleChatHide = () => {
    setChatVisible(false);
    setHasGrantedTurn(false);
  };

  return (
    <>
      {/* Empty scene - characters rendered by CharacterOrchestrator */}
      <div style={{
        height: '100vh',
        width: '100%',
        position: 'relative'
      }}>
        {/* Optional: Show the input prompt question in the scene */}
        {scene.text && chatVisible && (
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px',
            color: '#333',
            fontFamily: 'Comic Sans MS, cursive',
            textAlign: 'center',
            maxWidth: '600px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '16px',
            border: '3px solid #8B4513',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}>
            {scene.text}
          </div>
        )}
      </div>

      {/* Chat UI Layer */}
      <ChatLayer
        visible={chatVisible}
        sceneIndex={sceneIndex || currentIndex}
        onHide={handleChatHide}
      />
    </>
  );
}