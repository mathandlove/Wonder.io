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
  console.log('🎨 RecordPanel RENDER', {
    disabled,
    questState,
    hasOnRecordStart: !!onRecordStart,
    hasOnRecordStop: !!onRecordStop,
    hasOnNext: !!onNext
  });

  const { state: recordingState } = useRecording();
  const { toast, hideToast } = useToast();

  console.log('🎨 RecordPanel computed state:', {
    isRecording: recordingState.isRecording,
    disabled
  });

  const buttonClassName = `chat-record-button ${recordingState.isRecording ? 'recording' : ''}`;

  const handleRecordClick = () => {
    console.log('🎤 RecordPanel.handleRecordClick() called', {
      disabled,
      isRecording: recordingState.isRecording,
      willExecute: !disabled
    });

    if (disabled) {
      console.log('⛔ Click blocked: disabled');
      return;
    }

    if (recordingState.isRecording) {
      console.log('🛑 Stopping recording...');
      onRecordStop();
    } else {
      console.log('▶️ Starting recording...');
      onRecordStart();
    }
  };

  const handleHintClick = () => {
    if (disabled) return;
    // TODO: Implement hint functionality
  };


  return (
    <div
      className="record-panel-container"
      onClick={(e) => {
        console.log('🟦 CONTAINER CLICK', {
          target: e.target,
          classList: (e.target as HTMLElement).classList?.value
        });
      }}
    >
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
          onClick={(e) => {
            console.log('🔴 RAW BUTTON CLICK EVENT', {
              target: e.target,
              currentTarget: e.currentTarget,
              disabled: e.currentTarget.disabled,
              timestamp: Date.now()
            });
            handleRecordClick();
          }}
          onPointerDown={(e) => {
            console.log('👆 POINTER DOWN on button', {
              pointerType: e.pointerType,
              disabled: e.currentTarget.disabled,
              disabledProp: disabled
            });
          }}
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