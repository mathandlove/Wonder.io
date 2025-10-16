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
  const { navigationArray, navigationIndex, getCurrentNavigationItem } = useSceneManager();
  const chatFlow = useChatFlowOrchestrator();

  // Track if we're currently processing to avoid duplicate calls
  const [processingRecordingId, setProcessingRecordingId] = React.useState<string | null>(null);

  // Get current navigation item - reactive to navigationArray changes
  const currentNavItem = React.useMemo(() => {
    return navigationArray[navigationIndex] || null;
  }, [navigationArray, navigationIndex]);

  // Auto-trigger AI response when scene enters ai-waiting state
  React.useEffect(() => {
    const sceneState = currentNavItem?.sceneState;
    const currentScene = currentNavItem?.scene;

    const isAiWaiting = sceneState?.type === 'dialogue' && sceneState.state === 'ai-waiting';

    if (isAiWaiting && currentScene && 'recordingId' in currentScene) {
      const recordingId = (currentScene as any).recordingId;
      // Read transcript from scene state (persistent) or fallback to scene.text
      const transcript = (sceneState?.type === 'dialogue' && sceneState.questionText)
        ? sceneState.questionText
        : (currentScene as any).text;

      // Only process if we haven't already processed this recording
      if (recordingId && transcript && recordingId !== processingRecordingId) {
        console.log('🤖 ChatFlowOrchestrator processing transcript from scene state:', transcript);
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
  }, [currentNavItem, chatFlow, processingRecordingId]);

  // This is a logic-only component, renders nothing
  return null;
}
