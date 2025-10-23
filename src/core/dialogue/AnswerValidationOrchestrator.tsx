/**
 * AnswerValidationOrchestrator
 * Observes scene state and automatically validates answers when needed
 *
 * State-driven behavior:
 * - When scene state becomes 'answer-waiting', validates the answer
 * - Transitions to 'answer-right' or 'answer-wrong' based on result
 */

import React from 'react';
import { getCurrentNode, getCurrentNodeId, updateNodeState } from '@core/navigation/navigationHelpers';
import { validateAnswer, type AnswerValidationResult } from './validateAnswer';
import { useAIMemory } from '@core/ai/useAIMemory';

export function AnswerValidationOrchestrator() {
  const aiMemory = useAIMemory();

  // Track if we're currently processing to avoid duplicate calls
  const [processingNodeId, setProcessingNodeId] = React.useState<string | null>(null);

  // Get current node - reactive to navigation changes
  const currentNode = getCurrentNode();
  const currentNodeId = getCurrentNodeId();

  // Auto-trigger answer validation when scene enters answer-waiting state
  React.useEffect(() => {
    if (!currentNode || !currentNodeId) return;

    const sceneState = currentNode.sceneState;
    const isAnswerWaiting = sceneState?.type === 'dialogue' && sceneState.state === 'answer-waiting';

    // Process when in answer-waiting state
    if (isAnswerWaiting && currentNodeId !== processingNodeId) {
      const answerText = sceneState?.type === 'dialogue' ? sceneState.answerText : undefined;
      const questionText = sceneState?.type === 'dialogue' ? sceneState.questionText : undefined;

      // Only process if we have an answer
      if (answerText) {
        setProcessingNodeId(currentNodeId);

        // Validate the answer
        validateAnswer(answerText, questionText).then((result: AnswerValidationResult) => {
          // Transition to right or wrong state based on result
          const newState = result === 'pass' ? 'answer-right' : 'answer-wrong';

          updateNodeState(currentNodeId, {
            type: 'dialogue',
            state: newState,
            answerText,
            questionText
          });

          // Clear conversation history when quest is completed successfully
          if (result === 'pass') {
            const currentScene = currentNode.scene;
            const flowId = currentScene && 'flowId' in currentScene ? (currentScene as { flowId?: string }).flowId : undefined;

            if (flowId) {
              aiMemory.clearHistory(flowId);
            }
          }

          // Clear processing flag after completion
          setProcessingNodeId(null);
        }).catch((error) => {
          console.error('Error validating answer:', error);
          // On error, treat as wrong
          updateNodeState(currentNodeId, {
            type: 'dialogue',
            state: 'answer-wrong',
            answerText,
            questionText
          });
          setProcessingNodeId(null);
        });
      }
    }
  }, [currentNode, currentNodeId, processingNodeId, aiMemory]);

  // This is a logic-only component, renders nothing
  return null;
}
