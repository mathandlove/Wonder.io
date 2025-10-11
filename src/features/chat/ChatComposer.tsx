import React, { useCallback } from 'react';
import { useDialogue } from './context/useChatDialogue';
import { useDialogue as useNewDialogue } from '@core/dialogue/DialogueContext';
import { usePageFactory } from './orchestrators/PageFactory';
import NextButton from './ui/NextButton';
import { Toast, useToast } from './ui/Toast';
import { Recording } from '@core/recording/RecordingAPI';
import { useRecording } from '@core/recording/RecordingContext';
import './Chat.css';

interface ChatComposerProps {
  disabled: boolean;
  questState: 'active' | 'complete' | 'failed';
  onNext: () => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  disabled,
  questState,
  onNext
}) => {
  const { hideTurnBanner, waiting } = useDialogue();
  const { beginRecording } = useNewDialogue();
  const { createInteractiveBubblePage, addSceneAndNavigate } = usePageFactory();
  const { state: recordingState } = useRecording();
  const { toast, hideToast } = useToast();

  const startRecording = useCallback(() => {
    console.log('🎯 ChatComposer.startRecording() called');
    // Create a new interactive bubble scene and navigate to it
    const newScene = createInteractiveBubblePage();
    const sceneId = newScene.sceneId || 'default';

    // Add the scene and auto-scroll to it
    addSceneAndNavigate(newScene);

    // Start recording with the new scene ID
    beginRecording(sceneId);

    // Use global Recording API
    console.log('🎯 Using global Recording.start()');
    Recording.start();
  }, [createInteractiveBubblePage, addSceneAndNavigate, beginRecording]);

  const stopRecording = useCallback(() => {
    console.log('🎯 ChatComposer.stopRecording() called');
    console.log('🎯 Using global Recording.stop()');
    Recording.stop();
  }, []);

  const handleRecordClick = () => {
    if (disabled || waiting) return;
    hideTurnBanner(); // Hide banner when user clicks microphone
    console.log('🎯 ChatComposer handleRecordClick', {
      currentlyRecording: recordingState.isRecording
    });
    if (recordingState.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleHintClick = () => {
    if (disabled || waiting) return;
    // TODO: Implement hint functionality
  };


  return (
    <div className="chat-composer-container">
      <div className="simplified-chat-rail">
        <button
          className={`chat-hint-button ${waiting ? 'waiting' : ''}`}
          onClick={handleHintClick}
          disabled={disabled || waiting}
          title="Get a hint"
        >
          <div className="hint-icon-mask"></div>
        </button>

        <button
          className={`chat-record-button ${recordingState.isRecording ? 'recording' : ''} ${waiting ? 'waiting' : ''}`}
          onClick={handleRecordClick}
          disabled={disabled || waiting}
          title={recordingState.isRecording ? 'Stop recording' : 'Start recording'}
        >
          <div className="record-icon-mask"></div>
        </button>

        <NextButton
          locked={questState !== 'complete'}
          onClick={onNext}
        />
      </div>

      {/* Accessibility hint for locked state */}
      <p id="next-hint" className="visually-hidden">Finish the quest to continue.</p>

      {/* Toast notifications */}
      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={hideToast}
      />
    </div>
  );
};