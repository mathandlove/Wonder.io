import { useDialogue } from "../../dialogue/DialogueContext";
import type { InteractiveBubbleScene } from "../../types/scene";
import { useEffect, useMemo } from "react";
import "./InteractiveBubbleScene.css";

interface InteractiveBubbleSceneProps {
  scene: InteractiveBubbleScene;
  sceneIndex?: number;
  onComplete?: () => void;
}

export default function InteractiveBubbleSceneView({ scene, sceneIndex, onComplete }: InteractiveBubbleSceneProps) {
  const { getMessagesForScene } = useDialogue();
  const messages = getMessagesForScene(scene.sceneId || '');

  // Memoize the display message calculation to prevent unnecessary re-renders
  const displayMessage = useMemo(() => {
    const recordingMessage = messages.find(m => m.status === 'recording' || m.status === 'pending');
    const latestMessage = messages[messages.length - 1];
    return recordingMessage || latestMessage;
  }, [messages]);

  console.log('[INTERACTIVE_BUBBLE_DEBUG] Rendering scene:', {
    sceneId: scene.sceneId,
    sceneIndex,
    messagesLength: messages.length,
    displayMessage,
    messageDetails: displayMessage ? {
      id: displayMessage.id,
      status: displayMessage.status,
      text: displayMessage.text,
      isInterim: displayMessage.isInterim,
      sender: displayMessage.sender
    } : null
  });

  return (
    <div className="interactive-bubble-scene">
      <div className="interactive-content-wrapper">
        {displayMessage ? (
          <div className={`interactive-bubble ${displayMessage.sender} ${displayMessage.status}`}>
            <div className="bubble-content">
              {displayMessage.status === 'recording' && !displayMessage.text && (
                <>
                  {console.log('[INTERACTIVE_BUBBLE_DEBUG] Rendering listening indicator')}
                  <div className="listening-indicator" style={{ background: 'red', padding: '20px', fontSize: '24px' }}>
                    <span className="pulse-dot"></span>
                    <span className="listening-text">🎤 LISTENING... 🎤</span>
                  </div>
                </>
              )}
              {displayMessage.isInterim && displayMessage.text && (
                <>
                  {console.log('[INTERACTIVE_BUBBLE_DEBUG] Rendering interim text:', displayMessage.text)}
                  <div className="interim-text">
                    <span className="text-content">{displayMessage.text}</span>
                    <span className="interim-dots">...</span>
                  </div>
                </>
              )}
              {!displayMessage.isInterim && displayMessage.text && (
                <>
                  {console.log('[INTERACTIVE_BUBBLE_DEBUG] Rendering final text:', displayMessage.text)}
                  <div className="final-text">
                    <span className="text-content">{displayMessage.text}</span>
                  </div>
                </>
              )}
              {displayMessage.status === 'pending' && (
                <>
                  {console.log('[INTERACTIVE_BUBBLE_DEBUG] Rendering pending indicator')}
                  <div className="sending-indicator">Sending...</div>
                </>
              )}
              {displayMessage.status === 'error' && (
                <>
                  {console.log('[INTERACTIVE_BUBBLE_DEBUG] Rendering error indicator')}
                  <div className="error-indicator">Failed to send</div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="interactive-bubble-placeholder">
            <span className="placeholder-icon">🎤</span>
            <span className="placeholder-text">Press and hold to record</span>
          </div>
        )}
      </div>
    </div>
  );
}