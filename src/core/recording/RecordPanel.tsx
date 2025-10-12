import React from 'react';
import { useDialogue } from '../../features/chat/context/useChatDialogue';
import NextButton from '../../features/chat/ui/NextButton';
import { Toast, useToast } from '../../features/chat/ui/Toast';
import { useRecording } from '@core/recording/RecordingContext';
import './css/RecordPanel.css';

interface RecordPanelProps {
  disabled: boolean;
  questState: 'active' | 'complete' | 'failed';
  onNext: () => void;
  onRecordStart: () => void;
  onRecordStop: () => void;
}

export const RecordPanel: React.FC<RecordPanelProps> = ({
  disabled,
  questState,
  onNext,
  onRecordStart,
  onRecordStop
}) => {
  const { hideTurnBanner, waiting } = useDialogue();
  const { state: recordingState } = useRecording();
  const { toast, hideToast } = useToast();

  const buttonClassName = `chat-record-button
    ${recordingState.isRecording ? 'recording' : ''}
    ${waiting ? 'waiting' : ''}`;

  const handleRecordClick = () => {
    if (disabled || waiting) return;
    hideTurnBanner(); // Hide banner when user clicks microphone

    if (recordingState.isRecording) {
      onRecordStop();
    } else {
      onRecordStart();
    }
  };

  const handleHintClick = () => {
    if (disabled || waiting) return;
    // TODO: Implement hint functionality
  };


  return (
    <div className="record-panel-container">
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
          className={buttonClassName}
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