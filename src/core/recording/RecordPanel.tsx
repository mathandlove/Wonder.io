/**
 * RecordPanel - Pure presentational recording UI
 *
 * Displays: Stop button (above), Quest label, Ask button, Hint button, Answer button, Toast notifications
 * All logic handled by RecordPanelOrchestrator
 */
import React from 'react';
import NextButton from '../../features/chat/ui/NextButton';
import { Toast, useToast } from '../../features/chat/ui/Toast';
import './css/RecordPanel.css';

interface RecordPanelProps {
  disabled: boolean;
  questState: 'active' | 'complete' | 'failed';
  dialogueState: string; // The scene's dialogue state (basic, input-recording, ai-waiting, etc.)
  questText?: string;
  answerText?: string; // The recorded answer text
  onNext: () => void;
  onRecordStop: () => void;
  onRecordStart?: () => void; // Called when recording starts
  onAskClick?: () => void;
}

export const RecordPanel: React.FC<RecordPanelProps> = ({
  disabled,
  questState,
  dialogueState,
  questText = "Find out what going on.",
  answerText,
  onNext,
  onRecordStop,
  onAskClick
}) => {
  const { toast, hideToast } = useToast();
  const [showStamp, setShowStamp] = React.useState(false);
  // @ts-expect-error - playVideo used in future features
  const [playVideo, setPlayVideo] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Determine visual state based on dialogueState (must be before effects that use these)
  // - basic: Panel hidden below screen
  // - quest-showing: Quest offered, panel visible with Accept button
  // - input-showInput: Panel shown, all buttons enabled and ready
  // - input-recording: Recording active, Stop button visible, Ask button appears pressed
  // - show-hint: Hint displayed, Hint button appears pressed
  // - record-answer: Recording answer, Stop button visible, Answer button appears pressed
  // - answer-waiting: Waiting for answer validation, show answer text with all buttons disabled
  // - answer-right: Correct answer, show answer text centered, no stop button
  // - answer-wrong: Wrong answer, show answer text with error indication
  // - waiting-for-finalize: Waiting for final transcripts from STT
  // - ai-waiting: All buttons disabled (waiting for AI response)
  const isBasic = dialogueState === 'basic';
  const isQuestOffer = dialogueState === 'quest-showing';
  const isAskRecording = dialogueState === 'input-recording';
  const isAnswerRecording = dialogueState === 'record-answer';
  const isAnswerWaiting = dialogueState === 'answer-waiting';
  const isAnswerRight = dialogueState === 'answer-right';
  const isAnswerWrong = dialogueState === 'answer-wrong';
  const isHintShowing = dialogueState === 'show-hint';
  const isWaitingForFinalize = dialogueState === 'waiting-for-finalize';
  const isWaiting = dialogueState === 'ai-waiting' || isWaitingForFinalize;

  // Hidden state (basic) should use quest-offer visual styling
  const useQuestOfferStyling = isQuestOffer || isBasic;

  // Reset stamp visibility when leaving answer feedback states
  React.useEffect(() => {
    if (!isAnswerWaiting && !isAnswerRight && !isAnswerWrong) {
      setShowStamp(false);
      setPlayVideo(false);
    }
  }, [isAnswerWaiting, isAnswerRight, isAnswerWrong]);

  // Handle video playback with delay for answer-waiting
  React.useEffect(() => {
    if (isAnswerWaiting) {
      // Wait 500ms before starting video in answer-waiting state
      const timer = setTimeout(() => {
        setPlayVideo(true);
        if (videoRef.current) {
          videoRef.current.playbackRate = 0.7; // Play at 70% speed
          videoRef.current.play();
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (isAnswerRight || isAnswerWrong) {
      // Play immediately for right/wrong states
      setPlayVideo(true);
      if (videoRef.current) {
        videoRef.current.playbackRate = 0.7; // Play at 70% speed
        videoRef.current.play();
      }
    }
  }, [isAnswerWaiting, isAnswerRight, isAnswerWrong]);

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
  // Apply 'recording' class only when actively recording (triggers slide-down animation)
  const isRecording = isAskRecording || isAnswerRecording;

  // Disable logic:
  // - When Ask is recording: Hint and Answer are disabled, but Ask is enabled (so user can stop)
  // - When Answer is recording: Ask and Hint are disabled, but Answer is enabled (so user can stop)
  // - When waiting: all buttons disabled
  const askButtonDisabled = isAnswerRecording || isWaiting || isAnswerWaiting || disabled; // Disabled when Answer recording or waiting
  const hintButtonDisabled = isRecording || isWaiting || isAnswerWaiting || disabled; // Disabled when any recording or waiting
  const answerButtonDisabled = isAskRecording || isWaiting || isAnswerWaiting || disabled; // Disabled when Ask recording or waiting

  // Show answer text for record-answer, answer-waiting, answer-right, and answer-wrong states
  const showAnswerText = isAnswerRecording || isAnswerWaiting || isAnswerRight || isAnswerWrong;

  // Determine which positioning class to apply based on state
  const getContainerClass = () => {
    // Centered states (important moments)
    if (isAnswerRight) return 'answer-right-centered';
    if (isAnswerWrong) return 'answer-wrong-centered';
    if (isAnswerWaiting) return 'quest-offer-centered'; // Golden glow for waiting
    if (isQuestOffer) return 'quest-offer-centered'; // Golden glow for quest

    // Hidden state (completely off-screen)
    if (isBasic) return 'hidden';

    // Rest position - bottom anchored for interactive states
    // (input-showInput, input-recording, show-hint, record-answer, ai-waiting)
    return 'bottom-anchored';
  };


  return (
    <div className={`record-panel-container ${getContainerClass()}`}>
      {/* Main Frame - matching Figma exactly */}
      <div className="frame">
        {/* Quest Section - white card with shadow */}
        <div className={`whiteframe ${useQuestOfferStyling ? 'quest-offer' : ''}`}>
          <div className="quest">
            <p className={`quest-find-out-what ${useQuestOfferStyling ? 'quest-offer' : ''}`}>
              {useQuestOfferStyling ? (
                <>
                  <span className="quest-label">Quest:</span>
                  <br />
                  <span className="quest-description">{questText}</span>
                </>
              ) : (
                <>
                  <span className="quest-label">Quest:</span>
                  <span className="quest-description"> {questText}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Answer Display Frame - middle white box (only visible during answer states) */}
        {showAnswerText && (
          <div className={`whiteframe answer-frame ${(isAnswerWaiting || isAnswerRight || isAnswerWrong) ? 'answer-feedback-state' : ''}`}>
            <div className={`quest ${isAnswerWaiting ? 'answer-waiting' : ''} ${isAnswerRight ? 'answer-right' : ''} ${isAnswerWrong ? 'answer-wrong' : ''}`}>
              <p className="quest-find-out-what">
                <span className="quest-label">Answer:</span>
              </p>
              <div className="answer-input-box">
                {isAnswerRecording ? (
                  <span className="answer-placeholder">{answerText || 'Listening...'}</span>
                ) : (
                  <span className="quest-description">{answerText || 'Someone stole your cookies.'}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Button Rail - white background with buttons */}
        {/* Hide button rail for answer feedback states (answer-waiting, answer-right, answer-wrong) */}
        {!isAnswerWaiting && !isAnswerRight && !isAnswerWrong && (
          <div className="frame-wrapper">
            {useQuestOfferStyling ? (
              /* Quest Offer: Single Accept button centered */
              <div className="button-wrapper">
                <button className="button accept-btn" onClick={onNext} disabled={disabled}>
                  <div className="answer">Accept</div>
                </button>
              </div>
            ) : (
              /* Normal State: Ask, Hint, Answer buttons */
              <div className="div">
                <div className="div-2">
                  {/* Ask Button - transforms to Stop when recording */}
                  <button
                    className={`button ${isAskRecording ? 'recording-active' : ''} ${askButtonDisabled ? 'disabled' : ''}`}
                    onClick={isAskRecording ? onRecordStop : handleAskClick}
                    disabled={askButtonDisabled}
                    title={isAskRecording ? "Stop recording" : "Ask a question"}
                  >
                    <img className="button-icon" src="/VisualAssets/recordIcon.svg" alt="" />
                    {isAskRecording ? (
                      <>
                        <div className="stop-square" />
                        <div className="button-text">Stop</div>
                      </>
                    ) : (
                      <div className="button-text">Ask</div>
                    )}
                  </button>

                  {/* Hint Button - cardboard button with lightbulb, pressed when hint showing */}
                  <button
                    className={`hint-btn ${isHintShowing ? 'recording' : ''} ${hintButtonDisabled ? 'disabled' : ''}`}
                    onClick={handleHintClick}
                    disabled={hintButtonDisabled}
                    title="Get a hint"
                  >
                    <img className="img" alt="" src="/VisualAssets/lightbulb.svg" />
                  </button>
                </div>

                {/* Answer Button - locked state controlled by quest completion, transforms when recording answer */}
                <NextButton
                  locked={questState !== 'complete'}
                  onClick={onNext}
                  onRecordStop={onRecordStop}
                  label="Answer"
                  disabled={answerButtonDisabled}
                  isRecording={isAnswerRecording}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accessibility hint for locked state */}
      <p id="next-hint" className="visually-hidden">Finish the quest to continue.</p>

      {/* Toast notifications */}
      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={hideToast}
      />

      {/* Hand stamp video and seal for answer-waiting, answer-right, and answer-wrong states */}
      {(isAnswerWaiting || isAnswerRight || isAnswerWrong) && (
        <div className="answer-stamp-container">
          <div className={`answer-seal-stamp ${showStamp ? 'stamp-visible' : ''} ${isAnswerWaiting ? 'seal-hidden' : ''}`}>
            <img
              src={isAnswerWrong ? '/VisualAssets/angrySeal.png' : '/VisualAssets/happySeal.png'}
              alt="Answer Seal"
              className="answer-seal-image"
            />
          </div>
          <video
            ref={videoRef}
            className="answer-hand-stamp-video"
            src="/VisualAssets/hand-stamp.webm"
            muted
            playsInline
            onTimeUpdate={(e) => {
              const video = e.target as HTMLVideoElement;
              // At halfway point
              if (video.currentTime >= video.duration / 2) {
                // Show seal for right/wrong states
                if (!showStamp && (isAnswerRight || isAnswerWrong)) {
                  setShowStamp(true);
                  // For right/wrong, let video continue playing (no pause)
                }
                // Pause only for answer-waiting state
                if (isAnswerWaiting && !video.paused) {
                  video.pause();
                }
              }
            }}
            onEnded={(e) => {
              // Hide video after it ends
              (e.target as HTMLVideoElement).style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
};