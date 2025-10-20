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
  // input-recording (actively recording), waiting-for-finalize (waiting for Ask final transcripts),
  // show-hint (hint display), record-answer (answer recording), waiting-for-answer-finalize (waiting for Answer final transcripts),
  // answer-waiting (waiting for answer validation), answer-right (correct answer feedback),
  // answer-wrong (wrong answer feedback), ai-waiting (waiting for response)
  const dialogueState = sceneState?.type === 'dialogue' ? sceneState.state : null;
  const shouldShowPanel =
    dialogueState === 'basic' ||
    dialogueState === 'quest-showing' ||
    dialogueState === 'input-showInput' ||
    dialogueState === 'input-recording' ||
    dialogueState === 'waiting-for-finalize' ||
    dialogueState === 'show-hint' ||
    dialogueState === 'record-answer' ||
    dialogueState === 'waiting-for-answer-finalize' ||
    dialogueState === 'answer-waiting' ||
    dialogueState === 'answer-right' ||
    dialogueState === 'answer-wrong' ||
    dialogueState === 'ai-waiting';

  console.log('🎮 RecordPanelOrchestrator:', {
    currentNavItem: currentNavItem?.sceneId,
    sceneState,
    dialogueState,
    shouldShowPanel
  });

  // Track the active recording ID in state (reactive, not ref)
  const [activeRecordingId, setActiveRecordingId] = React.useState<string | null>(null);

  // Track question count - resets when panel becomes hidden (basic state)
  const [, setQuestionCount] = React.useState<number>(0);

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
        console.log('⏰ Auto-transitioning from answer-wrong to input-showInput (ready for retry)');
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
        console.log('⏰ Auto-advancing forward from answer-right');
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
    const isWaitingForFinalize = sceneState?.type === 'dialogue' &&
      (sceneState.state === 'waiting-for-finalize' || sceneState.state === 'waiting-for-answer-finalize');
    const currentScene = currentNavItem?.scene;
    const sceneRecordingId = hasRecordingId(currentScene) ? currentScene.recordingId : undefined;

    if (isRecordingState && !recording.isRecording()) {
      // For record-answer, we might not have a recordingId, so generate one
      // For input-recording, this is a fallback in case immediate start failed
      const recordingId = sceneRecordingId || `answer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setActiveRecordingId(recordingId);
      Recording.start();
      console.log('🎤 Recording started via effect for state:', sceneState.state, 'recordingId:', recordingId);
    }

    // Auto-stop recording when leaving recording states
    if (!isRecordingState && recording.isRecording()) {
      Recording.stop();
      console.log('🛑 Recording stopped');
    }

    // Clear activeRecordingId when leaving finalization states (no longer need it)
    // Don't clear during finalization states (still need it for transcript updates)
    if (!isRecordingState && !isWaitingForFinalize && activeRecordingId) {
      console.log('🧹 Clearing activeRecordingId');
      setActiveRecordingId(null);
    }
  }, [sceneState, recording, currentNavItem, activeRecordingId]);

  // Sync recording transcript in real-time
  // - For Ask recording (input-recording): Update scene text (for speech bubble) AND scene state questionText (for persistence)
  // - For Answer recording (record-answer): Update scene state answerText (for answer input box)
  // Extract displayText as a primitive value so effect only runs when the actual text changes
  const displayText = recording.getDisplayText();
  const isRecording = recording.isRecording();

  React.useEffect(() => {
    // Update transcript if recording OR waiting for finalization (still receiving final transcripts)
    const isWaitingForFinalization = sceneState?.type === 'dialogue' &&
      (sceneState.state === 'waiting-for-finalize' || sceneState.state === 'waiting-for-answer-finalize');

    if ((isRecording || isWaitingForFinalization) && activeRecordingId) {
      // Read fresh state on each transcript update (not from dependencies)
      const freshNavItem = getCurrentNavigationItem();
      const currentState = freshNavItem?.sceneState?.type === 'dialogue' ? freshNavItem.sceneState : null;

      if (currentState?.state === 'input-recording') {
        // Only update if text actually changed (prevents infinite loop)
        if (currentState.questionText !== displayText && displayText) {
          console.log('📝 Updating input-recording text:');
          console.log('   Previous questionText:', currentState.questionText);
          console.log('   New displayText:', displayText);
          console.log('   Length change:', currentState.questionText?.length, '→', displayText?.length);

          // Ask recording: Update both scene text (for speech bubble) and scene state (for persistence)
          updateSceneTextByRecordingId(activeRecordingId, displayText);
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'input-recording',
            questionText: displayText
          });
        }
      } else if (currentState?.state === 'record-answer') {
        // Only update if text actually changed (prevents infinite loop)
        if (currentState.answerText !== displayText && displayText) {
          console.log('📝 Updating record-answer text:');
          console.log('   Previous answerText:', currentState.answerText);
          console.log('   New displayText:', displayText);
          console.log('   Length change:', currentState.answerText?.length, '→', displayText?.length);

          // Answer recording: Update scene state answerText (for answer input box)
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'record-answer',
            answerText: displayText,
            questionText: currentState.questionText // Preserve existing questionText
          });
        }
      } else if (currentState?.state === 'waiting-for-finalize') {
        // Waiting for final Ask transcripts - continue updating text (not recording anymore but still receiving finals)
        // IMPORTANT: Don't overwrite existing text with empty string (happens when recording stops)
        const newQuestionText = displayText || currentState.questionText || '';
        if (currentState.questionText !== newQuestionText && newQuestionText.trim() !== '') {
          // Update both scene text (for speech bubble) and scene state (for persistence)
          updateSceneTextByRecordingId(activeRecordingId, newQuestionText);
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'waiting-for-finalize',
            questionText: newQuestionText
          });
        }
      } else if (currentState?.state === 'waiting-for-answer-finalize') {
        // Waiting for final Answer transcripts - continue updating answerText
        // IMPORTANT: Don't overwrite existing text with empty string (happens when recording stops)
        const newAnswerText = displayText || currentState.answerText || '';
        if (currentState.answerText !== newAnswerText && newAnswerText.trim() !== '') {
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'waiting-for-answer-finalize',
            answerText: newAnswerText,
            questionText: currentState.questionText // Preserve existing questionText
          });
        }
      }
    }
  }, [displayText, isRecording, sceneState, activeRecordingId, navigationIndex, updateSceneTextByRecordingId, updateNavigationItemState, getCurrentNavigationItem]);

  // Register onFinalized callback when recording or waiting for finalize
  // This needs to be registered BEFORE we stop recording, so it's ready for the finalized event
  React.useEffect(() => {
    const currentState = sceneState?.type === 'dialogue' ? sceneState : null;

    // Register callback during recording (before stop) OR during waiting-for-finalize states
    const shouldRegisterCallback =
      (currentState?.state === 'input-recording' && isRecording) ||
      (currentState?.state === 'record-answer' && isRecording) ||
      currentState?.state === 'waiting-for-finalize' ||
      currentState?.state === 'waiting-for-answer-finalize';

    if (shouldRegisterCallback) {
      console.log('📋 Registering onFinalized callback for state:', currentState?.state);

      // Register callback that will fire when all transcripts are received
      recording.setOnFinalized(() => {
        console.log('✅ Transcripts finalized - transitioning next state');

        // Find the current navigation index at the time this callback fires
        const freshNavItem = getCurrentNavigationItem();
        const freshState = freshNavItem?.sceneState?.type === 'dialogue' ? freshNavItem.sceneState : null;

        // Transition based on which finalization state we're in
        if (freshState?.state === 'waiting-for-finalize') {
          // Get text from scene state (more reliable than recording.getDisplayText())
          const finalText = freshState.questionText || recording.getDisplayText();
          console.log('🔄 Updating state to ai-waiting with text:', finalText);
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'ai-waiting',
            questionText: finalText
          });
        } else if (freshState?.state === 'waiting-for-answer-finalize') {
          // Get text from scene state (more reliable than recording.getDisplayText())
          const finalText = freshState.answerText || recording.getDisplayText();
          console.log('🔄 Updating state to answer-waiting with text:', finalText);
          console.log('🔍 Debug - freshState.answerText:', freshState.answerText);
          console.log('🔍 Debug - recording.getDisplayText():', recording.getDisplayText());

          // Ensure we have text before transitioning
          if (!finalText || finalText.trim() === '') {
            console.warn('⚠️ No answer text available, staying in waiting-for-answer-finalize');
            return;
          }

          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'answer-waiting',
            answerText: finalText,
            questionText: freshState.questionText // Preserve question
          });
        } else {
          console.log('⚠️ Callback fired but state is:', freshState?.state);
        }
      });

      // Timeout fallback in case finalized event never arrives (shouldn't happen but safety net)
      const timeoutId = setTimeout(() => {
        console.warn('⏰ Timeout waiting for finalized event - forcing transition');
        const freshNavItem = getCurrentNavigationItem();
        const freshState = freshNavItem?.sceneState?.type === 'dialogue' ? freshNavItem.sceneState : null;

        if (freshState?.state === 'waiting-for-finalize') {
          const finalText = freshState.questionText || recording.getDisplayText();
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'ai-waiting',
            questionText: finalText
          });
        } else if (freshState?.state === 'waiting-for-answer-finalize') {
          const finalText = freshState.answerText || recording.getDisplayText();
          console.log('🔍 Timeout fallback - freshState.answerText:', freshState.answerText);
          console.log('🔍 Timeout fallback - recording.getDisplayText():', recording.getDisplayText());

          // Ensure we have text before transitioning
          if (!finalText || finalText.trim() === '') {
            console.warn('⚠️ Timeout: No answer text available, staying in waiting-for-answer-finalize');
            return;
          }

          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'answer-waiting',
            answerText: finalText,
            questionText: freshState.questionText
          });
        }
      }, 3000); // 3 second timeout

      // Cleanup: unregister when leaving these states
      return () => {
        clearTimeout(timeoutId);
        console.log('🧹 Cleaning up onFinalized callback for state:', currentState?.state);
        recording.setOnFinalized(null);
      };
    } else {
      // Not in a state that needs callback - make sure it's cleared
      recording.setOnFinalized(null);
    }
  }, [sceneState, isRecording, recording, navigationIndex, updateNavigationItemState, getCurrentNavigationItem]);

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
      setActiveRecordingId(recordingId);
      Recording.start();
      console.log('🎤 Recording started immediately for recordingId:', recordingId);
    } catch (error) {
      console.error('Error in handleRecordStart:', error);
    }
  }, [createRecordingScene, insertNavigationItem, updateNavigationItemState, navigationIndex, setNavigationIndex, currentNavItem]);

  /**
   * Handle recording stop - transitions based on current recording type and whether text was captured
   * - If text recorded:
   *   - input-recording → ai-waiting (for Ask button) - preserves questionText
   *   - record-answer → answer-waiting (for Answer button) - preserves answerText
   * - If no text recorded:
   *   - input-recording → collapse back to previous scene (back to ready state)
   *   - record-answer → input-showInput (back to ready state on same scene)
   */
  const handleRecordStop = useCallback(() => {
    const currentState = sceneState?.type === 'dialogue' ? sceneState : null;

    if (currentState?.state === 'record-answer') {
      // Answer recording: Get final transcript from recording context (most reliable source)
      // The recording context maintains accumulated text across pauses
      const recordingDisplayText = recording.getDisplayText();
      const stateAnswerText = currentState.answerText;

      // Prefer displayText from recording context as it has full accumulation
      const finalAnswerText = (recordingDisplayText || stateAnswerText || '').trim();

      console.log('🛑 handleRecordStop for Answer:');
      console.log('   currentState.answerText:', stateAnswerText);
      console.log('   recording.getDisplayText():', recordingDisplayText);
      console.log('   finalAnswerText (using recording context first):', finalAnswerText);

      if (!finalAnswerText) {
        // No text recorded: Go back to ready state (input-showInput)
        console.log('💜 No answer text recorded, returning to input-showInput');
        updateNavigationItemState(navigationIndex, {
          type: 'dialogue',
          state: 'input-showInput',
          questionText: currentState.questionText // Preserve question text
        });
      } else {
        // Text recorded: Transition to waiting-for-answer-finalize (wait for final transcripts)
        console.log('💜 Transitioning from record-answer to waiting-for-answer-finalize, answerText:', finalAnswerText);
        updateNavigationItemState(navigationIndex, {
          type: 'dialogue',
          state: 'waiting-for-answer-finalize',
          answerText: finalAnswerText,
          questionText: currentState.questionText // Preserve question text
        });
      }
    } else if (currentState?.state === 'input-recording') {
      // Ask recording: Get final transcript from recording context (most reliable source)
      // The recording context maintains accumulated text across pauses
      const recordingDisplayText = recording.getDisplayText();
      const stateQuestionText = currentState.questionText;

      // Prefer displayText from recording context as it has full accumulation
      const finalQuestionText = (recordingDisplayText || stateQuestionText || '').trim();

      console.log('🛑 handleRecordStop for Ask:');
      console.log('   currentState.questionText:', stateQuestionText);
      console.log('   recording.getDisplayText():', recordingDisplayText);
      console.log('   finalQuestionText (using recording context first):', finalQuestionText);

      if (!finalQuestionText) {
        // No text recorded: Navigate back to previous scene first, then delete after animations complete
        console.log('🤖 No question text recorded, navigating to previous scene first');
        const currentIndex = navigationIndex;
        const targetSceneIndex = currentIndex - 1;

        // Check if we've already initiated deletion for this index
        if (pendingDeletionRef.current === currentIndex) {
          console.log('⚠️ Deletion already pending for index:', currentIndex);
          return;
        }

        // Mark this index as pending deletion
        pendingDeletionRef.current = currentIndex;

        // Disable animations on the target scene before navigating back
        // This prevents character entrance animations from playing when we're just going back to delete
        const prevNavItem = navigationArray[targetSceneIndex];
        if (prevNavItem && prevNavItem.sceneState?.type === 'dialogue') {
          updateNavigationItemState(targetSceneIndex, {
            ...prevNavItem.sceneState,
            allowAnimate: false
          });
        }

        // Navigate back to previous scene (with animations disabled)
        setNavigationIndex(targetSceneIndex);

        // Wait for character animations to complete before deleting
        // Character entrance animations are 1600ms (see CharacterPanel.css)
        // TEMPORARY: Testing with 300ms to observe scroll behavior issues
        setTimeout(() => {
          console.log('🎭 [TEST] Deleting at 300ms to observe scroll issues');
          deleteNavigationItem(currentIndex);

          // Re-enable animations on the target scene after deletion
          // This ensures animations work normally when scrolling forward again
          const prevNavItem = navigationArray[targetSceneIndex];
          if (prevNavItem && prevNavItem.sceneState?.type === 'dialogue') {
            updateNavigationItemState(targetSceneIndex, {
              ...prevNavItem.sceneState,
              allowAnimate: true
            });
          }

          // Clear the pending deletion ref
          pendingDeletionRef.current = null;
        }, 2300); // TEMPORARY: Reduced from 1800ms for testing
      } else {
        // Text recorded: Transition to waiting-for-finalize (wait for final transcripts)
        console.log('⏳ Transitioning from input-recording to waiting-for-finalize, questionText:', finalQuestionText);

        // Update scene text (for speech bubble) before transitioning state
        if (activeRecordingId) {
          updateSceneTextByRecordingId(activeRecordingId, finalQuestionText);
        }

        updateNavigationItemState(navigationIndex, {
          type: 'dialogue',
          state: 'waiting-for-finalize',
          questionText: finalQuestionText // Persist question text in scene state
        });
      }
    }

    // Recording will stop automatically via the effect
    // Recording will send 'finalize' to get final transcripts
    // onFinalized callback will transition waiting-for-finalize -> ai-waiting
    // ChatFlowOrchestrator will trigger on ai-waiting
  }, [navigationIndex, navigationArray, sceneState, recording, updateNavigationItemState, addNavigationStateToCurrentScene, forceAdvanceNavigation, setNavigationIndex, deleteNavigationItem]);

  /**
   * Handle Accept button click (quest-showing state)
   * Advances navigation when quest is accepted
   */
  const handleAcceptQuest = useCallback(() => {
    console.log('🎯 RecordPanelOrchestrator: Accept button clicked, advancing navigation');
    forceAdvanceNavigation('forward');
  }, [forceAdvanceNavigation]);


  /**
   * Handle Answer button click - adds record-answer state and starts recording
   * Flow: input-showInput → record-answer (recording) → answer-waiting (AI validation)
   */
  const handleAnswerClick = useCallback(() => {
    console.log('💜 RecordPanelOrchestrator: Answer button clicked');

    // Step 1: Add record-answer state to current scene (same scene, new state)
    const recordAnswerIndex = addNavigationStateToCurrentScene(
      { type: 'dialogue', state: 'record-answer' },
      true  // Insert after current
    );

    console.log('💜 Added record-answer state at index:', recordAnswerIndex);

    // Step 2: Navigate to the new state using forceAdvanceNavigation
    // This will collapse the previous state (input-showInput) from the navigation array
    // so we don't have duplicate navigation items for the same scene
    forceAdvanceNavigation('forward');

    // Step 3: Recording will auto-start via the effect that watches for record-answer state
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
