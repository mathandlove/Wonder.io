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
import { useCallback } from 'react';
import { useQuest } from '@features/quest/QuestManager';
import { useDialogue as useNewDialogue } from '@core/dialogue/DialogueContext';
import { useSceneManager } from '@core/scenes/SceneManager';
import { usePageFactory } from '@core/navigation/PageFactory';
import { Recording } from '@core/recording/RecordingAPI';
import { RecordPanel } from './RecordPanel';
import { useRecording } from './RecordingContext';

export function RecordingOrchestrator() {
  console.log('🎬 RecordingOrchestrator RENDER');

  const quest = useQuest();
  const { getCurrentNavigationItem, insertNavigationItem, updateNavigationItemState, navigationIndex, setNavigationIndex } = useSceneManager();
  const { createRecordingScene } = usePageFactory();

  // Get current scene state to understand context
  const currentNavItem = getCurrentNavigationItem();
  const sceneState = currentNavItem?.sceneState;

  console.log('📊 RecordingOrchestrator state:', {
    sceneState,
    questState: quest.state
  });

  /**
   * Handle recording start - creates new page, navigates, and starts recording
   * This is the orchestration logic that coordinates multiple systems
   */
  const handleRecordStart = useCallback(() => {
    console.log('🎯 RecordingOrchestrator.handleRecordStart() - START');

    try {
      // 0. Update current navigation item state from input-showInput to basic
      // This transitions the current scene away from showing the RecordPanel
      console.log('0️⃣ Transitioning current scene to basic state at index:', navigationIndex);
      updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'basic' });
      console.log('✅ Current scene transitioned to basic (RecordPanel will stay visible during nav)');

      // 1. Generate unique recording ID
      const recordingId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('1️⃣ Generated recording ID:', recordingId);

      // 2. Create a new CharacterScene, inheriting context from current scene
      console.log('2️⃣ Creating recording scene...');
      const currentScene = currentNavItem?.scene;
      const currentBackground = currentScene?.background;
      const leftCharacter = 'left-character' in (currentScene || {}) ? (currentScene as any)['left-character'] : undefined;
      const rightCharacter = 'right-character' in (currentScene || {}) ? (currentScene as any)['right-character'] : undefined;

      console.log('📋 Context extracted from current scene:', {
        background: currentBackground,
        leftCharacter,
        rightCharacter,
        currentSceneType: currentScene?.type
      });

      const newScene = createRecordingScene(recordingId, currentBackground, leftCharacter, rightCharacter);
      // Note: meta will be injected by injectPanelMetaFromFlows in StoryModeScroll

      const sceneId = newScene.sceneId || 'default';
      console.log('✅ Created recording scene:', {
        sceneId,
        recordingId,
        type: newScene.type,
        text: newScene.text
      });

      // 3. Create NavigationItem with recording state
      const newNavItem = {
        scene: newScene,
        sceneId,
        sceneState: { type: 'dialogue' as const, state: 'input-recording' as const },
        lockForward: true,  // Lock forward during recording
        lockBackward: false,
        index: navigationIndex + 1
      };

      console.log('3️⃣ Inserting navigation item directly after current position');
      insertNavigationItem(newNavItem, navigationIndex + 1);
      console.log('✅ Navigation item inserted (no rebuild!)');

      // 4. Navigate to the new page using navigationIndex
      console.log('4️⃣ Navigating to new recording page...');
      setNavigationIndex(navigationIndex + 1);
      console.log(`✅ Navigation complete! Moved to index ${navigationIndex + 1}`);

      console.log('🎉 Page created and navigated! Original scenes untouched.');
    } catch (error) {
      console.error('❌ Error in handleRecordStart:', error);
    }
  }, [createRecordingScene, insertNavigationItem, updateNavigationItemState, navigationIndex, setNavigationIndex]);

  /**
   * Handle recording stop - stops the recording API
   */
  const handleRecordStop = useCallback(() => {
    console.log('🎯 RecordingOrchestrator.handleRecordStop()');
    Recording.stop();
    console.log('🛑 Recording stopped');
  }, []);

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
