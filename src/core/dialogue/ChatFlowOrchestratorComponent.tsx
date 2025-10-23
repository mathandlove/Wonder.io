/**
 * ChatFlowOrchestratorComponent
 * Observes scene state and automatically triggers AI responses when needed
 *
 * State-driven behavior:
 * - When scene state becomes 'ai-waiting', extracts transcript from scene and processes it
 * - Creates AI response scene and navigates to it
 */

import React from 'react';
import { useNodeManager } from '@core/navigation/NodeManager';
import { useChatFlowOrchestrator } from './ChatFlowOrchestrator';

export function ChatFlowOrchestratorComponent() {
  const nodeManager = useNodeManager();
  const chatFlow = useChatFlowOrchestrator();

  // Track if we're currently processing to avoid duplicate calls
  const [processingRecordingId, setProcessingRecordingId] = React.useState<string | null>(null);

  // Get current node ID to track navigation changes
  const currentNodeId = nodeManager.getCurrentNodeId();

  // Get current node from NodeManager - memoized and reactive to currentNodeId changes
  const currentNode = React.useMemo(() => {
    return nodeManager.getCurrentNode();
  }, [currentNodeId, nodeManager]);

  // Extract primitive values for effect dependencies (so effect re-runs when these change)
  const sceneState = currentNode?.sceneState;
  const dialogueState = sceneState?.type === 'dialogue' ? sceneState.state : null;
  const questionText = sceneState?.type === 'dialogue' ? sceneState.questionText : undefined;
  const currentScene = currentNode?.scene;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordingId = currentScene && 'recordingId' in currentScene ? (currentScene as any).recordingId : undefined;

  // Auto-trigger AI response when scene enters ai-waiting state with valid transcript
  React.useEffect(() => {
    const isAiWaiting = dialogueState === 'ai-waiting';

    // Process when in ai-waiting state with valid transcript
    if (isAiWaiting && recordingId && questionText && questionText.trim()) {
      // Only process if we haven't already processed this recording
      if (recordingId !== processingRecordingId) {
        setProcessingRecordingId(recordingId);

        // Process the transcript and get AI response
        chatFlow.processTranscript(questionText, recordingId).then(() => {
          // Clear processing flag after completion
          setProcessingRecordingId(null);
        }).catch((error) => {
          console.error('[ChatFlowOrchestrator] ❌ Error processing transcript:', error);
          setProcessingRecordingId(null);
        });
      }
    }
  }, [dialogueState, questionText, recordingId, chatFlow, processingRecordingId]);

  // This is a logic-only component, renders nothing
  return null;
}
