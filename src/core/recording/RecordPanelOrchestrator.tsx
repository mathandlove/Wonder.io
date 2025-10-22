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

// Type guard for scenes with flowId
type SceneWithFlowId = Scene & {
  flowId?: string;
};

function hasFlowId(scene: Scene | undefined | null): scene is SceneWithFlowId {
  return scene !== null && scene !== undefined && 'flowId' in scene;
}

export function RecordingOrchestrator() {
  const { getCurrentNavigationItem, insertNavigationItem, deleteNavigationItem, addNavigationStateToCurrentScene, updateNavigationItemState, updateSceneTextByRecordingId, navigationIndex, setNavigationIndex, forceAdvanceNavigation, navigationArray } = useSceneManager();
  const { createRecordingScene, createFailDanceScene } = usePageFactory();
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
  // input-recording (actively recording), input-processing (processing audio), show-hint (hint display),
  // record-answer (answer recording), answer-processing (processing answer audio), waiting-for-answer-finalize,
  // answer-waiting (waiting for answer validation), answer-right (correct answer feedback),
  // answer-wrong (wrong answer feedback), ai-waiting (waiting for AI response)
  const dialogueState = sceneState?.type === 'dialogue' ? sceneState.state : null;
  const shouldShowPanel =
    dialogueState === 'basic' ||
    dialogueState === 'quest-showing' ||
    dialogueState === 'input-showInput' ||
    dialogueState === 'input-recording' ||
    dialogueState === 'input-processing' ||
    dialogueState === 'show-hint' ||
    dialogueState === 'record-answer' ||
    dialogueState === 'answer-processing' ||
    dialogueState === 'waiting-for-answer-finalize' ||
    dialogueState === 'answer-waiting' ||
    dialogueState === 'answer-right' ||
    dialogueState === 'answer-wrong' ||
    dialogueState === 'ai-waiting';


  // Get the active recording ID from the CURRENT SCENE (survives navigation!)
  // This is stored in the scene itself, not in component state
  const activeRecordingId = React.useMemo(() => {
    const scene = currentNavItem?.scene;
    if (scene && 'recordingId' in scene) {
      return (scene as { recordingId?: string }).recordingId || null;
    }
    return null;
  }, [currentNavItem]);

  // Track question count - resets when panel becomes hidden (basic state)
  const [, setQuestionCount] = React.useState<number>(0);

  // Ref to store handleRecordStop so it can be used in effects before it's defined
  const handleRecordStopRef = React.useRef<(() => void) | null>(null);

  // Track if we're currently stopping to prevent duplicate stop calls
  const isStoppingRef = React.useRef<boolean>(false);

  // ===================================
  // QUESTION TRACKING LOGIC
  // ===================================

  // Effect: Reset question count when panel becomes hidden (basic state)
  useEffect(() => {
    if (dialogueState === 'basic') {
      setQuestionCount(0);
    }
  }, [dialogueState]);

  // Effect: Auto-transition from answer-wrong to fail-dance scene, then back to ready state
  useEffect(() => {
    if (dialogueState === 'answer-wrong') {
      // Wait 2 seconds to show the red glow feedback, then insert fail-dance scene
      const timerId = setTimeout(() => {
        const currentState = sceneState?.type === 'dialogue' ? sceneState : null;
        if (currentState?.state === 'answer-wrong') {
          // Extract character information from current scene
          const scene = currentNavItem?.scene;
          let character = 'bakerMom'; // default - the one who gets angry
          let leftCharacter: string | undefined;
          let background: string | undefined;

          if (hasCharacterProperties(scene)) {
            // For quest failures, always use the right character (NPC/questgiver)
            // They're the one who gets upset when you give the wrong answer!
            const rightCharacter = scene['right-character'];
            leftCharacter = scene['left-character'];

            if (rightCharacter) {
              character = rightCharacter;
            } else if (leftCharacter) {
              character = leftCharacter;
            }
          }

          if (scene && 'background' in scene) {
            background = scene.background;
          }

          // Use PageFactory to create fail-dance scene
          const failDanceScene = createFailDanceScene(
            character,
            background,
            leftCharacter,
            null // right-character set to null to trigger exit animation
          );

          // Insert the fail-dance scene after current scene
          // Panel metadata (newCharacter, previousCharacter, etc.) will be automatically
          // injected by SceneManager's reactive effect when navigationArray changes
          const newNavItem = {
            scene: failDanceScene,
            sceneId: failDanceScene.sceneId!,
            sceneState: { type: 'static' as const },
            lockForward: false,
            lockBackward: false,
            index: navigationIndex + 1
          };

          insertNavigationItem(newNavItem, navigationIndex + 1);

          // Immediately transition current scene to input-showInput state (ready for retry)
          // This will be visible when we return from the fail-dance scene
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'input-showInput',
            questionText: currentState.questionText // Preserve question for retry
          });

          // Auto-advance to fail-dance scene after a brief moment
          setTimeout(() => {
            forceAdvanceNavigation('forward');

            // After fail-dance completes (3.5s), go back to the ready state scene
            setTimeout(() => {
              forceAdvanceNavigation('backward');
            }, 3600); // Slightly longer than animation to ensure it completes
          }, 100);
        }
      }, 2000); // Reduced from 4000 to 2000 since we're adding 3.5s animation

      return () => clearTimeout(timerId);
    }
  }, [dialogueState, sceneState, navigationIndex, updateNavigationItemState, currentNavItem, insertNavigationItem, forceAdvanceNavigation]);

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

  // EVENT-DRIVEN CLEANUP: Auto-stop recording when leaving recording states
  // NOTE: Recording START is now event-driven (happens in button handlers)
  // This effect only handles CLEANUP when states change unexpectedly
  React.useEffect(() => {
    const isRecordingState = sceneState?.type === 'dialogue' &&
      (sceneState.state === 'input-recording' || sceneState.state === 'record-answer');

    // Auto-stop recording when leaving recording states (cleanup only)
    if (!isRecordingState && recording.isRecording() && !isStoppingRef.current) {
      console.log('[RecordPanelOrchestrator] Auto-stopping recording (leaving recording state)');
      isStoppingRef.current = true;
      Recording.stop();

      // Reset stopping flag after a brief delay
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 100);
    }

    // NOTE: activeRecordingId is now derived from the scene, no manual cleanup needed!
  }, [sceneState, recording]);

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

    // Update input-processing, ai-waiting, and answer-waiting states when final transcript arrives from backend
    // This effect updates the text as soon as it arrives (before 'close' signal)

    // Get FRESH state every time (don't rely on effect dependency)
    const freshNavItem = getCurrentNavigationItem();
    const freshState = freshNavItem?.sceneState?.type === 'dialogue' ? freshNavItem.sceneState : null;

    // DEBUG: Log the current state check conditions
    console.log('[RecordPanelOrchestrator] Transcript sync check:', {
      isRecording,
      hasActiveRecordingId: !!activeRecordingId,
      hasDisplayText: !!displayText.trim(),
      displayText: displayText.substring(0, 50),
      freshStateType: freshState?.type,
      freshStateValue: freshState?.state
    });

    if (!isRecording && activeRecordingId && displayText.trim()) {
      console.log('[RecordPanelOrchestrator] 🔍 Conditions met for transcript processing. Fresh state:', freshState?.state);

      if (freshState?.state === 'input-processing') {
        // Final transcript arrived from backend - transition to ai-waiting
        const finalText = displayText.trim();
        console.log('[RecordPanelOrchestrator] Final transcript arrived in input-processing:', finalText);

        // Valid transcript - update questionText and transition to ai-waiting
        console.log('[RecordPanelOrchestrator] ✅ Transitioning from input-processing to ai-waiting with final text:', finalText);
        updateSceneTextByRecordingId(activeRecordingId, finalText);
        updateNavigationItemState(navigationIndex, {
          type: 'dialogue',
          state: 'ai-waiting',
          questionText: finalText
        });
      } else if (freshState?.state === 'ai-waiting') {
        // Final transcript arrived from backend (fallback if we somehow skipped input-processing)
        const finalText = displayText.trim();
        console.log('[RecordPanelOrchestrator] Final transcript arrived:', finalText);

        if (freshState.questionText !== finalText) {
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
      } else if (freshState?.state === 'answer-processing') {
        // Final transcript arrived from backend - transition to answer-waiting
        const finalText = displayText.trim();
        console.log('[RecordPanelOrchestrator] Final transcript arrived in answer-processing:', finalText);

        // Valid transcript - update answerText and transition to answer-waiting
        console.log('[RecordPanelOrchestrator] ✅ Transitioning from answer-processing to answer-waiting with final text:', finalText);
        updateNavigationItemState(navigationIndex, {
          type: 'dialogue',
          state: 'answer-waiting',
          answerText: finalText,
          questionText: freshState.questionText
        });
      } else if (freshState?.state === 'answer-waiting') {
        // Final transcript arrived for answer (fallback if we somehow skipped answer-processing)
        const finalText = displayText.trim();

        if (freshState.answerText !== finalText) {
          // Valid answer - update answerText in answer-waiting state
          console.log('[RecordPanelOrchestrator] ✅ Updating answer-waiting state with final text:', finalText);
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'answer-waiting',
            answerText: finalText,
            questionText: freshState.questionText
          });
        }
      } else {
        console.log('[RecordPanelOrchestrator] ⚠️  Unexpected state when final transcript arrived:', freshState?.state);
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

    // Register callback during recording or in processing/waiting states
    const shouldRegisterCallback =
      (currentState?.state === 'input-recording' && isRecording) ||
      (currentState?.state === 'record-answer' && isRecording) ||
      currentState?.state === 'input-processing' ||
      currentState?.state === 'answer-processing' ||
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
   * Handle recording start - EVENT DRIVEN APPROACH
   * Starts recording IMMEDIATELY, then updates states
   */
  const handleRecordStart = useCallback(async () => {
    try {
      // Generate unique recording ID
      const recordingId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('[RecordPanelOrchestrator] 🎙️ EVENT-DRIVEN: Starting recording IMMEDIATELY on click');

      // STEP 1: START RECORDING IMMEDIATELY (event-driven, not state-driven)
      // This happens FIRST, before any state changes or navigation
      // NOTE: recordingId will be stored in the scene itself (line 396)

      // Start recording - this will await audio initialization
      await Recording.start().catch((err) => {
        console.error('[RecordPanelOrchestrator] Failed to start recording:', err);
        throw err; // Re-throw to prevent state updates on failure
      });

      console.log('[RecordPanelOrchestrator] ✅ Recording started, NOW updating states');

      // STEP 2: NOW update UI states (happens AFTER recording is flowing)
      // Increment question counter - unlocks Answer button after first question
      setQuestionCount(prev => prev + 1);

      // Update current navigation item state from input-showInput to basic (locks auto-recalculated)
      updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'basic' });

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
    } catch {
      // Silent error handling - recording failed to start
    }
  }, [createRecordingScene, insertNavigationItem, updateNavigationItemState, navigationIndex, setNavigationIndex, currentNavItem]);

  /**
   * Handle recording stop - NEW BATCH PROCESSING FLOW
   * - User pushes stop button
   * - Transition to input-processing state (shows "Processing...")
   * - Backend will process the entire audio buffer and return ONE final transcript
   * - When final transcript arrives, transition to ai-waiting state
   * - ChatFlowOrchestrator will trigger AI processing on ai-waiting state
   */
  const handleRecordStop = useCallback(() => {
    const currentState = sceneState?.type === 'dialogue' ? sceneState : null;

    if (currentState?.state === 'record-answer') {
      // Answer recording: Transition to answer-processing to show "Processing..."
      // Backend will process audio and send final transcript
      // When transcript arrives, we'll transition to answer-waiting
      const currentAnswerText = currentState.answerText || '';
      console.log('[RecordPanelOrchestrator] 🛑 Stop answer recording, transitioning to answer-processing with text:', currentAnswerText);

      updateNavigationItemState(navigationIndex, {
        type: 'dialogue',
        state: 'answer-processing',
        answerText: currentAnswerText, // Will be updated when final transcript arrives
        questionText: currentState.questionText // Preserve question text
      });
    } else if (currentState?.state === 'input-recording') {
      // Ask recording: Transition to input-processing to show "Processing..."
      // Backend will process audio and send final transcript
      // When transcript arrives, we'll transition to ai-waiting
      const currentQuestionText = currentState.questionText || '';
      console.log('[RecordPanelOrchestrator] 🛑 Stop recording, transitioning to input-processing with text:', currentQuestionText);

      // Update scene text (for speech bubble) before transitioning state
      if (activeRecordingId && currentQuestionText) {
        updateSceneTextByRecordingId(activeRecordingId, currentQuestionText);
      }

      updateNavigationItemState(navigationIndex, {
        type: 'dialogue',
        state: 'input-processing',
        questionText: currentQuestionText // Will be updated when final transcript arrives
      });
    }

    // Recording will stop automatically via the effect
    // Recording will send 'finalize' to backend
    // Backend will process complete audio and send ONE final transcript
    // onFinal callback will update the text in input-processing state
    // When transcript arrives, transcript sync effect will transition to ai-waiting
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
   * Handle Answer button click - EVENT DRIVEN APPROACH
   * Starts recording IMMEDIATELY, then updates states
   * Pattern matches handleRecordStart for consistency
   */
  const handleAnswerClick = useCallback(async () => {
    try {
      // Generate unique recording ID
      const recordingId = `answer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('[RecordPanelOrchestrator] 🎙️ EVENT-DRIVEN: Starting ANSWER recording IMMEDIATELY on click');

      // STEP 1: START RECORDING IMMEDIATELY (event-driven, not state-driven)
      // This happens FIRST, before any state changes or navigation
      await Recording.start().catch((err) => {
        console.error('[RecordPanelOrchestrator] Failed to start answer recording:', err);
        throw err; // Re-throw to prevent state updates on failure
      });

      console.log('[RecordPanelOrchestrator] ✅ Answer recording started, NOW updating states');

      // STEP 2: NOW update UI states (happens AFTER recording is flowing)
      // CRITICAL: Add recordingId to the current scene so activeRecordingId can be derived
      const currentItem = getCurrentNavigationItem();
      if (currentItem?.scene) {
        // Add recordingId property to the scene (type assertion needed)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (currentItem.scene as any).recordingId = recordingId;
        console.log('[RecordPanelOrchestrator] ✅ Added recordingId to current scene:', recordingId);
      }

      // Add record-answer state to current scene (same scene, new state)
      addNavigationStateToCurrentScene(
        { type: 'dialogue', state: 'record-answer' },
        true  // Insert after current
      );

      // Navigate to the new state using forceAdvanceNavigation
      // This will collapse the previous state (input-showInput) from the navigation array
      forceAdvanceNavigation('forward');
    } catch {
      // Silent error handling - recording failed to start
    }
  }, [addNavigationStateToCurrentScene, forceAdvanceNavigation, getCurrentNavigationItem]);

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
                      presentationState === 'answer-processing' ||
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
