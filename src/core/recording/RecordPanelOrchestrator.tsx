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
import { getCurrentNode, getCurrentNodeId, insertSceneNodes, advanceNavigation, updateCurrentPhase, updateCurrentSceneProperties } from '@core/navigation/navigationHelpers';
import { useNavigationStore } from '@core/navigation/navigationStore';
import { useSceneFlowMetadata } from '@core/data/FlowMetadataStore';
import { createFailDanceScene, createSuccessDanceScene } from '@core/navigation/sceneFactoryFunctions';
import { Recording } from '@core/recording/RecordingAPI';
import { RecordPanel } from './RecordPanel';
import { useRecording } from './RecordingContext';
import type { Scene, CharacterScene } from '@core/types/scene';
import * as navigationBus from '@core/navigation/events/navigationBus';

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
  const recording = useRecording();


  // Get current node from navigation graph
  const currentNode = getCurrentNode();
  const currentScene = currentNode?.scene;

  // Get the current phase from the node (single source of truth for UI state)
  const phase = React.useMemo(() => {
    return currentNode?.phase || null;
  }, [currentNode?.phase]);

  // Get flow metadata for quest text
  const flowMetadata = useSceneFlowMetadata(hasFlowId(currentScene) ? currentScene : null);

  // Determine if panel should be visible based on phase or scene type
  // Show for dialogue phases: basic, quest-showing, input, input-recording, input-processing, ai-waiting,
  // record-answer, answer-processing, answer-waiting, answer-right, answer-wrong
  // Also show for success-dance and fail-dance scenes
  const isSuccessDanceScene = currentScene?.type === 'success-dance';
  const isFailDanceScene = currentScene?.type === 'fail-dance';
  const isDialogueScene = currentScene?.type === 'character' || currentScene?.type === 'character-flow';
  const shouldShowPanel = isDialogueScene || isSuccessDanceScene || isFailDanceScene;


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

  // Effect: Reset question count when panel becomes hidden (basic phase)
  useEffect(() => {
    if (phase === 'basic') {
      setQuestionCount(0);
    }
  }, [phase]);

  // Track when answer-wrong video completes
  const [answerWrongVideoComplete, setAnswerWrongVideoComplete] = React.useState(false);

  // Reset video complete flag when leaving answer-wrong phase
  React.useEffect(() => {
    if (phase !== 'answer-wrong') {
      setAnswerWrongVideoComplete(false);
    }
  }, [phase]);

  // Callback for when answer-wrong video completes
  const handleAnswerWrongVideoComplete = React.useCallback(() => {
    setAnswerWrongVideoComplete(true);
  }, []);

  // Track when answer-right video completes
  const [answerRightVideoComplete, setAnswerRightVideoComplete] = React.useState(false);

  // Reset video complete flag when leaving answer-right phase
  React.useEffect(() => {
    if (phase !== 'answer-right') {
      setAnswerRightVideoComplete(false);
    }
  }, [phase]);

  // Callback for when answer-right video completes
  const handleAnswerRightVideoComplete = React.useCallback(() => {
    setAnswerRightVideoComplete(true);
  }, []);

  // Effect: Auto-transition from answer-wrong to fail-dance scene, triggered 1 second AFTER video ends
  useEffect(() => {
    if (phase === 'answer-wrong' && answerWrongVideoComplete) {
      // Wait 1 second after video completes to show the red glow feedback, then insert fail-dance scene
      const timerId = setTimeout(() => {
        const freshNode = getCurrentNode();
        if (freshNode?.phase === 'answer-wrong') {
          // Extract character information from current scene
          const scene = freshNode.scene;
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
          const characterScene = scene as CharacterScene;
          const answerText = characterScene.answerText || '';
          const questionText = characterScene.questionText || '';

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
          if (!currentNodeId) {
            console.error('[RecordPanelOrchestrator] No current node ID - cannot insert fail-dance scene');
            return;
          }
          // Insert the fail-dance scene after current node
          insertSceneNodes(currentNodeId, failDanceScene);

          // Auto-advance to fail-dance scene after a brief moment
          setTimeout(() => {
            // Before navigating, reset the question scene phase from 'answer-wrong' to 'basic'
            // This cleans up the question scene so it's ready for potential retry
            useNavigationStore.getState().updateNodePhase(currentNodeId, 'basic');
            console.log('[RecordPanelOrchestrator] Reset question scene phase: answer-wrong → basic');

            advanceNavigation('forward');

            // Emit VIDEO_COMPLETE event after fail-dance animation completes (3.5s + 100ms buffer)
            // Machine will handle navigation back and phase reset
            setTimeout(() => {
              const failDanceNodeId = getCurrentNodeId();
              console.log('[RecordPanelOrchestrator] 🎬 Fail dance animation complete - emitting VIDEO_COMPLETE');
              navigationBus.emit({
                type: 'VIDEO_COMPLETE',
                nodeId: failDanceNodeId || '',
                videoType: 'fail-dance'
              });
            }, 3600); // 3.5s animation + 100ms buffer
          }, 100);
        }
      }, 1000); // Wait 1 second after video ends

      return () => clearTimeout(timerId);
    }

  }, [phase, answerWrongVideoComplete]);

  // Effect: Auto-transition from answer-right to success-dance scene, triggered AFTER video ends
  useEffect(() => {
    if (phase === 'answer-right' && answerRightVideoComplete) {
      const freshNode = getCurrentNode();
      if (freshNode?.phase === 'answer-right') {
        // Extract character information from current scene
        const scene = freshNode.scene;
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

        console.log('[RecordPanelOrchestrator] 🔍 Extracting properties for success-dance:', {
          sceneType: scene?.type,
          background,
          hasBackground: scene && 'background' in scene,
          leftCharacter,
          rightCharacter,
          character
        });

        // Get the answer text to display in the record panel
        const characterScene = scene as CharacterScene;
        const answerText = characterScene.answerText || '';

        // STEP 1: Create success-dance scene using SceneFactory
        // IMPORTANT: Pass BOTH left and right characters to keep them in their panels
        const successDanceScene = createSuccessDanceScene(
          character,
          answerText,
          background,
          leftCharacter,
          rightCharacter // Keep the right character (don't set to null)
        );

        // STEP 2: Capture answer-right node ID (current node)
        const answerRightNodeId = getCurrentNodeId();
        if (!answerRightNodeId) return;

        // STEP 3: Insert the success-dance scene after current node
        // TODO: [Navigation Refactor] Replace with event bus emission
        // emit({ type: 'ANSWER_VALIDATED', nodeId: answerRightNodeId, isCorrect: true })
        console.log('[RecordPanelOrchestrator] 🔗 Graph before insert:', {
          currentNodeId: answerRightNodeId,
          currentNode: useNavigationStore.getState().graph.byId[answerRightNodeId],
          nextNodeId: useNavigationStore.getState().graph.byId[answerRightNodeId]?.nextId
        });

        const newSceneId = insertSceneNodes(answerRightNodeId, successDanceScene);

        console.log('[RecordPanelOrchestrator] 🔗 Graph after insert:', {
          newSceneId,
          newNode: useNavigationStore.getState().graph.byId[newSceneId || ''],
          currentNode: useNavigationStore.getState().graph.byId[answerRightNodeId]
        });

        // STEP 4: Update answer-right node to basic phase (will be visible when we return)
        useNavigationStore.getState().updateNodePhase(answerRightNodeId, 'basic');

        // STEP 5: Navigate forward to success-dance scene
        // TODO: [Navigation Refactor] Orchestrators should NOT call navigation directly
        // This should emit an event to the navigation machine instead
        // emit({ type: 'REQUEST_NAV_NEXT' })
        advanceNavigation('forward');
      }
    }
  }, [phase, answerRightVideoComplete]);

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
    // Read current node fresh on each update (not from closure)
    const node = getCurrentNode();
    if (!node) return;

    const { phase, scene } = node;
    const characterScene = scene as CharacterScene;

    // During active recording: sync transcript to scene
    if (isRecording && activeRecordingId) {
      if (phase === 'input-recording' && characterScene.questionText !== displayText && displayText) {
        // Ask recording: Update scene text minimally (backend will provide final on stop)
        useNavigationStore.getState().updateSceneTextByRecordingId(activeRecordingId, displayText);
        updateCurrentSceneProperties({ questionText: displayText });
      } else if (phase === 'record-answer' && characterScene.answerText !== displayText && displayText) {
        // Answer recording: Update answerText minimally
        updateCurrentSceneProperties({ answerText: displayText });
      }
    }

    // When recording stops: handle final transcript and phase transitions
    if (!isRecording && activeRecordingId && displayText.trim()) {
      const finalText = displayText.trim();

      if (phase === 'input-processing') {
        // Final transcript arrived - emit RECORDING_PROCESSED to xState machine
        // Machine will store transcript and transition from askProcessing → askWaitingForAI
        // XState now handles all store mutations (unidirectional data flow)
        console.log('[RecordPanelOrchestrator] 📤 Emitting RECORDING_PROCESSED event with transcript:', finalText.substring(0, 50));
        navigationBus.emit({
          type: 'RECORDING_PROCESSED',
          transcript: finalText,
          recordingId: activeRecordingId
        });
      } else if (phase === 'ai-waiting' && characterScene.questionText !== finalText) {
        // Fallback: Update questionText in ai-waiting phase (if we somehow skipped input-processing)
        // This should rarely happen with proper state machine flow
        console.warn('[RecordPanelOrchestrator] ⚠️ Updating questionText in ai-waiting phase (fallback path)');
        updateCurrentSceneProperties({ questionText: finalText });
      } else if (phase === 'answer-processing') {
        // Final transcript arrived - emit RECORDING_PROCESSED to xState machine
        // Machine will store answer and transition from answerProcessing → answerValidating
        // XState now handles all store mutations (unidirectional data flow)
        console.log('[RecordPanelOrchestrator] 📤 Emitting RECORDING_PROCESSED event with answer:', finalText.substring(0, 50));
        navigationBus.emit({
          type: 'RECORDING_PROCESSED',
          transcript: finalText,
          recordingId: activeRecordingId
        });
      } else if (phase === 'answer-waiting' && characterScene.answerText !== finalText) {
        // Fallback: Update answerText in answer-waiting phase (if we somehow skipped answer-processing)
        // This should rarely happen with proper state machine flow
        console.warn('[RecordPanelOrchestrator] ⚠️ Updating answerText in answer-waiting phase (fallback path)');
        updateCurrentSceneProperties({ answerText: finalText });
      }
    }
  }, [displayText, isRecording, activeRecordingId]);

  // Register onAutoStop callback when in recording phases
  // This allows the auto-stop timeout to call handleRecordStop and transition phase properly
  React.useEffect(() => {
    const isInRecordingPhase =
      (phase === 'input-recording' && isRecording) ||
      (phase === 'record-answer' && isRecording);

    if (isInRecordingPhase && handleRecordStopRef.current) {
      recording.setOnAutoStop(handleRecordStopRef.current);
      return () => recording.setOnAutoStop(null);
    } else {
      recording.setOnAutoStop(null);
    }
  }, [phase, isRecording, recording]);

  // Register onFinalized callback - triggers when backend sends 'close' signal
  // Just log for debugging - ChatFlowOrchestrator will handle empty transcripts
  React.useEffect(() => {
    // Register callback during recording or in processing/waiting phases
    const shouldRegisterCallback =
      (phase === 'input-recording' && isRecording) ||
      (phase === 'record-answer' && isRecording) ||
      phase === 'input-processing' ||
      phase === 'answer-processing' ||
      phase === 'ai-waiting' ||
      phase === 'answer-waiting';

    if (shouldRegisterCallback) {
      // Register callback that will fire when backend sends 'close' signal
      recording.setOnFinalized(() => {});
      return () => recording.setOnFinalized(null);
    } else {
      // Not in a phase that needs callback - make sure it's cleared
      recording.setOnFinalized(null);
    }
  }, [phase, isRecording, recording]);

  /**
   * Handle recording start - ORCHESTRATOR-FIRST APPROACH
   * Orchestrator handles complex business logic, then emits event to machine
   */
  const handleRecordStart = useCallback(async () => {
    try {
      // Increment question counter - unlocks Answer button after first question
      setQuestionCount(prev => prev + 1);

      // Generate unique recording ID
      const recordingId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // STEP 1: START RECORDING IMMEDIATELY (critical for responsiveness)
      await Recording.start().catch((err) => {
        console.error('[RecordPanelOrchestrator] Failed to start recording:', err);
        throw err; // Re-throw to prevent state updates on failure
      });

      // STEP 2: Update current node phase from input to basic
      updateCurrentPhase('basic');

      // STEP 3: Get current scene context for inheritance
      const currentNode = getCurrentNode();
      const currentNodeId = getCurrentNodeId();
      const scene = currentNode?.scene;

      if (!currentNodeId) {
        console.error('[RecordPanelOrchestrator] No current node ID - cannot insert recording scene');
        return;
      }

      // Extract scene properties to inherit
      const currentBackground = scene && 'background' in scene ? scene.background : undefined;
      const leftCharacter = scene && 'left-character' in scene ? (scene as { 'left-character'?: string })['left-character'] : 'leo';
      const rightCharacter = scene && 'right-character' in scene ? (scene as { 'right-character'?: string })['right-character'] : 'bakerMom';
      const conversationId = scene && 'conversationId' in scene ? (scene as { conversationId?: string }).conversationId : undefined;

      // STEP 4: Create recording scene using pure factory function (with conversationId inheritance)
      const { createRecordingScene } = await import('@core/navigation/sceneFactoryFunctions');
      const newScene = createRecordingScene(
        recordingId,
        conversationId, // Pass conversationId so recording scene has AI context
        currentBackground,
        leftCharacter,
        rightCharacter
      );

      // STEP 5: Insert scene into graph
      console.log('[RecordPanelOrchestrator] Inserting recording scene after node:', currentNodeId);
      const newNodeId = insertSceneNodes(currentNodeId, newScene);

      if (!newNodeId) {
        console.error('[RecordPanelOrchestrator] Failed to insert recording scene - no node ID returned');
        return;
      }

      // STEP 6: Navigate forward to the new recording scene
      console.log('[RecordPanelOrchestrator] Navigating to recording scene');
      advanceNavigation('forward');

      // STEP 7: Transition new scene to input-recording phase
      // This must happen AFTER navigation so the new node is current
      console.log('[RecordPanelOrchestrator] Transitioning to input-recording phase');
      useNavigationStore.getState().updateNodePhase(newNodeId, 'input-recording');

      // STEP 8: Emit success event to machine for state transition
      console.log('[RecordPanelOrchestrator] 📤 Emitting RECORDING_STARTED event');
      navigationBus.emit({
        type: 'RECORDING_STARTED',
        recordingId,
        nodeId: newNodeId
      });

      console.log('[RecordPanelOrchestrator] Ask button flow completed successfully');
    } catch (error) {
      console.error('[RecordPanelOrchestrator] Ask button flow failed:', error);
      // Emit error event to machine
      navigationBus.emit({
        type: 'RECORDING_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);

  /**
   * Handle recording stop - NEW BATCH PROCESSING FLOW
   * - User pushes stop button
   * - Transition to input-processing phase (shows "Processing...")
   * - Backend will process the entire audio buffer and return ONE final transcript
   * - When final transcript arrives, transition to ai-waiting phase
   * - ChatFlowOrchestrator will trigger AI processing on ai-waiting phase
   */
  const handleRecordStop = useCallback(() => {
    const node = getCurrentNode();
    if (!node) return;

    const { phase, scene } = node;
    const characterScene = scene as CharacterScene;

    console.log('[RecordPanelOrchestrator] 🛑 handleRecordStop called, phase:', phase);

    if (phase === 'record-answer') {
      // Answer recording: Emit RECORDING_STOPPED event to xState machine
      // Machine will transition from answerRecording → answerProcessing
      const currentAnswerText = characterScene.answerText || '';

      // Update scene text (for speech bubble) before transitioning
      if (activeRecordingId && currentAnswerText) {
        useNavigationStore.getState().updateSceneTextByRecordingId(activeRecordingId, currentAnswerText);
      }

      // Emit RECORDING_STOPPED event to navigation machine
      console.log('[RecordPanelOrchestrator] 📤 Emitting RECORDING_STOPPED event (answer)');
      navigationBus.emit({
        type: 'RECORDING_STOPPED',
        nodeId: node.id,
        recordingType: 'answer'
      });
    } else if (phase === 'input-recording') {
      // Ask recording: Emit RECORDING_STOPPED event to xState machine
      // Machine will transition from askRecording → askProcessing
      const currentQuestionText = characterScene.questionText || '';

      // Update scene text (for speech bubble) before transitioning
      if (activeRecordingId && currentQuestionText) {
        useNavigationStore.getState().updateSceneTextByRecordingId(activeRecordingId, currentQuestionText);
      }

      // Emit RECORDING_STOPPED event to navigation machine
      console.log('[RecordPanelOrchestrator] 📤 Emitting RECORDING_STOPPED event');
      navigationBus.emit({
        type: 'RECORDING_STOPPED',
        nodeId: node.id,
        recordingType: 'question'
      });
    }

    // CRITICAL: Actually stop the recording!
    // This will send 'finalize' to backend
    // Backend will process complete audio and send ONE final transcript
    Recording.stop();
  }, [activeRecordingId]);

  // Update ref when handleRecordStop changes (so effects can use it)
  React.useEffect(() => {
    handleRecordStopRef.current = handleRecordStop;
  }, [handleRecordStop]);

  /**
   * Handle Accept button click (quest-showing state)
   * Advances navigation when quest is accepted
   */
  const handleAcceptQuest = useCallback(() => {
    // Emit navigation request to state machine via event bus
    navigationBus.emit({ type: 'REQUEST_NAV_NEXT' });
  }, []);


  /**
   * Handle Answer button click - EVENT DRIVEN APPROACH
   * Starts recording IMMEDIATELY, then updates phase and emits event
   * Unlike Ask (which creates new scene), Answer just changes phase on current node
   */
  const handleAnswerClick = useCallback(async () => {
    try {
      // Generate unique recording ID
      const recordingId = `answer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // STEP 1: START RECORDING IMMEDIATELY (event-driven, not state-driven)
      // This happens FIRST, before any state changes
      await Recording.start().catch((err) => {
        console.error('[RecordPanelOrchestrator] Failed to start answer recording:', err);
        throw err; // Re-throw to prevent state updates on failure
      });

      // STEP 2: Add recordingId to current scene so activeRecordingId can be derived
      const currentItem = getCurrentNode();
      const currentNodeId = getCurrentNodeId();

      if (currentItem?.scene) {
        // Add recordingId property to the scene (type assertion needed)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (currentItem.scene as any).recordingId = recordingId;
      }

      // STEP 3: Update phase to record-answer (stays on same node, just changes phase)
      updateCurrentPhase('record-answer');

      // STEP 4: Emit event to machine - machine will route to answerRecording state
      console.log('[RecordPanelOrchestrator] 📤 Emitting ANSWER_RECORDING_STARTED event');
      navigationBus.emit({
        type: 'ANSWER_RECORDING_STARTED',
        recordingId,
        nodeId: currentNodeId || ''
      });

      console.log('[RecordPanelOrchestrator] Answer button flow completed successfully');
    } catch (error) {
      console.error('[RecordPanelOrchestrator] Answer button flow failed:', error);
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

  // Get phase for visual presentation
  // For success-dance scenes, use 'success-dance' (mirrors fail-dance pattern)
  // For fail-dance scenes, use 'fail-dance' to show answer-wrong styling (answer + quest + seal)
  // For dialogue scenes, use the current phase
  const isStaticScene = !isDialogueScene && !isSuccessDanceScene && !isFailDanceScene;
  const presentationPhase = isSuccessDanceScene
    ? 'success-dance'
    : isFailDanceScene
      ? 'fail-dance'
      : isStaticScene
        ? 'basic'
        : (phase || 'basic');

  // Determine which handler to use for the primary action button
  // - quest-showing phase: Accept button triggers quest acceptance
  // - other phases with Answer button: Answer button triggers answer recording
  const isQuestShowing = presentationPhase === 'quest-showing';
  const primaryActionHandler = isQuestShowing ? handleAcceptQuest : handleAnswerClick;

  // Get answer text from scene (persisted across phase transitions)
  // Falls back to recording context for real-time display during recording
  // For success-dance and fail-dance scenes, get the answer text from the scene
  const characterScene = currentScene as CharacterScene;
  const answerText = isSuccessDanceScene
    ? (currentScene as { answerText?: string }).answerText
    : isFailDanceScene
      ? (currentScene as { answerText?: string }).answerText
      : (presentationPhase === 'record-answer' ||
         presentationPhase === 'answer-processing' ||
         presentationPhase === 'waiting-for-answer-finalize' ||
         presentationPhase === 'answer-waiting' ||
         presentationPhase === 'answer-right' ||
         presentationPhase === 'answer-wrong')
        ? characterScene.answerText || recording.getDisplayText()
        : undefined;

  // Get quest text - for fail-dance scenes, use the questionText stored in the scene
  const questText = isFailDanceScene
    ? (currentScene as { questionText?: string }).questionText || flowMetadata?.questText
    : flowMetadata?.questText;

  return (
    <RecordPanel
      key="record-panel-singleton" // Stable key to prevent remounting on phase changes
      disabled={false}  // Recording is always enabled when this panel shows
      questState={questState}
      dialogueState={presentationPhase}
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
