/**
 * RecordPanel - Pure presentational recording UI
 *
 * Displays: Hint button, Record button, Next button, Toast notifications
 * All logic handled by RecordPanelOrchestrator
 */
import React from 'react';
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
  const { state: recordingState } = useRecording();
  const { toast, hideToast } = useToast();

  const buttonClassName = `chat-record-button ${recordingState.isRecording ? 'recording' : ''}`;

  const handleRecordClick = () => {
    if (disabled) return;

    if (recordingState.isRecording) {
      onRecordStop();
    } else {
      onRecordStart();
    }
  };

  const handleHintClick = () => {
    if (disabled) return;
    // TODO: Implement hint functionality
  };


  return (
    <div className="record-panel-container">
      <div className="simplified-chat-rail">
        <button
          className="chat-hint-button"
          onClick={handleHintClick}
          disabled={disabled}
          title="Get a hint"
        >
          <div className="hint-icon-mask"></div>
        </button>

        <button
          className={buttonClassName}
          onClick={handleRecordClick}
          disabled={disabled}
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