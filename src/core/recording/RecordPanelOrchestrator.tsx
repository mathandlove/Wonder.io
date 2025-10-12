/**
 * RecordPanelOrchestrator - Manages the recording panel visibility and state
 *
 * Renders the RecordPanel (chat rail with hint/record/next buttons) and passes
 * necessary props. Parent component (UIOverlayRoot) controls when this is shown
 * based on scene state.
 *
 * Responsibilities:
 * - Orchestrate recording flow (page creation, navigation, recording start/stop)
 * - Coordinate between PageFactory, SceneManager, and Recording systems
 * - Handle business logic for recording sessions
 */
import {  useCallback } from 'react';
import { useDialogue } from '@features/chat/context/useChatDialogue';
import { useDialogue as useNewDialogue } from '@core/dialogue/DialogueContext';
import { useSceneManager } from '@core/scenes/SceneManager';
import { usePageFactory } from '@core/navigation/PageFactory';
import { Recording } from '@core/recording/RecordingAPI';
import { RecordPanel } from './RecordPanel';

export function RecordingOrchestrator() {
  const { isPlayerTurn, waiting, questState } = useDialogue();
  const { beginRecording } = useNewDialogue();
  const { goToNext } = useSceneManager();
  const { createInteractiveBubblePage, addSceneAndNavigate } = usePageFactory();

  /**
   * Handle recording start - creates new page, navigates, and starts recording
   * This is the orchestration logic that coordinates multiple systems
   */
  const handleRecordStart = useCallback(() => {
    console.log('🎯 RecordingOrchestrator.handleRecordStart() - orchestrating recording session');

    // 1. Create a new interactive bubble scene
    const newScene = createInteractiveBubblePage();
    const sceneId = newScene.sceneId || 'default';
    console.log('📄 Created new scene:', sceneId);

    // 2. Add the scene and navigate to it
    addSceneAndNavigate(newScene);
    console.log('🧭 Navigated to new scene');

    // 3. Begin recording with the new scene ID
    beginRecording(sceneId);
    console.log('🎙️ Started recording context');

    // 4. Start the global recording API
    Recording.start();
    console.log('✅ Recording session initialized');
  }, [createInteractiveBubblePage, addSceneAndNavigate, beginRecording]);

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
   */
  const handleContinue = useCallback(() => {
    // TODO: Add exit animation if needed
    goToNext();
  }, [goToNext]);

  return (
    <RecordPanel
      disabled={!isPlayerTurn || waiting}
      questState={questState}
      onNext={handleContinue}
      onRecordStart={handleRecordStart}
      onRecordStop={handleRecordStop}
    />
  );
}
