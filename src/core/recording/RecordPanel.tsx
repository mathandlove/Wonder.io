/**
 * RecordPanel - Pure presentational recording UI
 *
 * Displays: Stop button (above), Quest label, Ask button, Hint button, Answer button, Toast notifications
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
  questText?: string;
  onNext: () => void;
  onRecordStart: () => void;
  onRecordStop: () => void;
  onAskClick?: () => void;
}

export const RecordPanel: React.FC<RecordPanelProps> = ({
  disabled,
  questState,
  questText = "Find out what going on.",
  onNext,
  onRecordStart,
  onRecordStop,
  onAskClick
}) => {
  const { state: recordingState } = useRecording();
  const { toast, hideToast } = useToast();

  const handleHintClick = () => {
    if (disabled) return;
    // TODO: Implement hint functionality
  };

  const handleAskClick = () => {
    if (disabled) return;
    if (onAskClick) {
      onAskClick();
    }
  };

  // Determine if Stop button should be visible (only during recording)
  const showStopButton = recordingState.isRecording;

  return (
    <div className="record-panel-container">
      {/* Main Frame - matching Figma exactly */}
      <div className="frame">
        {/* Stop Recording Button - only visible during recording */}
        {showStopButton && (
          <div className="record-button" onClick={onRecordStop}>
            <div className="ellipse" />
            <img className="vector" alt="Stop recording" src="/VisualAssets/recordIcon.svg" />
            <div className="text-wrapper">Stop</div>
          </div>
        )}

        {/* Quest Section - white card with shadow */}
        <div className="whiteframe">
          <div className="quest">
            <p className="quest-find-out-what">
              <span className="span">Quest:</span>
              <span className="text-wrapper-2"> {questText}</span>
            </p>
          </div>
        </div>

        {/* Button Rail - white background with buttons */}
        <div className="frame-wrapper">
          <div className="div">
            <div className="div-2">
              {/* Ask Button - with red overlay */}
              <button
                className="button"
                onClick={handleAskClick}
                disabled={disabled}
                title="Ask a question"
              >
                <div className="answer">Ask</div>
              </button>

              {/* Hint Button - cardboard button with lightbulb */}
              <button
                className="hint-btn"
                onClick={handleHintClick}
                disabled={disabled}
                title="Get a hint"
              >
                <img className="img" alt="" src="/VisualAssets/lightbulb.svg" />
              </button>
            </div>

            {/* Answer Button - locked state controlled by quest completion */}
            <NextButton
              locked={questState !== 'complete'}
              onClick={onNext}
              label="Answer"
            />
          </div>
        </div>
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