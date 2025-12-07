/**
 * UIOverlayRoot - Container for all UI overlays (quests, dialogs, etc.)
 *
 * This is a simple presentational component that just renders overlays.
 * All visibility and state logic is handled by the navigation machine.
 */
import React from 'react';
import { RecordPanel } from '@core/recording/RecordPanel';
import { ScrollDownToast } from './ScrollDownToast';
import { getCurrentNode } from '@core/navigation/navigationHelpers';
import { useNavigationStore } from '@core/navigation/navigationStore';
import * as navigationBus from '@core/navigation/events/navigationBus';

export function UIOverlayRoot() {

  // Subscribe to navigation store to get current node updates
  const currentNode = useNavigationStore((state) => {
    const node = state.graph.byId[state.currentId || ''];
    return node;
  });

  // Determine if panel should be visible based on scene type
  const currentScene = currentNode?.scene;
  const isSuccessDanceScene = currentScene?.type === 'success-dance';
  const isFailDanceScene = currentScene?.type === 'fail-dance';
  const isDialogueScene = currentScene?.type === 'character' || currentScene?.type === 'character-flow';
  const shouldShowPanel = isDialogueScene || isSuccessDanceScene || isFailDanceScene;

  // Handle recording stop - machine will handle phase transitions
  const handleRecordStop = React.useCallback(() => {
    const node = getCurrentNode();
    if (!node) return;

    const { phase } = node;

    if (phase === 'record-answer') {
      navigationBus.emit({
        type: 'RECORDING_STOPPED',
        nodeId: node.id,
        recordingType: 'answer'
      });
    } else if (phase === 'input-recording') {
      navigationBus.emit({
        type: 'RECORDING_STOPPED',
        nodeId: node.id,
        recordingType: 'question'
      });
    }

    // Note: Machine will call RecordingOrchestratorAPI.stopRecordingAndTranscribe()
  }, []);

  // Handle answer-wrong video completion
  const handleAnswerWrongVideoComplete = React.useCallback(() => {
    // Machine handles this via VIDEO_COMPLETE event
  }, []);

  // Handle answer-right video completion
  const handleAnswerRightVideoComplete = React.useCallback(() => {
    const node = getCurrentNode();
    if (node) {
      navigationBus.emit({
        type: 'VIDEO_COMPLETE',
        nodeId: node.id,
        videoType: 'answer-right'
      });
    }
  }, []);

  return (
    <>
      {/* Recording panel - controlled by navigation machine */}
      {shouldShowPanel && (
        <RecordPanel
          onRecordStop={handleRecordStop}
          onAnswerWrongVideoComplete={handleAnswerWrongVideoComplete}
          onAnswerRightVideoComplete={handleAnswerRightVideoComplete}
        />
      )}

      {/* Scroll down toast - always rendered, visibility controlled internally */}
      <ScrollDownToast />
    </>
  );
}
