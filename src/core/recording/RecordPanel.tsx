/**
 * RecordPanel - Reactive recording UI
 *
 * Reads state directly from currentNode and emits events to navigation bus.
 * No longer needs orchestrator to pass props - derives everything from navigation state.
 *
 * Displays: Quest label, Ask button, Hint button, Answer button, Toast notifications, Video feedback
 */
import React from 'react';
import NextButton from '../../features/chat/ui/NextButton';
import { Toast, useToast } from '../../features/chat/ui/Toast';
import { AudioVisualizer } from './AudioVisualizer';
import { ClueSelectionPanel } from './ClueSelectionPanel';
import { useClueStore } from '@core/data/ClueStore';
import { useNavigationStore, selectCurrentNode } from '@core/navigation/navigationStore';
import { getConversationMetadata } from '@core/ai/AIOrchestrator';
import { getServiceInstance } from '@core/navigation/machine/navigationInterpreter';
import { useAudioLevel } from './RecordingOrchestrator';
import * as navigationBus from '@core/navigation/events/navigationBus';
import type { CharacterScene } from '@core/types/scene';
import './css/RecordPanel.css';

interface RecordPanelProps {
  // Optional callbacks for video completion (orchestrator still needs these for coordination)
  onAnswerWrongVideoComplete?: () => void;
  onAnswerRightVideoComplete?: () => void;
  onRecordStop: () => void; // Still needed for orchestrator to stop recording API
}

export const RecordPanel: React.FC<RecordPanelProps> = ({
  onAnswerWrongVideoComplete,
  onAnswerRightVideoComplete,
  onRecordStop
}) => {
  const { toast, hideToast } = useToast();
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Get real-time audio level for visualization (updates at 60fps)
  const audioLevel = useAudioLevel();

  // Get clues from ClueStore for clue selection
  const { clues } = useClueStore();

  // Read state reactively from navigation store (triggers re-render on phase changes)
  const currentNode = useNavigationStore(selectCurrentNode);
  const scene = currentNode?.scene;
  const dialogueState = currentNode?.phase || 'basic'; // Phase IS the dialogue state

  // Get unlockAnswerButton flag from machine context
  const [unlockAnswerButton, setUnlockAnswerButton] = React.useState(false);
  React.useEffect(() => {
    const service = getServiceInstance();
    if (!service) {
      console.warn('[RecordPanel] ⚠️ No service instance available for unlockAnswerButton subscription');
      return;
    }

    console.log('[RecordPanel] 🔗 Subscribing to machine for unlockAnswerButton');
    const subscription = service.subscribe((snapshot) => {
      const newValue = snapshot.context.unlockAnswerButton;
      console.log('[RecordPanel] 🔓 unlockAnswerButton changed:', newValue, 'state:', snapshot.value);
      setUnlockAnswerButton(newValue);
    });

    return () => {
      console.log('[RecordPanel] 🔌 Unsubscribing from machine');
      subscription.unsubscribe();
    };
  }, []);

  // Local state for hint toggle (internal to RecordPanel)
  const [showHint, setShowHint] = React.useState(false);

  // Debug: Log clues and phase changes
  React.useEffect(() => {
    console.log('[RecordPanel] Phase changed to:', dialogueState, 'clues count:', clues.length);
    if (dialogueState === 'askClue') {
      console.log('[RecordPanel] In askClue state, clues:', clues);
      if (clues.length === 0) {
        console.warn('[RecordPanel] ⚠️ No clues in ClueStore! User may have navigated before clues were saved.');
      }
    }
  }, [dialogueState, clues]);

  // Derive quest state from phase (quest complete when we have answerText and it's correct)
  const questState: 'active' | 'complete' | 'failed' = React.useMemo(() => {
    if (dialogueState === 'answer-right') return 'complete';
    if (dialogueState === 'answer-wrong') return 'failed';
    return 'active';
  }, [dialogueState]);

  // Get quest text and hint from conversation metadata
  const conversationId = (scene as CharacterScene)?.conversationId;
  const metadata = conversationId ? getConversationMetadata(conversationId) : null;
  const questText = metadata?.questText || "Find out what going on.";
  const hintText = metadata?.hint || "";

  // Get answer text from scene
  const answerText = (scene as CharacterScene)?.answerText || '';

  // Disabled state (could be extended with additional logic)
  const disabled = false;

  // Determine visual state based on dialogueState
  const isBasic = dialogueState === 'basic';
  const isInputBasic = dialogueState === 'input-basic';
  const isQuestOffer = dialogueState === 'quest-showing';
  const isAskClue = dialogueState === 'askClue';
  const isAnswerClue = dialogueState === 'answerClue';
  const isAskRecording = dialogueState === 'input-recording';
  const isProcessing = dialogueState === 'input-processing';
  const isAnswerRecording = dialogueState === 'record-answer';
  const isAnswerProcessing = dialogueState === 'answer-processing';
  const isAnswerWaiting = dialogueState === 'answer-waiting';
  const isAnswerRight = dialogueState === 'answer-right';
  const isAnswerWrong = dialogueState === 'answer-wrong';
  const isWaitingForFinalize = dialogueState === 'waiting-for-finalize';
  const isWaitingForAnswerFinalize = dialogueState === 'waiting-for-answer-finalize';
  const isSuccessDance = dialogueState === 'success-dance';
  // Check both phase and scene type for fail-dance
  const isFailDance = dialogueState === 'fail-dance' || scene?.type === 'fail-dance';
  const isWaiting = dialogueState === 'ai-waiting' || isWaitingForFinalize || isWaitingForAnswerFinalize || isAnswerWaiting || isProcessing || isAnswerProcessing;

  // Hidden state (basic or input-basic) should use quest-offer visual styling
  const useQuestOfferStyling = isQuestOffer || isBasic || isInputBasic;

  const handleHintClick = () => {
    if (disabled) return;
    // Toggle hint visibility (local state)
    setShowHint(prev => !prev);
  };

  const handleAskClick = () => {
    if (disabled) return;
    // Emit ASK_BUTTON_CLICKED event to machine
    navigationBus.emit({ type: 'ASK_BUTTON_CLICKED' });
  };

  const handleAcceptQuest = () => {
    if (disabled) return;
    // Emit navigation request when quest is accepted
    navigationBus.emit({ type: 'REQUEST_NAV_NEXT' });
  };

  const handleAnswerClick = () => {
    if (disabled) return;
    // Emit ANSWER_BUTTON_CLICKED event to machine
    navigationBus.emit({ type: 'ANSWER_BUTTON_CLICKED' });
  };

  // Apply 'recording' class only when actively recording (triggers slide-down animation)
  const isRecording = isAskRecording || isAnswerRecording;

  // Disable logic:
  // - When Ask is recording: Hint and Answer are disabled, but Ask is enabled (so user can stop)
  // - When Answer is recording: Ask and Hint are disabled, but Answer is enabled (so user can stop)
  // - When waiting: all buttons disabled
  const askButtonDisabled = isAnswerRecording || isWaiting || isAnswerWaiting || disabled;
  const hintButtonDisabled = isRecording || isWaiting || isAnswerWaiting || disabled;
  const answerButtonDisabled = isAskRecording || isWaiting || isAnswerWaiting || disabled;

  // Show answer text for answer recording and all answer-related states (including success-dance and fail-dance)
  const showAnswerText = isAnswerRecording || isAnswerProcessing || isWaitingForAnswerFinalize || isAnswerWaiting || isAnswerRight || isAnswerWrong || isSuccessDance || isFailDance;

  // Track red glow state for answer-wrong and fail-dance
  const [showRedGlow, setShowRedGlow] = React.useState(false);
  // Track green glow state for answer-right
  const [showGreenGlow, setShowGreenGlow] = React.useState(false);

  // Reset red glow when leaving answer-wrong/fail-dance states
  React.useEffect(() => {
    if (!isAnswerWrong && !isFailDance) {
      setShowRedGlow(false);
    }
  }, [isAnswerWrong, isFailDance]);

  // Reset green glow when leaving answer-right/success-dance states
  React.useEffect(() => {
    if (!isAnswerRight && !isSuccessDance) {
      setShowGreenGlow(false);
    }
  }, [isAnswerRight, isSuccessDance]);

  // Determine which positioning class to apply based on state
  const getContainerClass = () => {
    // Centered states (important moments)
    if (isAnswerRight) return showGreenGlow ? 'answer-right-centered show-green' : 'answer-right-centered';
    if (isSuccessDance) return 'answer-right-centered show-green hidden';
    if (isAnswerWrong) return showRedGlow ? 'answer-wrong-centered show-red' : 'answer-wrong-centered';
    if (isAnswerWaiting) return 'quest-offer-centered'; // Golden glow for waiting
    if (isQuestOffer) return 'quest-offer-centered'; // Golden glow for quest

    // Fail-dance state - same red glow as answer-wrong but off-screen
    if (isFailDance) return 'answer-wrong-centered show-red hidden';

    // Hidden state (completely off-screen) - includes basic and input-basic
    if (isBasic || isInputBasic) return 'hidden';

    // Rest position - bottom anchored for interactive states
    return 'bottom-anchored';
  };

  // Debug: Log container class changes
  const containerClass = getContainerClass();
  React.useEffect(() => {
    console.log('[RecordPanel] Container class:', containerClass, '| dialogueState:', dialogueState, '| showRedGlow:', showRedGlow, '| isFailDance:', isFailDance);
  }, [containerClass, dialogueState, showRedGlow, isFailDance]);

  // Allow scroll events to pass through to the underlying scene scroll container
  const handleWheel = (e: React.WheelEvent) => {
    const scrollContainer = document.querySelector('.story-scroll');
    if (scrollContainer && e.target instanceof HTMLElement) {
      const isScrollableContent = e.target.scrollHeight > e.target.clientHeight;
      if (!isScrollableContent) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaZ: e.deltaZ,
          deltaMode: e.deltaMode,
          bubbles: true,
          cancelable: true
        });
        scrollContainer.dispatchEvent(wheelEvent);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`record-panel-container ${containerClass}`}
      onWheel={handleWheel}
    >
      {/* Hint Toast - slides up from under record panel */}
      <div className={`hint-toast ${showHint ? 'visible' : ''}`}>
        <img className="hint-toast-icon" src="/VisualAssets/lightbulb.svg" alt="" />
        <span className="hint-toast-text">{hintText}</span>
      </div>

      {/* Main Frame - matching Figma exactly */}
      <div className="frame">
        {/* Quest Section - white card with shadow */}
        <div className={`whiteframe ${useQuestOfferStyling ? 'quest-offer' : ''}`}>
          <div className="quest">
            <p className={`quest-find-out-what ${useQuestOfferStyling ? 'quest-offer' : ''}`}>
              {isAskClue || isAnswerClue ? (
                <span className="quest-label" style={{ color: '#b2652a' }}>What clue leads to the answer?</span>
              ) : useQuestOfferStyling ? (
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
          <div className={`whiteframe answer-frame ${(isAnswerWaiting || isAnswerRight || isAnswerWrong || isSuccessDance) ? 'answer-feedback-state' : ''}`}>
            <div className={`quest ${isAnswerWaiting ? 'answer-waiting' : ''} ${(isAnswerRight || isSuccessDance) ? 'answer-right' : ''} ${isAnswerWrong ? 'answer-wrong' : ''}`}>
              <p className="quest-find-out-what">
                <span className="quest-label">Answer:</span>
              </p>
              <div className="answer-input-box">
                {(isAnswerRecording || isWaitingForAnswerFinalize) ? (
                  answerText ? (
                    <span className="answer-placeholder">{answerText}</span>
                  ) : (
                    <AudioVisualizer audioLevel={audioLevel} className="answer-variant" mode="listening" />
                  )
                ) : isAnswerProcessing ? (
                  <AudioVisualizer audioLevel={audioLevel} className="answer-variant" mode="processing" />
                ) : (
                  <span className="quest-description">{answerText || 'Someone stole your cookies.'}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Button Rail - white background with buttons */}
        {/* Hide button rail for answer feedback states (answer-waiting, answer-right, answer-wrong, success-dance, fail-dance) */}
        {!isAnswerWaiting && !isAnswerRight && !isAnswerWrong && !isSuccessDance && !isFailDance && (
          <div className="frame-wrapper">
            {isAskClue || isAnswerClue ? (
              /* Ask/Answer Clue State: Show clue selection panel */
              <ClueSelectionPanel
                clues={clues}
                onClueSelect={(label) => {
                  console.log('[RecordPanel] Clue selected:', label);
                  // Find the clue description for this label
                  const selectedClue = clues.find(c => c.hotspotName === label);
                  const clueDescription = selectedClue?.description || '';
                  console.log('[RecordPanel] Clue description:', clueDescription);

                  // Emit CLUE_SELECTED event to navigation machine with description
                  navigationBus.emit({
                    type: 'CLUE_SELECTED',
                    clueLabel: label,
                    clueDescription: clueDescription
                  });
                }}
              />
            ) : useQuestOfferStyling ? (
              /* Quest Offer: Single Accept button centered */
              <div className="button-wrapper">
                <button className="button accept-btn" onClick={handleAcceptQuest} disabled={disabled}>
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
                    className={`hint-btn ${showHint ? 'active' : ''} ${hintButtonDisabled ? 'disabled' : ''}`}
                    onClick={handleHintClick}
                    disabled={hintButtonDisabled}
                    title="Get a hint"
                  >
                    <img className="img" alt="" src="/VisualAssets/lightbulb.svg" />
                  </button>
                </div>

                {/* Answer Button - locked until first transcript received or quest complete, transforms when recording answer */}
                <NextButton
                  locked={!unlockAnswerButton && questState !== 'complete'}
                  onClick={handleAnswerClick}
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

      {/* Hand stamp video and seal - Orchestrator controls playback via CSS classes */}
      {(isAnswerWaiting || isAnswerRight || isAnswerWrong || isSuccessDance || isFailDance) && (
        <VideoFeedback
          dialogueState={dialogueState}
          onAnswerWrongVideoComplete={onAnswerWrongVideoComplete}
          onAnswerRightVideoComplete={onAnswerRightVideoComplete}
          onRedGlowStart={() => setShowRedGlow(true)}
          onGreenGlowStart={() => setShowGreenGlow(true)}
        />
      )}
    </div>
  );
};

/**
 * VideoFeedback - Handles video playback and seal display
 * Extracted as a separate component to manage its own lifecycle
 */
interface VideoFeedbackProps {
  dialogueState: string;
  onAnswerWrongVideoComplete?: () => void;
  onAnswerRightVideoComplete?: () => void;
  onRedGlowStart?: () => void;
  onGreenGlowStart?: () => void;
}

const VideoFeedback: React.FC<VideoFeedbackProps> = ({
  dialogueState,
  onAnswerWrongVideoComplete,
  onAnswerRightVideoComplete,
  onRedGlowStart,
  onGreenGlowStart
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [showStamp, setShowStamp] = React.useState(false);
  const [videoComplete, setVideoComplete] = React.useState(false);
  const [showRedGlow, setShowRedGlow] = React.useState(false);

  const isAnswerWaiting = dialogueState === 'answer-waiting';
  const isAnswerRight = dialogueState === 'answer-right';
  const isAnswerWrong = dialogueState === 'answer-wrong';
  const isSuccessDance = dialogueState === 'success-dance';
  const isFailDance = dialogueState === 'fail-dance';

  // Reset state when leaving answer feedback states
  React.useEffect(() => {
    if (!isAnswerWaiting && !isAnswerRight && !isAnswerWrong && !isFailDance) {
      setShowStamp(false);
      setVideoComplete(false);
      setShowRedGlow(false);
    }
  }, [isAnswerWaiting, isAnswerRight, isAnswerWrong, isFailDance]);

  // Handle video playback
  React.useEffect(() => {
    if (isAnswerWaiting) {
      // Wait 500ms before starting video in answer-waiting state
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.playbackRate = 0.7;
          videoRef.current.play();
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if ((isAnswerRight || isAnswerWrong) && !videoComplete) {
      // Play immediately for right/wrong states
      if (videoRef.current) {
        videoRef.current.playbackRate = 0.7;
        videoRef.current.play();
      }
    } else if (isFailDance || isSuccessDance) {
      // For fail-dance and success-dance, show stamp immediately without video
      setShowStamp(true);
      setVideoComplete(true);
    }
  }, [isAnswerWaiting, isAnswerRight, isAnswerWrong, isFailDance, isSuccessDance, videoComplete]);

  return (
    <div className="answer-stamp-container">
      <div className={`answer-seal-stamp ${showStamp ? 'stamp-visible' : ''} ${isAnswerWaiting ? 'seal-hidden' : ''}`}>
        <img
          src={(isAnswerWrong || isFailDance) ? '/VisualAssets/angrySeal.png' : '/VisualAssets/happySeal.png'}
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
              setVideoComplete(true);
            }
            // Switch to red glow at halfway point for answer-wrong
            if (isAnswerWrong && !showRedGlow) {
              setShowRedGlow(true);
              onRedGlowStart?.();
            }
            // Switch to green glow at halfway point for answer-right
            if (isAnswerRight && !showRedGlow) {
              setShowRedGlow(true);
              onGreenGlowStart?.();
            }
            // Pause only for answer-waiting state
            if (isAnswerWaiting && !video.paused) {
              video.pause();
            }
          }
        }}
        onEnded={(e) => {
          // Mark video as complete
          setVideoComplete(true);
          // Hide video after it ends
          (e.target as HTMLVideoElement).style.display = 'none';

          // For answer-wrong: Wait 1 second to show red glow, then emit VIDEO_COMPLETE event
          if (isAnswerWrong) {
            setTimeout(() => {
              navigationBus.emit({
                type: 'VIDEO_COMPLETE',
                nodeId: '', // Machine will determine the node
                videoType: 'answer-wrong'
              });
            }, 1000);

            // Call legacy callback if provided
            if (onAnswerWrongVideoComplete) {
              onAnswerWrongVideoComplete();
            }
          }

          // For answer-right: Call legacy callback
          if (isAnswerRight && onAnswerRightVideoComplete) {
            onAnswerRightVideoComplete();
          }
        }}
      />
    </div>
  );
};
