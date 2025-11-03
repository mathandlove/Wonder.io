/**
 * ChatFlowOrchestratorComponent
 * Observes scene state and automatically triggers AI responses when needed
 *
 * State-driven behavior:
 * - When scene state becomes 'ai-waiting', extracts transcript from scene and processes it
 * - Creates AI response scene and navigates to it
 */

import React from 'react';
import { useNavigationStore, selectCurrentNode } from '@core/navigation/navigationStore';
import { useChatFlowOrchestrator } from './ChatFlowOrchestrator';

export function ChatFlowOrchestratorComponent() {
  const chatFlow = useChatFlowOrchestrator();

  // Track if we're currently processing to avoid duplicate calls
  const [processingRecordingId, setProcessingRecordingId] = React.useState<string | null>(null);

  // Subscribe to current node from navigation store
  const currentNode = useNavigationStore(selectCurrentNode);

  // Extract primitive values for effect dependencies (so effect re-runs when these change)
  const currentScene = currentNode?.scene;
  const phase = currentNode?.phase;

  // Extract questionText and recordingId from scene (xState-driven architecture)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionText = currentScene && typeof currentScene === 'object' && 'questionText' in currentScene ? (currentScene as any).questionText : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordingId = currentScene && typeof currentScene === 'object' && 'recordingId' in currentScene ? (currentScene as any).recordingId : undefined;

  // Auto-trigger AI response when scene enters ai-waiting phase with valid transcript
  React.useEffect(() => {
    const isAiWaiting = phase === 'ai-waiting';

    console.log('🔍 [ChatFlowOrchestrator] State Check:', {
      phase,
      isAiWaiting,
      recordingId,
      questionText,
      hasQuestionText: !!questionText,
      questionTextTrimmed: questionText?.trim(),
      processingRecordingId,
      willProcess: isAiWaiting && recordingId && questionText && questionText.trim() && recordingId !== processingRecordingId
    });

    // Process when in ai-waiting state with valid transcript
    if (isAiWaiting && recordingId && questionText && questionText.trim()) {
      // Only process if we haven't already processed this recording
      if (recordingId !== processingRecordingId) {
        console.log('🚀 [ChatFlowOrchestrator] Triggering AI processing for:', {
          recordingId,
          questionText
        });
        setProcessingRecordingId(recordingId);

        // Process the transcript and get AI response
        chatFlow.processTranscript(questionText, recordingId).then(() => {
          console.log('✅ [ChatFlowOrchestrator] AI processing completed');
          // Clear processing flag after completion
          setProcessingRecordingId(null);
        }).catch((error) => {
          console.error('[ChatFlowOrchestrator] ❌ Error processing transcript:', error);
          setProcessingRecordingId(null);
        });
      } else {
        console.log('⏭️  [ChatFlowOrchestrator] Already processing this recording, skipping');
      }
    }
  }, [phase, questionText, recordingId, chatFlow, processingRecordingId]);

  // This is a logic-only component, renders nothing
  return null;
}
