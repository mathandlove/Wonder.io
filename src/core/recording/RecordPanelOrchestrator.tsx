/**
 * RecordPanelOrchestrator - Orchestrates the recording flow
 *
 * Responsibilities:
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
import React, { useCallback } from 'react';
import { useQuest } from '@features/quest/QuestManager';
import { useSceneManager } from '@core/scenes/SceneManager';
import { usePageFactory } from '@core/navigation/PageFactory';
import { Recording } from '@core/recording/RecordingAPI';
import { RecordPanel } from './RecordPanel';
import { useRecording } from './RecordingContext';

export function RecordingOrchestrator() {
  const quest = useQuest();
  const { getCurrentNavigationItem, insertNavigationItem, updateNavigationItemState, updateSceneTextByRecordingId, navigationIndex, setNavigationIndex } = useSceneManager();
  const { createRecordingScene } = usePageFactory();
  const recording = useRecording();

  // Get current scene state to understand context
  const currentNavItem = getCurrentNavigationItem();
  const sceneState = currentNavItem?.sceneState;

  // Track the active recording ID in state (reactive, not ref)
  const [activeRecordingId, setActiveRecordingId] = React.useState<string | null>(null);

  // Auto-start recording when entering input-recording state (state-driven)
  React.useEffect(() => {
    const isRecordingState = sceneState?.type === 'dialogue' && sceneState.state === 'input-recording';
    const currentScene = currentNavItem?.scene;
    const sceneRecordingId = 'recordingId' in (currentScene || {}) ? (currentScene as any).recordingId : undefined;

    if (isRecordingState && !recording.isRecording() && sceneRecordingId) {
      setActiveRecordingId(sceneRecordingId);
      Recording.start();
    }

    // Auto-stop recording when leaving input-recording state
    if (!isRecordingState && recording.isRecording()) {
      Recording.stop();
      setActiveRecordingId(null);
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
      // Update current navigation item state from input-showInput to basic
      updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'basic' });

      // Generate unique recording ID
      const recordingId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create a new CharacterScene, inheriting context from current scene
      const currentScene = currentNavItem?.scene;
      const currentBackground = currentScene?.background;
      const leftCharacter = 'left-character' in (currentScene || {}) ? (currentScene as any)['left-character'] : undefined;
      const rightCharacter = 'right-character' in (currentScene || {}) ? (currentScene as any)['right-character'] : undefined;

      const newScene = createRecordingScene(recordingId, currentBackground, leftCharacter, rightCharacter);
      const sceneId = newScene.sceneId || 'default';

      // Create NavigationItem with recording state
      const newNavItem = {
        scene: newScene,
        sceneId,
        sceneState: { type: 'dialogue' as const, state: 'input-recording' as const },
        lockForward: true,
        lockBackward: false,
        index: navigationIndex + 1
      };

      insertNavigationItem(newNavItem, navigationIndex + 1);
      setNavigationIndex(navigationIndex + 1);
    } catch (error) {
      console.error('Error in handleRecordStart:', error);
    }
  }, [createRecordingScene, insertNavigationItem, updateNavigationItemState, navigationIndex, setNavigationIndex, currentNavItem]);

  /**
   * Handle recording stop - transitions to ai-waiting state
   * This triggers ChatFlowOrchestrator to process the transcript
   */
  const handleRecordStop = useCallback(() => {
    // Transition current scene from input-recording to ai-waiting
    updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'ai-waiting' });

    // Recording will stop automatically via the effect
    // ChatFlowOrchestrator should observe ai-waiting state and process transcript
  }, [navigationIndex, updateNavigationItemState]);

  /**
   * Handle continue button - navigates to next scene
   * Uses navigation array system to handle both static and dynamic scenes
   */
  const handleContinue = useCallback(() => {
    // TODO: Add exit animation if needed
    setNavigationIndex(navigationIndex + 1);
  }, [navigationIndex, setNavigationIndex]);

  // Quest state determines if Next button is enabled
  const questState = quest.state === 'completed' ? 'complete' : 'active';

  return (
    <RecordPanel
      disabled={false}  // Recording is always enabled when this panel shows
      questState={questState}
      onNext={handleContinue}
      onRecordStart={handleRecordStart}
      onRecordStop={handleRecordStop}
    />
  );
}
