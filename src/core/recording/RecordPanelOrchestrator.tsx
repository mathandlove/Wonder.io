/**
 * RecordPanelOrchestrator - Orchestrates the recording flow and quest system
 *
 * Responsibilities:
 * - Handle quest offering when reaching quest-showing state
 * - Handle quest acceptance and proper state collapse
 * - Create new page when recording starts
 * - Navigate to the new page
 * - Manage recording API lifecycle
 * - Coordinate with quest system for completion
 *
 * State Management:
 * - Behavior driven by SCENE STATE (input-showInput), not dialogue state
 * - When scene is input-showInput, recording is enabled
 * - Quest completion determines if Next button is unlocked
 */
import React, { useCallback, useEffect } from 'react';
import { useSceneManager } from '@core/scenes/SceneManager';
import { useSceneFlowMetadata } from '@core/data/FlowMetadataStore';
import { usePageFactory } from '@core/navigation/PageFactory';
import { Recording } from '@core/recording/RecordingAPI';
import { RecordPanel } from './RecordPanel';
import { useRecording } from './RecordingContext';
import type { Scene } from '@core/types/scene';

// Type guard for scenes with character properties
type SceneWithCharacters = Scene & {
  'left-character'?: string;
  'right-character'?: string;
};

function hasCharacterProperties(scene: Scene | undefined | null): scene is SceneWithCharacters {
  return scene !== null && scene !== undefined &&
    ('left-character' in scene || 'right-character' in scene);
}

// Type guard for scenes with recordingId
type SceneWithRecording = Scene & {
  recordingId?: string;
};

function hasRecordingId(scene: Scene | undefined | null): scene is SceneWithRecording {
  return scene !== null && scene !== undefined && 'recordingId' in scene;
}

// Type guard for scenes with flowId
type SceneWithFlowId = Scene & {
  flowId?: string;
};

function hasFlowId(scene: Scene | undefined | null): scene is SceneWithFlowId {
  return scene !== null && scene !== undefined && 'flowId' in scene;
}

export function RecordingOrchestrator() {
  const { getCurrentNavigationItem, insertNavigationItem, deleteNavigationItem, addNavigationStateToCurrentScene, updateNavigationItemState, updateSceneTextByRecordingId, navigationIndex, setNavigationIndex, forceAdvanceNavigation, navigationArray } = useSceneManager();
  const { createRecordingScene } = usePageFactory();
  const recording = useRecording();

  // Track pending deletions to prevent duplicate deletion attempts
  const pendingDeletionRef = React.useRef<number | null>(null);

  // Get current scene state to understand context
  // We extract just the current item from navigationArray so we react to changes,
  // but we memoize based on the actual content we care about (sceneId and state type/state)
  // to prevent unnecessary re-renders when unrelated properties change
  const currentNavItem = React.useMemo(() => {
    return navigationArray[navigationIndex] || null;
  }, [navigationArray, navigationIndex]);

  const currentScene = currentNavItem?.scene;

  // Memoize sceneState based on its actual content to prevent unnecessary re-renders
  const sceneState = React.useMemo(() => {
    return currentNavItem?.sceneState || null;
  }, [currentNavItem?.sceneState]);

  // Get flow metadata for quest text
  const flowMetadata = useSceneFlowMetadata(hasFlowId(currentScene) ? currentScene : null);

  // Determine if panel should be visible based on dialogue state
  // Show for: basic (hidden below screen), quest-showing (quest offer), input-showInput (ready to record),
  // input-recording (actively recording), show-hint (hint display), record-answer (answer recording),
  // answer-waiting (waiting for answer validation), answer-right (correct answer feedback),
  // answer-wrong (wrong answer feedback), ai-waiting (waiting for AI response)
  const dialogueState = sceneState?.type === 'dialogue' ? sceneState.state : null;
  const shouldShowPanel =
    dialogueState === 'basic' ||
    dialogueState === 'quest-showing' ||
    dialogueState === 'input-showInput' ||
    dialogueState === 'input-recording' ||
    dialogueState === 'show-hint' ||
    dialogueState === 'record-answer' ||
    dialogueState === 'answer-waiting' ||
    dialogueState === 'answer-right' ||
    dialogueState === 'answer-wrong' ||
    dialogueState === 'ai-waiting';


  // Track the active recording ID in state (reactive, not ref)
  const [activeRecordingId, setActiveRecordingId] = React.useState<string | null>(null);

  // Track question count - resets when panel becomes hidden (basic state)
  const [, setQuestionCount] = React.useState<number>(0);

  // Ref to store handleRecordStop so it can be used in effects before it's defined
  const handleRecordStopRef = React.useRef<(() => void) | null>(null);

  // ===================================
  // QUESTION TRACKING LOGIC
  // ===================================

  // Effect: Reset question count when panel becomes hidden (basic state)
  useEffect(() => {
    if (dialogueState === 'basic') {
      setQuestionCount(0);
    }
  }, [dialogueState]);

  // Effect: Auto-transition from answer-wrong back to ready state (allow retry)
  useEffect(() => {
    if (dialogueState === 'answer-wrong') {
      // Wait 4 seconds to show the angry seal animation and wrong feedback, then return to ready state
      const timerId = setTimeout(() => {
        const currentState = sceneState?.type === 'dialogue' ? sceneState : null;
        if (currentState?.state === 'answer-wrong') {
          // Transition to input-showInput state (panel at bottom, ready to try again)
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'input-showInput',
            questionText: currentState.questionText // Preserve question for retry
          });
        }
      }, 4000);

      return () => clearTimeout(timerId);
    }
  }, [dialogueState, sceneState, navigationIndex, updateNavigationItemState]);

  // Effect: Auto-advance forward after showing answer-right feedback
  useEffect(() => {
    if (dialogueState === 'answer-right') {
      // Wait 3 seconds to show the seal animation and correct feedback, then scroll forward
      const timerId = setTimeout(() => {
        const currentState = sceneState?.type === 'dialogue' ? sceneState : null;
        if (currentState?.state === 'answer-right') {
          // Advance to next scene
          forceAdvanceNavigation('forward');
        }
      }, 3000);

      return () => clearTimeout(timerId);
    }
  }, [dialogueState, sceneState, forceAdvanceNavigation]);

  // ===================================
  // RECORDING FLOW LOGIC
  // ===================================

  // Auto-start recording when entering recording states (state-driven)
  // Handles record-answer (Answer button) - input-recording is started immediately in handleRecordStart
  React.useEffect(() => {
    const isRecordingState = sceneState?.type === 'dialogue' &&
      (sceneState.state === 'input-recording' || sceneState.state === 'record-answer');
    const isWaitingState = sceneState?.type === 'dialogue' &&
      (sceneState.state === 'ai-waiting' || sceneState.state === 'answer-waiting');
    const currentScene = currentNavItem?.scene;
    const sceneRecordingId = hasRecordingId(currentScene) ? currentScene.recordingId : undefined;

    if (isRecordingState && !recording.isRecording()) {
      // For record-answer, we might not have a recordingId, so generate one
      // For input-recording, this is a fallback in case immediate start failed
      const recordingId = sceneRecordingId || `answer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setActiveRecordingId(recordingId);
      Recording.start(); // This dispatches START action which clears accumulatedText and displayText
    }

    // Auto-stop recording when leaving recording states
    if (!isRecordingState && recording.isRecording()) {
      Recording.stop();
    }

    // Clear activeRecordingId when leaving waiting states (no longer need it)
    // Don't clear during waiting states (still need it for transcript updates)
    if (!isRecordingState && !isWaitingState && activeRecordingId) {
      setActiveRecordingId(null);
    }
  }, [sceneState, recording, currentNavItem, activeRecordingId]);

  // Sync recording transcript - simplified for batch processing
  // During recording, we don't get real-time updates anymore
  // After stop, we receive ONE final transcript which updates ai-waiting or answer-waiting state
  const displayText = recording.getDisplayText();
  const isRecording = recording.isRecording();

  React.useEffect(() => {
    // Only sync during active recording (no partial updates, but keep UI responsive)
    if (isRecording && activeRecordingId) {
      // Read fresh state on each update
      const freshNavItem = getCurrentNavigationItem();
      const currentState = freshNavItem?.sceneState?.type === 'dialogue' ? freshNavItem.sceneState : null;

      if (currentState?.state === 'input-recording') {
        // Ask recording: Update scene text minimally (backend will provide final on stop)
        // We don't get real-time transcripts anymore, but keep state synced
        if (currentState.questionText !== displayText && displayText) {
          updateSceneTextByRecordingId(activeRecordingId, displayText);
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'input-recording',
            questionText: displayText
          });
        }
      } else if (currentState?.state === 'record-answer') {
        // Answer recording: Update answerText minimally
        if (currentState.answerText !== displayText && displayText) {
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'record-answer',
            answerText: displayText,
            questionText: currentState.questionText
          });
        }
      }
    }

    // Update ai-waiting and answer-waiting states when final transcript arrives from backend
    // This effect updates the text as soon as it arrives (before 'close' signal)
    if (!isRecording && activeRecordingId && displayText.trim()) {
      const freshNavItem = getCurrentNavigationItem();
      const currentState = freshNavItem?.sceneState?.type === 'dialogue' ? freshNavItem.sceneState : null;

      if (currentState?.state === 'ai-waiting') {
        // Final transcript arrived from backend
        const finalText = displayText.trim();
        console.log('[RecordPanelOrchestrator] Final transcript arrived:', finalText);

        if (currentState.questionText !== finalText) {
          // Valid transcript - update questionText in ai-waiting state
          console.log('[RecordPanelOrchestrator] ✅ Updating ai-waiting state with final text:', finalText);
          updateSceneTextByRecordingId(activeRecordingId, finalText);
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'ai-waiting',
            questionText: finalText
          });
        } else {
          console.log('[RecordPanelOrchestrator] ⏭️  Skipping update - text unchanged');
        }
      } else if (currentState?.state === 'answer-waiting') {
        // Final transcript arrived for answer
        const finalText = displayText.trim();

        if (currentState.answerText !== finalText) {
          // Valid answer - update answerText in answer-waiting state
          console.log('[RecordPanelOrchestrator] ✅ Updating answer-waiting state with final text:', finalText);
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'answer-waiting',
            answerText: finalText,
            questionText: currentState.questionText
          });
        }
      }
    }
  }, [displayText, isRecording, sceneState, activeRecordingId, navigationIndex, updateSceneTextByRecordingId, updateNavigationItemState, getCurrentNavigationItem, navigationArray, setNavigationIndex, deleteNavigationItem]);

  // Register onAutoStop callback when in recording states
  // This allows the auto-stop timeout to call handleRecordStop and transition state properly
  React.useEffect(() => {
    const currentState = sceneState?.type === 'dialogue' ? sceneState : null;
    const isInRecordingState =
      (currentState?.state === 'input-recording' && isRecording) ||
      (currentState?.state === 'record-answer' && isRecording);

    if (isInRecordingState && handleRecordStopRef.current) {
      recording.setOnAutoStop(handleRecordStopRef.current);

      return () => {
        recording.setOnAutoStop(null);
      };
    } else {
      recording.setOnAutoStop(null);
    }
  }, [sceneState, isRecording, recording]);

  // Register onFinalized callback - triggers when backend sends 'close' signal
  // Just log for debugging - ChatFlowOrchestrator will handle empty transcripts
  React.useEffect(() => {
    const currentState = sceneState?.type === 'dialogue' ? sceneState : null;

    // Register callback during recording or in ai-waiting/answer-waiting states
    const shouldRegisterCallback =
      (currentState?.state === 'input-recording' && isRecording) ||
      (currentState?.state === 'record-answer' && isRecording) ||
      currentState?.state === 'ai-waiting' ||
      currentState?.state === 'answer-waiting';

    if (shouldRegisterCallback) {
      // Register callback that will fire when backend sends 'close' signal
      recording.setOnFinalized(() => {
        console.log('[RecordPanelOrchestrator] ✅ Transcription finalized - backend processing complete');
      });

      // Cleanup: unregister when leaving these states
      return () => {
        recording.setOnFinalized(null);
      };
    } else {
      // Not in a state that needs callback - make sure it's cleared
      recording.setOnFinalized(null);
    }
  }, [sceneState, isRecording, recording]);

  /**
   * Handle recording start - creates new page, navigates, and starts recording
   * This is the orchestration logic that coordinates multiple systems
   */
  const handleRecordStart = useCallback(() => {
    try {
      // Increment question counter - unlocks Answer button after first question
      setQuestionCount(prev => prev + 1);

      // Update current navigation item state from input-showInput to basic (locks auto-recalculated)
      updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'basic' });

      // Generate unique recording ID
      const recordingId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create a new CharacterScene, inheriting context from current scene
      const currentScene = currentNavItem?.scene;
      const currentBackground = currentScene && 'background' in currentScene ? currentScene.background : undefined;
      const leftCharacter = hasCharacterProperties(currentScene) ? currentScene['left-character'] : undefined;
      const rightCharacter = hasCharacterProperties(currentScene) ? currentScene['right-character'] : undefined;
      const flowId = hasFlowId(currentScene) ? currentScene.flowId : undefined;

      const newScene = createRecordingScene(recordingId, currentBackground, leftCharacter, rightCharacter);

      // Copy flowId from the original scene to the recording scene
      if (flowId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newScene as any).flowId = flowId;
      }

      const sceneId = newScene.sceneId || 'default';

      // Create NavigationItem with recording state
      const newNavItem = {
        scene: newScene,
        sceneId,
        sceneState: { type: 'dialogue' as const, state: 'input-recording' as const },
        lockForward: true, // Block scrolling in both directions while recording
        lockBackward: true,
        index: navigationIndex + 1
      };

      insertNavigationItem(newNavItem, navigationIndex + 1);
      setNavigationIndex(navigationIndex + 1);

      // Start recording immediately for better UX (don't wait for effect to detect state change)
      // This will clear accumulated text via the START action in RecordingContext
      setActiveRecordingId(recordingId);
      Recording.start();
    } catch {
      // Silent error handling
    }
  }, [createRecordingScene, insertNavigationItem, updateNavigationItemState, navigationIndex, setNavigationIndex, currentNavItem]);

  /**
   * Handle recording stop - NEW BATCH PROCESSING FLOW
   * - User pushes stop button
   * - Transition directly to ai-waiting (or answer-waiting) state
   * - Backend will process the entire audio buffer and return ONE final transcript
   * - When final transcript arrives, update the text in ai-waiting state
   * - ChatFlowOrchestrator will trigger AI processing on ai-waiting state
   */
  const handleRecordStop = useCallback(() => {
    const currentState = sceneState?.type === 'dialogue' ? sceneState : null;

    if (currentState?.state === 'record-answer') {
      // Answer recording: ALWAYS transition to answer-waiting immediately
      // We don't know if there's valid speech until backend processes the audio
      // Backend will send final transcript which will either:
      //   - Update answerText if valid speech detected
      //   - Revert to input-showInput if empty/no speech (handled in transcript sync effect)
      const currentAnswerText = currentState.answerText || '';

      updateNavigationItemState(navigationIndex, {
        type: 'dialogue',
        state: 'answer-waiting',
        answerText: currentAnswerText, // Will be updated when final transcript arrives
        questionText: currentState.questionText // Preserve question text
      });
    } else if (currentState?.state === 'input-recording') {
      // Ask recording: ALWAYS transition to ai-waiting immediately
      // We don't know if there's valid speech until backend processes the audio
      // Backend will send final transcript which will either:
      //   - Update questionText if valid speech detected
      //   - Trigger scene collapse if empty/no speech (handled in transcript sync effect)
      const currentQuestionText = currentState.questionText || '';
      console.log('[RecordPanelOrchestrator] 🛑 Stop recording, transitioning to ai-waiting with text:', currentQuestionText);

      // Update scene text (for speech bubble) before transitioning state
      if (activeRecordingId && currentQuestionText) {
        updateSceneTextByRecordingId(activeRecordingId, currentQuestionText);
      }

      updateNavigationItemState(navigationIndex, {
        type: 'dialogue',
        state: 'ai-waiting',
        questionText: currentQuestionText // Will be updated when final transcript arrives
      });
    }

    // Recording will stop automatically via the effect
    // Recording will send 'finalize' to backend
    // Backend will process complete audio and send ONE final transcript
    // onFinal callback will update the text in ai-waiting/answer-waiting state
    // If transcript is empty, the transcript sync effect will handle scene collapse
    // ChatFlowOrchestrator will trigger AI processing when in ai-waiting state
  }, [navigationIndex, sceneState, updateNavigationItemState, activeRecordingId, updateSceneTextByRecordingId]);

  // Update ref when handleRecordStop changes (so effects can use it)
  React.useEffect(() => {
    handleRecordStopRef.current = handleRecordStop;
  }, [handleRecordStop]);

  /**
   * Handle Accept button click (quest-showing state)
   * Advances navigation when quest is accepted
   */
  const handleAcceptQuest = useCallback(() => {
    forceAdvanceNavigation('forward');
  }, [forceAdvanceNavigation]);


  /**
   * Handle Answer button click - adds record-answer state and starts recording
   * Flow: input-showInput → record-answer (recording) → answer-waiting (AI validation)
   */
  const handleAnswerClick = useCallback(() => {
    // Step 1: Add record-answer state to current scene (same scene, new state)
    addNavigationStateToCurrentScene(
      { type: 'dialogue', state: 'record-answer' },
      true  // Insert after current
    );

    // Step 2: Navigate to the new state using forceAdvanceNavigation
    // This will collapse the previous state (input-showInput) from the navigation array
    // so we don't have duplicate navigation items for the same scene
    forceAdvanceNavigation('forward');

    // Step 3: Recording will auto-start via the effect that watches for record-answer state
    // The START action in RecordingContext will clear accumulated text automatically
  }, [addNavigationStateToCurrentScene, forceAdvanceNavigation]);

  // Don't render if panel shouldn't be visible
  if (!shouldShowPanel) {
    return null;
  }

  // Answer button locked state: Unlocked when user has asked at least 1 question
  // DEBUG: Always unlocked for testing
  const answerUnlocked = true; // questionCount >= 1;
  const questState = answerUnlocked ? 'complete' : 'active';

  // Get dialogue state for visual presentation
  const presentationState = dialogueState || 'basic';

  // Determine which handler to use for the primary action button
  // - quest-showing state: Accept button triggers quest acceptance
  // - other states with Answer button: Answer button triggers answer recording
  const isQuestShowing = presentationState === 'quest-showing';
  const primaryActionHandler = isQuestShowing ? handleAcceptQuest : handleAnswerClick;

  // Get answer text from scene state (persisted across state transitions)
  // Falls back to recording context for real-time display during recording
  const answerText = (presentationState === 'record-answer' ||
                      presentationState === 'waiting-for-answer-finalize' ||
                      presentationState === 'answer-waiting' ||
                      presentationState === 'answer-right' ||
                      presentationState === 'answer-wrong')
    ? (sceneState?.type === 'dialogue' ? sceneState.answerText : undefined) || recording.getDisplayText()
    : undefined;

  return (
    <RecordPanel
      disabled={false}  // Recording is always enabled when this panel shows
      questState={questState}
      dialogueState={presentationState}
      questText={flowMetadata?.questText}
      answerText={answerText}
      onNext={primaryActionHandler}
      onRecordStart={handleRecordStart}
      onRecordStop={handleRecordStop}
      onAskClick={handleRecordStart} // Ask button triggers recording start
    />
  );
}
