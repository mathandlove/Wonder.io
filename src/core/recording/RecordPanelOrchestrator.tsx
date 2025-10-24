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
import { getCurrentNode, getCurrentNodeId, insertSceneNodes, addStateToCurrentNode, updateNodeState, updateSceneTextByRecordingId, forceAdvanceNavigation } from '@core/navigation/navigationHelpers';
import { useSceneFlowMetadata } from '@core/data/FlowMetadataStore';
import { useSceneFactory } from '@core/navigation/SceneFactory';
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
  const { createRecordingScene, createFailDanceScene, createSuccessDanceScene } = useSceneFactory();
  const recording = useRecording();


  // Get current node from navigation graph
  const currentNode = getCurrentNode();
  const currentScene = currentNode?.scene;

  // Memoize sceneState based on its actual content to prevent unnecessary re-renders
  const sceneState = React.useMemo(() => {
    return currentNode?.sceneState || null;
  }, [currentNode?.sceneState]);

  // Get flow metadata for quest text
  const flowMetadata = useSceneFlowMetadata(hasFlowId(currentScene) ? currentScene : null);

  // Determine if panel should be visible based on dialogue state or scene type
  // Show for: basic (hidden below screen), input-basic (hidden below screen), quest-showing (quest offer),
  // input-showInput (ready to record), input-recording (actively recording), input-processing (processing audio),
  // show-hint (hint display), record-answer (answer recording), answer-processing (processing answer audio),
  // waiting-for-answer-finalize, answer-waiting (waiting for answer validation), answer-right (correct answer feedback),
  // answer-wrong (wrong answer feedback), ai-waiting (waiting for AI response)
  // Also show for success-dance scenes (with answer text visible, positioned below screen)
  // Also show for fail-dance scenes (with answer-wrong styling: answer text, quest, and seal visible)
  // Also show for static scenes (positioned below screen, ready to animate in if state changes)
  const dialogueState = sceneState?.type === 'dialogue' ? sceneState.state : null;
  const isStaticScene = sceneState?.type === 'static';
  const isSuccessDanceScene = currentScene?.type === 'success-dance';
  const isFailDanceScene = currentScene?.type === 'fail-dance';
  const shouldShowPanel =
    sceneState?.type === 'dialogue' ||
    isStaticScene ||
    isSuccessDanceScene ||
    isFailDanceScene;


  // Get the active recording ID from the CURRENT SCENE (survives navigation!)
  // This is stored in the scene itself, not in component state
  const activeRecordingId = React.useMemo(() => {
    const scene = currentNode?.scene;
    if (scene && 'recordingId' in scene) {
      return (scene as { recordingId?: string }).recordingId || null;
    }
    return null;
  }, [currentNode]);

  // Track question count for enabling Answer (todo)
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

  // Track when answer-wrong video completes
  const [answerWrongVideoComplete, setAnswerWrongVideoComplete] = React.useState(false);

  // Reset video complete flag when leaving answer-wrong state
  React.useEffect(() => {
    if (dialogueState !== 'answer-wrong') {
      setAnswerWrongVideoComplete(false);
    }
  }, [dialogueState]);

  // Callback for when answer-wrong video completes
  const handleAnswerWrongVideoComplete = React.useCallback(() => {
    setAnswerWrongVideoComplete(true);
  }, []);

  // Track when answer-right video completes
  const [answerRightVideoComplete, setAnswerRightVideoComplete] = React.useState(false);

  // Reset video complete flag when leaving answer-right state
  React.useEffect(() => {
    if (dialogueState !== 'answer-right') {
      setAnswerRightVideoComplete(false);
    }
  }, [dialogueState]);

  // Callback for when answer-right video completes
  const handleAnswerRightVideoComplete = React.useCallback(() => {
    setAnswerRightVideoComplete(true);
  }, []);

  // Effect: Auto-transition from answer-wrong to fail-dance scene, triggered 1 second AFTER video ends
  useEffect(() => {
    if (dialogueState === 'answer-wrong' && answerWrongVideoComplete) {
      // Wait 1 second after video completes to show the red glow feedback, then insert fail-dance scene
      const timerId = setTimeout(() => {
        const currentState = sceneState?.type === 'dialogue' ? sceneState : null;
        if (currentState?.state === 'answer-wrong') {
          // Extract character information from current scene
          const scene = currentNode?.scene;
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

          // Get the answer and question text to display in the record panel during fail-dance
          const answerText = currentState.answerText || '';
          const questionText = currentState.questionText || '';

          // Use SceneFactory to create fail-dance scene
          const failDanceScene = createFailDanceScene(
            character,
            answerText,
            questionText,
            background,
            leftCharacter,
            undefined // right-character set to undefined to trigger exit animation
          );

          // Insert the fail-dance scene after current node using synchronous insertion
          // This properly maintains the state-node graph structure
          const currentNodeId = getCurrentNodeId();
          insertSceneNodes(currentNodeId, failDanceScene);

          // Wait 2 seconds before transitioning current scene to input-showInput state
          // This keeps the answer-wrong visual feedback visible longer before conversion
          setTimeout(() => {
            // Transition current node to input-showInput state (ready for retry)
            // This will be visible when we return from the fail-dance scene
            const currentNodeId = getCurrentNodeId();
            if (currentNodeId) {
              updateNodeState(currentNodeId, {
                type: 'dialogue',
                state: 'input-showInput',
                questionText: currentState.questionText // Preserve question for retry
              });
            }
          }, 2000);

          // Auto-advance to fail-dance scene after a brief moment
          // Note: FailDanceScene will handle navigating back when animation completes
          setTimeout(() => {
            forceAdvanceNavigation('forward');
          }, 100);
        }
      }, 1000); // Wait 1 second after video ends

      return () => clearTimeout(timerId);
    }
     
  }, [dialogueState, answerWrongVideoComplete, sceneState, currentNode?.scene, createFailDanceScene]);

  // Effect: Auto-transition from answer-right to success-dance scene, triggered AFTER video ends
  useEffect(() => {
    if (dialogueState === 'answer-right' && answerRightVideoComplete) {
      // Transition to success-dance scene immediately after video completes
      // The record panel will maintain the same appearance during success-dance
      const timerId = setTimeout(() => {
        const currentState = sceneState?.type === 'dialogue' ? sceneState : null;
        if (currentState?.state === 'answer-right') {
          // Extract character information from current scene
          const scene = currentNode?.scene;
          let character = 'bakerMom'; // default - the one who celebrates
          let leftCharacter: string | undefined;
          let rightCharacter: string | undefined;
          let background: string | undefined;

          if (hasCharacterProperties(scene)) {
            // Preserve BOTH characters exactly as they are in the current scene
            leftCharacter = scene['left-character'];
            rightCharacter = scene['right-character'];

            // Character is used for the old success-dance animation (will be removed later)
            if (rightCharacter) {
              character = rightCharacter;
            } else if (leftCharacter) {
              character = leftCharacter;
            }
          }

          if (scene && 'background' in scene) {
            background = scene.background;
          }

          // Get the answer text to display in the record panel
          const answerText = currentState.answerText || '';

          // Use SceneFactory to create success-dance scene
          // IMPORTANT: Pass BOTH left and right characters to keep them in their panels
          const successDanceScene = createSuccessDanceScene(
            character,
            answerText,
            background,
            leftCharacter,
            rightCharacter // Keep the right character (don't set to null)
          );

          // Insert the success-dance scene after current node using synchronous insertion
          const currentNodeId = getCurrentNodeId();
          insertSceneNodes(currentNodeId, successDanceScene);

          // Auto-advance to success-dance scene immediately
          // Note: We don't update the current scene state to 'basic' before navigating
          // This prevents visual flicker/unwanted navigation during the transition
          forceAdvanceNavigation('forward');

          // After navigating away, update the previous node to basic state
          // This ensures if user scrolls back, the answer-right scene is in basic state
          setTimeout(() => {
            const currentNodeId = getCurrentNodeId();
            if (currentNodeId) {
              updateNodeState(currentNodeId, {
                type: 'dialogue',
                state: 'basic'
              });
            }
          }, 100);
        }
      }, 100); // Minimal delay, just enough for state to settle

      return () => clearTimeout(timerId);
    }
  }, [dialogueState, answerRightVideoComplete, sceneState, currentNode?.scene, createSuccessDanceScene]);

  // ===================================
  // RECORDING FLOW LOGIC
  // ===================================

  // RECORDING LIFECYCLE: Recording is controlled ONLY by user button clicks
  // - Start: User clicks Ask/Answer button → handleRecordStart/handleAnswerClick
  // - Stop: User clicks Stop button → handleRecordStop
  // NO automatic stopping based on scene state changes!

  // Sync recording transcript - simplified for batch processing
  // During recording, we don't get real-time updates anymore
  // After stop, we receive ONE final transcript which updates ai-waiting or answer-waiting state
  const displayText = recording.getDisplayText();
  const isRecording = recording.isRecording();

  React.useEffect(() => {
    // Only sync during active recording (no partial updates, but keep UI responsive)
    if (isRecording && activeRecordingId) {
      // Read fresh state on each update
      const freshNode = getCurrentNode();
      const currentState = freshNode?.sceneState?.type === 'dialogue' ? freshNode.sceneState : null;

      if (currentState?.state === 'input-recording') {
        // Ask recording: Update scene text minimally (backend will provide final on stop)
        // We don't get real-time transcripts anymore, but keep state synced
        if (currentState.questionText !== displayText && displayText) {
          updateSceneTextByRecordingId(activeRecordingId, displayText);
          const currentNodeId = getCurrentNodeId();
          if (currentNodeId) {
            updateNodeState(currentNodeId, {
              type: 'dialogue',
              state: 'input-recording',
              questionText: displayText
            });
          }
        }
      } else if (currentState?.state === 'record-answer') {
        // Answer recording: Update answerText minimally
        if (currentState.answerText !== displayText && displayText) {
          const currentNodeId = getCurrentNodeId();
          if (currentNodeId) {
            updateNodeState(currentNodeId, {
              type: 'dialogue',
              state: 'record-answer',
              answerText: displayText,
              questionText: currentState.questionText
            });
          }
        }
      }
    }

    // Update input-processing, ai-waiting, and answer-waiting states when final transcript arrives from backend
    // This effect updates the text as soon as it arrives (before 'close' signal)

    // Get FRESH state every time (don't rely on effect dependency)
    const freshNode = getCurrentNode();
    const freshState = freshNode?.sceneState?.type === 'dialogue' ? freshNode.sceneState : null;

    if (!isRecording && activeRecordingId && displayText.trim()) {

      if (freshState?.state === 'input-processing') {
        // Final transcript arrived from backend - transition to ai-waiting
        const finalText = displayText.trim();

        // Valid transcript - update questionText and transition to ai-waiting
        updateSceneTextByRecordingId(activeRecordingId, finalText);
        const currentNodeId = getCurrentNodeId();
        if (currentNodeId) {
          updateNodeState(currentNodeId, {
            type: 'dialogue',
            state: 'ai-waiting',
            questionText: finalText
          });
        }
      } else if (freshState?.state === 'ai-waiting') {
        // Final transcript arrived from backend (fallback if we somehow skipped input-processing)
        const finalText = displayText.trim();

        if (freshState.questionText !== finalText) {
          // Valid transcript - update questionText in ai-waiting state
          updateSceneTextByRecordingId(activeRecordingId, finalText);
          const currentNodeId = getCurrentNodeId();
          if (currentNodeId) {
            updateNodeState(currentNodeId, {
              type: 'dialogue',
              state: 'ai-waiting',
              questionText: finalText
            });
          }
        } 
      } else if (freshState?.state === 'answer-processing') {
        // Final transcript arrived from backend - transition to answer-waiting
        const finalText = displayText.trim();

        // Valid transcript - update answerText and transition to answer-waiting
        const currentNodeId = getCurrentNodeId();
        if (currentNodeId) {
          updateNodeState(currentNodeId, {
            type: 'dialogue',
            state: 'answer-waiting',
            answerText: finalText,
            questionText: freshState.questionText
          });
        }
      } else if (freshState?.state === 'answer-waiting') {
        // Final transcript arrived for answer (fallback if we somehow skipped answer-processing)
        const finalText = displayText.trim();

        if (freshState.answerText !== finalText) {
          // Valid answer - update answerText in answer-waiting state
          const currentNodeId = getCurrentNodeId();
          if (currentNodeId) {
            updateNodeState(currentNodeId, {
              type: 'dialogue',
              state: 'answer-waiting',
              answerText: finalText,
              questionText: freshState.questionText
            });
          }
        }
      }
    }
  }, [displayText, isRecording, sceneState, activeRecordingId]);

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

      // STEP 1: START RECORDING IMMEDIATELY (event-driven, not state-driven)
      // This happens FIRST, before any state changes or navigation
      // NOTE: recordingId will be stored in the scene itself (line 396)

      // Start recording - this will await audio initialization
      await Recording.start().catch((err) => {
        console.error('[RecordPanelOrchestrator] Failed to start recording:', err);
        throw err; // Re-throw to prevent state updates on failure
      });


      // STEP 2: NOW update UI states (happens AFTER recording is flowing)
      // Increment question counter - unlocks Answer button after first question
      setQuestionCount(prev => prev + 1);

      // Get current node ID for both state update and scene insertion
      const currentNodeId = getCurrentNodeId();

      // Update current node state from input-showInput to basic (locks auto-recalculated)
      if (currentNodeId) {
        updateNodeState(currentNodeId, { type: 'dialogue', state: 'basic' });
      }

      // Create a new CharacterScene, inheriting context from current scene
      const scene = currentNode?.scene;
      const currentBackground = scene && 'background' in scene ? scene.background : undefined;
      const leftCharacter = hasCharacterProperties(scene) ? scene['left-character'] : undefined;
      const rightCharacter = hasCharacterProperties(scene) ? scene['right-character'] : undefined;
      const flowId = hasFlowId(scene) ? scene.flowId : undefined;

      const newScene = createRecordingScene(recordingId, currentBackground, leftCharacter, rightCharacter);

      // Copy flowId from the original scene to the recording scene
      if (flowId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newScene as any).flowId = flowId;
      }

      // Insert scene after current node (not scene) to ensure proper positioning
      // This properly maintains the state-node graph structure
      console.log('[handleRecordStart] ===== BEFORE INSERT =====');
      console.log('[handleRecordStart] Current node ID:', currentNodeId);
      console.log('[handleRecordStart] New recording scene:', newScene);

      // Use insertSceneNodes for synchronous scene insertion
      // This avoids the race condition where forceAdvanceNavigation reads stale graph
      const insertedNodeId = insertSceneNodes(currentNodeId, newScene);

      console.log('[handleRecordStart] ===== AFTER INSERT =====');
      console.log('[handleRecordStart] Inserted node ID:', insertedNodeId);
      console.log('[handleRecordStart] About to navigate forward...');

      // Navigate to the new recording state
      forceAdvanceNavigation('forward');
    } catch {
      // Silent error handling - recording failed to start
    }
  }, [currentNode?.scene, createRecordingScene]);

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
    const currentNodeId = getCurrentNodeId();

    if (!currentNodeId) return;

    if (currentState?.state === 'record-answer') {
      // Answer recording: Transition to answer-processing to show "Processing..."
      // Backend will process audio and send final transcript
      // When transcript arrives, we'll transition to answer-waiting
      const currentAnswerText = currentState.answerText || '';

      updateNodeState(currentNodeId, {
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

      // Update scene text (for speech bubble) before transitioning state
      if (activeRecordingId && currentQuestionText) {
        updateSceneTextByRecordingId(activeRecordingId, currentQuestionText);
      }

      updateNodeState(currentNodeId, {
        type: 'dialogue',
        state: 'input-processing',
        questionText: currentQuestionText // Will be updated when final transcript arrives
      });
    }

    // CRITICAL: Actually stop the recording!
    // This will send 'finalize' to backend
    // Backend will process complete audio and send ONE final transcript
    // onFinal callback will update the text in input-processing state
    // When transcript arrives, transcript sync effect will transition to ai-waiting
    // ChatFlowOrchestrator will trigger AI processing when in ai-waiting state
    Recording.stop();
  }, [sceneState, activeRecordingId]);

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
  }, []);


  /**
   * Handle Answer button click - EVENT DRIVEN APPROACH
   * Starts recording IMMEDIATELY, then updates states
   * Pattern matches handleRecordStart for consistency
   */
  const handleAnswerClick = useCallback(async () => {
    try {
      // Generate unique recording ID
      const recordingId = `answer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // STEP 1: START RECORDING IMMEDIATELY (event-driven, not state-driven)
      // This happens FIRST, before any state changes or navigation
      await Recording.start().catch((err) => {
        console.error('[RecordPanelOrchestrator] Failed to start answer recording:', err);
        throw err; // Re-throw to prevent state updates on failure
      });


      // STEP 2: NOW update UI states (happens AFTER recording is flowing)
      // CRITICAL: Add recordingId to the current scene so activeRecordingId can be derived
      const currentItem = getCurrentNode();
      if (currentItem?.scene) {
        // Add recordingId property to the scene (type assertion needed)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (currentItem.scene as any).recordingId = recordingId;
      }

      // Add record-answer state to current scene (same scene, new state)
      addStateToCurrentNode(
        { type: 'dialogue', state: 'record-answer' },
        true  // Insert after current
      );

      // Navigate to the new state using forceAdvanceNavigation
      // This will collapse the previous state (input-showInput) from the navigation array
      forceAdvanceNavigation('forward');
    } catch {
      // Silent error handling - recording failed to start
    }
  }, []);

  // Don't render if panel shouldn't be visible
  if (!shouldShowPanel) {
    return null;
  }

  // Answer button locked state: Unlocked when user has asked at least 1 question
  // DEBUG: Always unlocked for testing
  const answerUnlocked = true; // questionCount >= 1;
  const questState = answerUnlocked ? 'complete' : 'active';

  // Get dialogue state for visual presentation
  // For success-dance scenes, use 'success-dance' (mirrors fail-dance pattern)
  // For fail-dance scenes, use 'fail-dance' to show answer-wrong styling (answer + quest + seal)
  // For static scenes or when dialogueState is null, use 'basic' (panel hidden below screen)
  const presentationState = isSuccessDanceScene
    ? 'success-dance'
    : isFailDanceScene
      ? 'fail-dance'
      : isStaticScene
        ? 'basic'
        : (dialogueState || 'basic');

  // Determine which handler to use for the primary action button
  // - quest-showing state: Accept button triggers quest acceptance
  // - other states with Answer button: Answer button triggers answer recording
  const isQuestShowing = presentationState === 'quest-showing';
  const primaryActionHandler = isQuestShowing ? handleAcceptQuest : handleAnswerClick;

  // Get answer text from scene state (persisted across state transitions)
  // Falls back to recording context for real-time display during recording
  // For success-dance and fail-dance scenes, get the answer text from the scene
  const answerText = isSuccessDanceScene
    ? (currentScene as { answerText?: string }).answerText
    : isFailDanceScene
      ? (currentScene as { answerText?: string }).answerText
      : (presentationState === 'record-answer' ||
         presentationState === 'answer-processing' ||
         presentationState === 'waiting-for-answer-finalize' ||
         presentationState === 'answer-waiting' ||
         presentationState === 'answer-right' ||
         presentationState === 'answer-wrong')
        ? (sceneState?.type === 'dialogue' ? sceneState.answerText : undefined) || recording.getDisplayText()
        : undefined;

  // Get quest text - for fail-dance scenes, use the questionText stored in the scene
  const questText = isFailDanceScene
    ? (currentScene as { questionText?: string }).questionText || flowMetadata?.questText
    : flowMetadata?.questText;

  return (
    <RecordPanel
      key="record-panel-singleton" // Stable key to prevent remounting on state changes
      disabled={false}  // Recording is always enabled when this panel shows
      questState={questState}
      dialogueState={presentationState}
      questText={questText}
      answerText={answerText}
      onNext={primaryActionHandler}
      onRecordStart={handleRecordStart}
      onRecordStop={handleRecordStop}
      onAskClick={handleRecordStart} // Ask button triggers recording start
      onAnswerWrongVideoComplete={handleAnswerWrongVideoComplete} // Callback when answer-wrong video ends
      onAnswerRightVideoComplete={handleAnswerRightVideoComplete} // Callback when answer-right video ends
    />
  );
}
