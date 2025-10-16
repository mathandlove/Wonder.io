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
  const { getCurrentNavigationItem, insertNavigationItem, addNavigationStateToCurrentScene, updateNavigationItemState, updateSceneTextByRecordingId, navigationIndex, setNavigationIndex, forceAdvanceNavigation, advanceNavigation } = useSceneManager();
  const { createRecordingScene } = usePageFactory();
  const recording = useRecording();

  // Get current scene state to understand context
  const currentNavItem = getCurrentNavigationItem();
  const currentScene = currentNavItem?.scene;
  const sceneState = currentNavItem?.sceneState;

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
  // Handles both input-recording (Ask button) and record-answer (Answer button)
  React.useEffect(() => {
    const isRecordingState = sceneState?.type === 'dialogue' &&
      (sceneState.state === 'input-recording' || sceneState.state === 'record-answer');
    const currentScene = currentNavItem?.scene;
    const sceneRecordingId = hasRecordingId(currentScene) ? currentScene.recordingId : undefined;

    if (isRecordingState && !recording.isRecording()) {
      // For record-answer, we might not have a recordingId, so generate one
      const recordingId = sceneRecordingId || `answer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setActiveRecordingId(recordingId);
      Recording.start();
      console.log('🎤 Recording started for state:', sceneState.state, 'recordingId:', recordingId);
    }

    // Auto-stop recording when leaving recording states
    if (!isRecordingState && recording.isRecording()) {
      Recording.stop();
      setActiveRecordingId(null);
      console.log('🛑 Recording stopped');
    }
  }, [sceneState, recording, currentNavItem]);

  // Sync recording transcript to scene text in real-time
  React.useEffect(() => {
    if (recording.isRecording() && activeRecordingId) {
      const displayText = recording.getDisplayText();
      updateSceneTextByRecordingId(activeRecordingId, displayText || '...');
    }
  }, [recording.state.displayText, recording, activeRecordingId, updateSceneTextByRecordingId]);

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
    } catch (error) {
      console.error('Error in handleRecordStart:', error);
    }
  }, [createRecordingScene, insertNavigationItem, updateNavigationItemState, navigationIndex, setNavigationIndex, currentNavItem]);

  /**
   * Handle recording stop - transitions to waiting state based on current recording type
   * - input-recording → ai-waiting (for Ask button)
   * - record-answer → answer-waiting (for Answer button)
   */
  const handleRecordStop = useCallback(() => {
    const currentState = sceneState?.type === 'dialogue' ? sceneState.state : null;

    if (currentState === 'record-answer') {
      // Answer recording: Add answer-waiting state to current scene
      console.log('💜 Transitioning from record-answer to answer-waiting');
      addNavigationStateToCurrentScene(
        { type: 'dialogue', state: 'answer-waiting' },
        true  // Insert after current
      );
      // Use forceAdvanceNavigation to collapse the record-answer state
      forceAdvanceNavigation('forward');
    } else if (currentState === 'input-recording') {
      // Ask recording: Transition to ai-waiting
      console.log('🤖 Transitioning from input-recording to ai-waiting');
      updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'ai-waiting' });
    }

    // Recording will stop automatically via the effect
    // ChatFlowOrchestrator should observe ai-waiting state and process transcript
  }, [navigationIndex, sceneState, updateNavigationItemState, addNavigationStateToCurrentScene, forceAdvanceNavigation]);

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

  return (
    <RecordPanel
      disabled={false}  // Recording is always enabled when this panel shows
      questState={questState}
      dialogueState={presentationState}
      questText={flowMetadata?.questText}
      onNext={primaryActionHandler}
      onRecordStart={handleRecordStart}
      onRecordStop={handleRecordStop}
      onAskClick={handleRecordStart} // Ask button triggers recording start
    />
  );
}
