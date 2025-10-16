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
  }, [
    currentNavItem?.sceneState?.type,
    currentNavItem?.sceneState && 'state' in currentNavItem.sceneState ? currentNavItem.sceneState.state : null,
    currentNavItem?.sceneState && 'questionText' in currentNavItem.sceneState ? currentNavItem.sceneState.questionText : null,
    currentNavItem?.sceneState && 'answerText' in currentNavItem.sceneState ? currentNavItem.sceneState.answerText : null,
  ]);

  // Get flow metadata for quest text
  const flowMetadata = useSceneFlowMetadata(hasFlowId(currentScene) ? currentScene : null);

  // Determine if panel should be visible based on dialogue state
  // Show for: basic (hidden below screen), quest-showing (quest offer), input-showInput (ready to record),
  // input-recording (actively recording), show-hint (hint display), record-answer (answer recording),
  // answer-waiting (waiting for answer validation), answer-right (correct answer feedback),
  // answer-wrong (wrong answer feedback), ai-waiting (waiting for response)
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

  console.log('🎮 RecordPanelOrchestrator:', {
    currentNavItem: currentNavItem?.sceneId,
    sceneState,
    dialogueState,
    shouldShowPanel
  });

  // Track the active recording ID in state (reactive, not ref)
  const [activeRecordingId, setActiveRecordingId] = React.useState<string | null>(null);

  // Track question count - resets when panel becomes hidden (basic state)
  const [questionCount, setQuestionCount] = React.useState<number>(0);

  // ===================================
  // QUESTION TRACKING LOGIC
  // ===================================

  // Effect: Reset question count when panel becomes hidden (basic state)
  useEffect(() => {
    if (dialogueState === 'basic') {
      setQuestionCount(0);
    }
  }, [dialogueState]);

  // ===================================
  // RECORDING FLOW LOGIC
  // ===================================

  // Auto-start recording when entering recording states (state-driven)
  // Handles record-answer (Answer button) - input-recording is started immediately in handleRecordStart
  React.useEffect(() => {
    const isRecordingState = sceneState?.type === 'dialogue' &&
      (sceneState.state === 'input-recording' || sceneState.state === 'record-answer');
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
      setActiveRecordingId(null);
      console.log('🛑 Recording stopped');
    }
  }, [sceneState, recording, currentNavItem]);

  // Sync recording transcript in real-time
  // - For Ask recording (input-recording): Update scene text (for speech bubble) AND scene state questionText (for persistence)
  // - For Answer recording (record-answer): Update scene state answerText (for answer input box)
  // Extract displayText as a primitive value so effect only runs when the actual text changes
  const displayText = recording.getDisplayText();
  const isRecording = recording.isRecording();

  React.useEffect(() => {
    if (isRecording && activeRecordingId) {
      // Read fresh state on each transcript update (not from dependencies)
      const freshNavItem = getCurrentNavigationItem();
      const currentState = freshNavItem?.sceneState?.type === 'dialogue' ? freshNavItem.sceneState : null;

      if (currentState?.state === 'input-recording') {
        // Only update if text actually changed (prevents infinite loop)
        if (currentState.questionText !== displayText) {
          // Ask recording: Update both scene text (for speech bubble) and scene state (for persistence)
          updateSceneTextByRecordingId(activeRecordingId, displayText || '...');
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'input-recording',
            questionText: displayText || ''
          });
        }
      } else if (currentState?.state === 'record-answer') {
        // Only update if text actually changed (prevents infinite loop)
        if (currentState.answerText !== displayText) {
          // Answer recording: Update scene state answerText (for answer input box)
          updateNavigationItemState(navigationIndex, {
            type: 'dialogue',
            state: 'record-answer',
            answerText: displayText || '',
            questionText: currentState.questionText // Preserve existing questionText
          });
        }
      }
    }
  }, [displayText, isRecording, activeRecordingId, navigationIndex, updateSceneTextByRecordingId, updateNavigationItemState, getCurrentNavigationItem]);

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
      // Answer recording: Get final transcript
      const finalAnswerText = (currentState.answerText || recording.getDisplayText() || '').trim();

      if (!finalAnswerText) {
        // No text recorded: Go back to ready state (input-showInput)
        console.log('💜 No answer text recorded, returning to input-showInput');
        updateNavigationItemState(navigationIndex, {
          type: 'dialogue',
          state: 'input-showInput',
          questionText: currentState.questionText // Preserve question text
        });
      } else {
        // Text recorded: Proceed to answer-waiting
        console.log('💜 Transitioning from record-answer to answer-waiting, answerText:', finalAnswerText);
        addNavigationStateToCurrentScene(
          {
            type: 'dialogue',
            state: 'answer-waiting',
            answerText: finalAnswerText,
            questionText: currentState.questionText // Preserve question text
          },
          true  // Insert after current
        );
        // Use forceAdvanceNavigation to collapse the record-answer state
        forceAdvanceNavigation('forward');
      }
    } else if (currentState?.state === 'input-recording') {
      // Ask recording: Get final transcript
      const finalQuestionText = (currentState.questionText || recording.getDisplayText() || '').trim();

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

        // Navigate back to previous scene (this will trigger character animations)
        setNavigationIndex(targetSceneIndex);

        // Wait for character animations to complete before deleting
        // Character entrance animations typically take 300-500ms
        setTimeout(() => {
          console.log('🎭 Character animations should be complete, now deleting recording scene');
          deleteNavigationItem(currentIndex);
          // Clear the pending deletion ref
          pendingDeletionRef.current = null;
        }, 600); // 600ms should be enough for character animations to settle
      } else {
        // Text recorded: Proceed to ai-waiting
        console.log('🤖 Transitioning from input-recording to ai-waiting, questionText:', finalQuestionText);
        addNavigationStateToCurrentScene(
          {
            type: 'dialogue',
            state: 'ai-waiting',
            questionText: finalQuestionText // Persist question text in scene state
          },
          true  // Insert after current
        );
        // Use forceAdvanceNavigation to collapse the input-recording state
        forceAdvanceNavigation('forward');
      }
    }

    // Recording will stop automatically via the effect
    // ChatFlowOrchestrator should observe ai-waiting state and process transcript
  }, [navigationIndex, sceneState, recording, updateNavigationItemState, addNavigationStateToCurrentScene, forceAdvanceNavigation, setNavigationIndex, deleteNavigationItem]);

  /**
   * Handle Accept button click (quest-showing state)
   * Advances navigation when quest is accepted
   */
  const handleAcceptQuest = useCallback(() => {
    console.log('🎯 RecordPanelOrchestrator: Accept button clicked, advancing navigation');
    forceAdvanceNavigation('forward');
  }, [forceAdvanceNavigation]);

  /**
   * Handle continue button - navigates to next scene
   * Uses forceAdvanceNavigation for proper state collapse
   */
  const handleContinue = useCallback(() => {
    // Use forceAdvanceNavigation to ensure proper state collapse
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
