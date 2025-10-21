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
  const { navigationArray, navigationIndex } = useSceneManager();
  const chatFlow = useChatFlowOrchestrator();

  // Track if we're currently processing to avoid duplicate calls
  const [processingRecordingId, setProcessingRecordingId] = React.useState<string | null>(null);

  // Get current navigation item - reactive to navigationArray changes
  const currentNavItem = React.useMemo(() => {
    return navigationArray[navigationIndex] || null;
  }, [navigationArray, navigationIndex]);

  // Extract primitive values for effect dependencies (so effect re-runs when these change)
  const sceneState = currentNavItem?.sceneState;
  const dialogueState = sceneState?.type === 'dialogue' ? sceneState.state : null;
  const questionText = sceneState?.type === 'dialogue' ? sceneState.questionText : undefined;
  const currentScene = currentNavItem?.scene;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordingId = currentScene && 'recordingId' in currentScene ? (currentScene as any).recordingId : undefined;

  // Auto-trigger AI response when scene enters ai-waiting state with valid transcript
  React.useEffect(() => {
    const isAiWaiting = dialogueState === 'ai-waiting';

    console.log('[ChatFlowOrchestrator] Effect triggered', {
      isAiWaiting,
      recordingId,
      questionText,
      processingRecordingId
    });

    // Process when in ai-waiting state with valid transcript
    if (isAiWaiting && recordingId && questionText && questionText.trim()) {
      // Only process if we haven't already processed this recording
      if (recordingId !== processingRecordingId) {
        console.log('[ChatFlowOrchestrator] ✅ Triggering AI processing for:', questionText);

        setProcessingRecordingId(recordingId);

        // Process the transcript and get AI response
        chatFlow.processTranscript(questionText, recordingId).then(() => {
          console.log('[ChatFlowOrchestrator] ✅ AI processing complete');
          // Clear processing flag after completion
          setProcessingRecordingId(null);
        }).catch((error) => {
          console.error('[ChatFlowOrchestrator] ❌ Error processing transcript:', error);
          setProcessingRecordingId(null);
        });
      } else {
        console.log('[ChatFlowOrchestrator] ⏭️  Skipping - already processing this recording');
      }
    }
  }, [dialogueState, questionText, recordingId, chatFlow, processingRecordingId]);

  // This is a logic-only component, renders nothing
  return null;
}
