/**
 * RecordPanelOrchestrator - Manages recording lifecycle and renders RecordPanel
 *
 * Responsibilities:
 * - Initialize and register recording control with RecordingOrchestrator
 * - Handle transcript callbacks from recording system
 * - Render RecordPanel UI component
 * - Forward video completion callbacks
 *
 * The navigation machine controls when to start/stop recording via RecordingOrchestratorAPI.
 * This component just needs to keep the recording hook alive and handle callbacks.
 */
import React, { useCallback } from 'react';
import { RecordPanel } from './RecordPanel';
import { useRecordingOrchestrator } from './RecordingOrchestrator';
import { getCurrentNode } from '@core/navigation/navigationHelpers';
import * as navigationBus from '@core/navigation/events/navigationBus';
import { createDebugger } from '../../utils/createDebug';

const debug = createDebugger('recording:orchestrator');

interface RecordingOrchestratorProps {
  onAnswerWrongVideoComplete?: () => void;
  onAnswerRightVideoComplete?: () => void;
}

export function RecordingOrchestrator({
  onAnswerWrongVideoComplete,
  onAnswerRightVideoComplete
}: RecordingOrchestratorProps) {

  // Initialize recording - this registers the control with the API
  // The navigation machine will call RecordingOrchestratorAPI to start/stop
  const recording = useRecordingOrchestrator({
    onTranscript: (text) => {
      debug.log('📝 Transcript received:', text.substring(0, 100));

      // Emit RECORDING_PROCESSED event with transcript
      // Navigation machine will handle storing it in the scene
      const currentNode = getCurrentNode();
      if (currentNode) {
        navigationBus.emit({
          type: 'RECORDING_PROCESSED',
          transcript: text,
          recordingId: currentNode.id
        });
      }
    },
    onError: (error) => {
      debug.error('❌ Recording error:', error);

      // Emit RECORDING_FAILED event
      navigationBus.emit({
        type: 'RECORDING_FAILED',
        error
      });
    },
    onAutoStop: () => {
      debug.log('⏸️  Auto-stopped due to silence');

      // Emit RECORDING_STOPPED event
      const currentNode = getCurrentNode();
      if (currentNode) {
        navigationBus.emit({
          type: 'RECORDING_STOPPED',
          nodeId: currentNode.id,
          recordingType: 'question' // Default to question, machine will handle
        });
      }
    }
  });

  // Handle stop recording - called by RecordPanel when user clicks stop
  const handleRecordStop = useCallback(() => {
    const currentNode = getCurrentNode();
    if (!currentNode) return;

    debug.log('🛑 Stop button clicked, emitting RECORDING_STOPPED event');

    // Determine recording type based on phase
    const phase = currentNode.phase;
    const recordingType =
      phase === 'input-recording' ? 'question' :
      phase === 'record-answer' ? 'answer' :
      'question';

    // Emit RECORDING_STOPPED event to navigation machine
    // Machine will call RecordingOrchestratorAPI.stopRecordingAndTranscribe()
    navigationBus.emit({
      type: 'RECORDING_STOPPED',
      nodeId: currentNode.id,
      recordingType
    });
  }, []);

  // Get current node to determine if panel should be visible
  const currentNode = getCurrentNode();
  const currentScene = currentNode?.scene;

  // Show panel for dialogue scenes and dance scenes
  const isDialogueScene = currentScene?.type === 'character' || currentScene?.type === 'character-flow';
  const isSuccessDanceScene = currentScene?.type === 'success-dance';
  const isFailDanceScene = currentScene?.type === 'fail-dance';
  const shouldShowPanel = isDialogueScene || isSuccessDanceScene || isFailDanceScene;

  if (!shouldShowPanel) {
    return null;
  }

  return (
    <RecordPanel
      onRecordStop={handleRecordStop}
      onAnswerWrongVideoComplete={onAnswerWrongVideoComplete}
      onAnswerRightVideoComplete={onAnswerRightVideoComplete}
    />
  );
}
