/**
 * AnswerValidationOrchestrator
 * Observes scene state and automatically validates answers when needed
 *
 * State-driven behavior:
 * - When scene state becomes 'answer-waiting', validates the answer
 * - Transitions to 'answer-right' or 'answer-wrong' based on result
 */

import React from 'react';
import { useSceneManager } from '@core/scenes/SceneManager';
import { validateAnswer, type AnswerValidationResult } from './validateAnswer';

export function AnswerValidationOrchestrator() {
  const { navigationArray, navigationIndex, updateNavigationItemState } = useSceneManager();

  // Track if we're currently processing to avoid duplicate calls
  const [processingSceneIndex, setProcessingSceneIndex] = React.useState<number | null>(null);

  // Get current navigation item - reactive to navigationArray changes
  const currentNavItem = React.useMemo(() => {
    return navigationArray[navigationIndex] || null;
  }, [navigationArray, navigationIndex]);

  // Auto-trigger answer validation when scene enters answer-waiting state
  React.useEffect(() => {
    const sceneState = currentNavItem?.sceneState;

    const isAnswerWaiting = sceneState?.type === 'dialogue' && sceneState.state === 'answer-waiting';

    // Process when in answer-waiting state
    if (isAnswerWaiting && navigationIndex !== processingSceneIndex) {
      const answerText = sceneState?.type === 'dialogue' ? sceneState.answerText : undefined;
      const questionText = sceneState?.type === 'dialogue' ? sceneState.questionText : undefined;

      // Only process if we have an answer
      if (answerText) {

        setProcessingSceneIndex(navigationIndex);

        // Validate the answer
        validateAnswer(answerText, questionText).then((result: AnswerValidationResult) => {


          // Transition to right or wrong state based on result
          const newState = result === 'pass' ? 'answer-right' : 'answer-wrong';

          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: newState,
            answerText,
            questionText
          });

          // Clear processing flag after completion
          setProcessingSceneIndex(null);
        }).catch((error) => {
          console.error('Error validating answer:', error);
          // On error, treat as wrong
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'answer-wrong',
            answerText,
            questionText
          });
          setProcessingSceneIndex(null);
        });
      }
    }
  }, [currentNavItem, navigationIndex, processingSceneIndex, updateNavigationItemState]);

  // This is a logic-only component, renders nothing
  return null;
}
