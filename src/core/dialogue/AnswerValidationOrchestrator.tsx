/**
 * AnswerValidationOrchestrator
 * Observes node phase and automatically validates answers when needed
 *
 * Phase-driven behavior:
 * - When phase becomes 'answer-waiting', validates the answer
 * - Transitions to 'answer-right' or 'answer-wrong' based on result
 */

import React from 'react';
import { getCurrentNode, getCurrentNodeId, updateCurrentPhase } from '@core/navigation/navigationHelpers';
import { validateAnswer, type AnswerValidationResult } from './validateAnswer';
import { useAIMemory } from '@core/ai/useAIMemory';
import type { CharacterScene } from '@core/types/scene';

export function AnswerValidationOrchestrator() {
  const aiMemory = useAIMemory();

  // Track if we're currently processing to avoid duplicate calls
  const [processingNodeId, setProcessingNodeId] = React.useState<string | null>(null);

  // Get current node - reactive to navigation changes
  const currentNode = getCurrentNode();
  const currentNodeId = getCurrentNodeId();

  // Auto-trigger answer validation when node enters answer-waiting phase
  React.useEffect(() => {
    if (!currentNode || !currentNodeId) return;

    const { phase, scene } = currentNode;
    const characterScene = scene as CharacterScene;
    const isAnswerWaiting = phase === 'answer-waiting';

    // Process when in answer-waiting phase
    if (isAnswerWaiting && currentNodeId !== processingNodeId) {
      const { answerText, questionText } = characterScene;

      // Only process if we have an answer
      if (answerText) {
        setProcessingNodeId(currentNodeId);

        // Validate the answer
        validateAnswer(answerText, questionText).then((result: AnswerValidationResult) => {
          // Transition to right or wrong phase based on result
          const newPhase = result === 'pass' ? 'answer-right' : 'answer-wrong';
          updateCurrentPhase(newPhase);

          // Clear conversation history when quest is completed successfully
          if (result === 'pass') {
            const flowId = 'flowId' in scene ? (scene as { flowId?: string }).flowId : undefined;

            if (flowId) {
              aiMemory.clearHistory(flowId);
            }
          }

          // Clear processing flag after completion
          setProcessingNodeId(null);
        }).catch((error) => {
          console.error('Error validating answer:', error);
          // On error, treat as wrong
          updateCurrentPhase('answer-wrong');
          setProcessingNodeId(null);
        });
      }
    }
  }, [currentNode, currentNodeId, processingNodeId, aiMemory]);

  // This is a logic-only component, renders nothing
  return null;
}
