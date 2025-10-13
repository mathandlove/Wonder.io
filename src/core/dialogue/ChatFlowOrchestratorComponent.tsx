/**
 * ChatFlowOrchestratorComponent
 * Observes scene state and automatically triggers AI responses when needed
 *
 * State-driven behavior:
 * - When scene state becomes 'ai-waiting', extracts transcript from scene and processes it
 * - Creates AI response scene and navigates to it
 */

import React from 'react';
import { useSceneManager } from '@core/scenes/SceneManager';
import { useChatFlowOrchestrator } from './ChatFlowOrchestrator';

export function ChatFlowOrchestratorComponent() {
  const sceneManager = useSceneManager();
  const chatFlow = useChatFlowOrchestrator();

  // Track if we're currently processing to avoid duplicate calls
  const [processingRecordingId, setProcessingRecordingId] = React.useState<string | null>(null);

  // Auto-trigger AI response when scene enters ai-waiting state
  React.useEffect(() => {
    const currentNavItem = sceneManager.getCurrentNavigationItem();
    const sceneState = currentNavItem?.sceneState;
    const currentScene = currentNavItem?.scene;

    const isAiWaiting = sceneState?.type === 'dialogue' && sceneState.state === 'ai-waiting';

    if (isAiWaiting && currentScene && 'recordingId' in currentScene) {
      const recordingId = (currentScene as any).recordingId;
      const transcript = (currentScene as any).text;

      // Only process if we haven't already processed this recording
      if (recordingId && transcript && recordingId !== processingRecordingId) {
        setProcessingRecordingId(recordingId);

        // Process the transcript and get AI response
        chatFlow.processTranscript(transcript, recordingId).then(() => {
          // Clear processing flag after completion
          setProcessingRecordingId(null);
        }).catch((error) => {
          console.error('Error processing transcript:', error);
          setProcessingRecordingId(null);
        });
      }
    }
  }, [sceneManager, chatFlow, processingRecordingId]);

  // This is a logic-only component, renders nothing
  return null;
}
