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
import { useAudioLevel, useRecordingStatus } from './RecordingOrchestrator';
import * as navigationBus from '@core/navigation/events/navigationBus';
import type { CharacterScene } from '@core/types/scene';
import {
  hasShown,
  markShown,
  getToastConfig,
  type ToastKey
} from '@core/toast';
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

  // Refs for toast positioning
  const askButtonRef = React.useRef<HTMLButtonElement>(null);
  const hintButtonRef = React.useRef<HTMLButtonElement>(null);
  const answerButtonRef = React.useRef<HTMLDivElement>(null);

  // Track previous state for toast triggers
  const prevDialogueStateRef = React.useRef<string>('');
  const hasBeenToPostAIRef = React.useRef(false); // Track if user has seen post-ai phase
  const justCameFromWrongAnswerRef = React.useRef(false);

  // Get real-time audio level for visualization (updates at 60fps)
  const audioLevel = useAudioLevel();

  // Get actual recording status from the STT system (not navigation state)
  // This tells us if the mic is ACTUALLY recording, not just if we're in recording state
  const actualRecordingStatus = useRecordingStatus();
  const isActuallyRecording = actualRecordingStatus === 'recording';

  // Get clues from ClueStore for clue selection
  const { clues } = useClueStore();

  // Read state reactively from navigation store (triggers re-render on phase changes)
  const currentNode = useNavigationStore(selectCurrentNode);
  const scene = currentNode?.scene;
  const dialogueState = currentNode?.phase || 'basic'; // Phase IS the dialogue state

  // DEBUG: Log on every render to see what phase we're getting
  console.log('[RecordPanel] RENDER - dialogueState:', dialogueState, '| scene type:', scene?.type);

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
  const isRecordingSubmit = dialogueState === 'recording-submit';
  const isAnswerSubmit = dialogueState === 'answer-submit';
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
  const isNoAudioRecorded = dialogueState === 'no-audio-recorded';
  const isWaiting = dialogueState === 'ai-waiting' || isWaitingForFinalize || isWaitingForAnswerFinalize || isAnswerWaiting || isProcessing || isAnswerProcessing;

  // Hidden state (basic or input-basic) should use quest-offer visual styling
  const useQuestOfferStyling = isQuestOffer || isBasic || isInputBasic;

  const handleAskClick = () => {
    if (disabled) return;
    setActiveToast(null); // Dismiss any active toast
    navigationBus.emit({ type: 'ASK_BUTTON_CLICKED' });
  };

  const handleAcceptQuest = () => {
    if (disabled) return;
    setActiveToast(null); // Dismiss any active toast
    navigationBus.emit({ type: 'REQUEST_NAV_NEXT' });
  };

  const handleAnswerClick = () => {
    if (disabled) return;
    setActiveToast(null); // Dismiss any active toast
    navigationBus.emit({ type: 'ANSWER_BUTTON_CLICKED' });
  };

  const handleHintClick = () => {
    if (disabled) return;
    setActiveToast(null); // Dismiss any active toast
    setShowHint(prev => !prev);
  };

  const handleRetryRecording = () => {
    setActiveToast(null); // Dismiss any active toast
    navigationBus.emit({ type: 'RETRY_RECORDING' });
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

  // Show answer text for answer recording and all answer-related states (including success-dance, fail-dance, and answer-submit)
  const showAnswerText = isAnswerRecording || isAnswerProcessing || isWaitingForAnswerFinalize || isAnswerWaiting || isAnswerRight || isAnswerWrong || isSuccessDance || isFailDance || isAnswerSubmit;

  // Show question text for ask recording states (mirrors answer recording display)
  // Include recording-submit so the question shows in the input box style during review
  const showQuestionText = isAskRecording || isProcessing || isWaitingForFinalize || isRecordingSubmit;
  const questionText = (scene as CharacterScene)?.questionText || '';

  // Track red glow state for answer-wrong and fail-dance
  const [showRedGlow, setShowRedGlow] = React.useState(false);
  // Track green glow state for answer-right
  const [showGreenGlow, setShowGreenGlow] = React.useState(false);
  // Track delay before revealing stamp (panel stays hidden during delay)
  const [delayingReveal, setDelayingReveal] = React.useState(false);

  // State for first-time toasts
  const [activeToast, setActiveToast] = React.useState<ToastKey | null>(null);

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

  // No delay - panel pops up immediately when entering answer-right/answer-wrong
  React.useEffect(() => {
    // Always set delayingReveal to false - no delay before showing stamp
    setDelayingReveal(false);
  }, [isAnswerRight, isAnswerWrong]);

  // First-time toast logic: Determine which toast to show based on phase transitions
  // The Ask/Hint/Answer buttons are visible when NOT in quest-offer styling and NOT in clue selection
  const isButtonsVisible = !useQuestOfferStyling && !isAskClue && !isAnswerClue &&
    !isAnswerWaiting && !isAnswerRight && !isAnswerWrong && !isSuccessDance && !isFailDance;

  // Ref to track pending toast timeout
  const toastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const prevState = prevDialogueStateRef.current;

    // DEBUG: Log phase transitions
    console.log('[RecordPanel Toast] Phase:', dialogueState, '| isButtonsVisible:', isButtonsVisible, '| prevState:', prevState);

    // Track if we just came from answer-wrong (for hint toast)
    if (prevState === 'answer-wrong' || prevState === 'fail-dance') {
      justCameFromWrongAnswerRef.current = true;
    }

    // Track if user has been through ai-waiting (AI has responded) - set when LEAVING ai-waiting
    if (prevState === 'ai-waiting') {
      hasBeenToPostAIRef.current = true;
    }

    // Clear any pending toast timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }

    // Determine which toast to show
    let toastToShow: ToastKey | null = null;
    let needsDelay = false; // Whether to delay showing the toast (for container transition)

    // Recording states take priority (check these first)
    // 1. Entering recording state for a question: "Ask a question out loud..."
    if (isAskRecording && !hasShown('input:ask-recording')) {
      toastToShow = 'input:ask-recording';
      markShown('input:ask-recording'); // Mark as shown since we use inline toast
    }
    // 2. Entering recording state for an answer: "Tell the answer then click stop."
    else if (isAnswerRecording && !hasShown('answer:recording')) {
      toastToShow = 'answer:recording';
      markShown('answer:recording'); // Mark as shown since we use inline toast
    }
    // 3. Clue selection phases
    else if (isAskClue && !hasShown('clue-selection:ask')) {
      toastToShow = 'clue-selection:ask';
    }
    else if (isAnswerClue && !hasShown('clue-selection:answer')) {
      toastToShow = 'clue-selection:answer';
    }
    // 4. Normal input state toasts (when buttons are visible and not recording)
    else if (isButtonsVisible) {
      console.log('[RecordPanel Toast] Buttons visible, hasShown input:first?', hasShown('input:first'));
      if (!hasShown('input:first')) {
        toastToShow = 'input:first';
        markShown('input:first'); // Mark as shown since we use inline toast
        // Delay showing if container was previously hidden (transitioning in)
        needsDelay = prevState === '' || prevState === 'basic' || prevState === 'input-basic' || prevState === 'quest-showing';
      }
      // After getting wrong answer and returning to input: Show hint toast
      else if (justCameFromWrongAnswerRef.current && !hasShown('input:hint')) {
        toastToShow = 'input:hint';
        markShown('input:hint'); // Mark as shown since we use inline toast
        justCameFromWrongAnswerRef.current = false; // Reset flag
      }
      // After user has been to post-ai phase and returned to input: Show post-ai toast with 2 second delay
      else if (hasBeenToPostAIRef.current && !hasShown('input:post-ai')) {
        // Schedule toast after 2 second delay
        toastTimeoutRef.current = setTimeout(() => {
          setActiveToast('input:post-ai');
          markShown('input:post-ai');
        }, 2000);
        // Don't set toastToShow here since we're handling it in the timeout
        prevDialogueStateRef.current = dialogueState;
        return; // Early return to skip the normal setActiveToast logic
      }
    }

    console.log('[RecordPanel Toast] Setting activeToast to:', toastToShow, 'needsDelay:', needsDelay);

    if (toastToShow && needsDelay) {
      // Delay toast to wait for container transition (0.6s transition + small buffer)
      toastTimeoutRef.current = setTimeout(() => {
        setActiveToast(toastToShow);
      }, 700);
    } else {
      setActiveToast(toastToShow);
    }

    prevDialogueStateRef.current = dialogueState;

    // Cleanup timeout on unmount or re-run
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [dialogueState, isButtonsVisible, isAskClue, isAnswerClue, isAskRecording, isAnswerRecording, unlockAnswerButton]);

  // Determine which positioning class to apply based on state
  const getContainerClass = () => {
    // During reveal delay, keep panel hidden
    if (delayingReveal) return 'hidden';

    // Centered states (important moments)
    if (isAnswerRight) return showGreenGlow ? 'answer-right-centered show-green' : 'answer-right-centered';
    if (isSuccessDance) return 'answer-right-centered show-green hidden';
    if (isAnswerWrong) return showRedGlow ? 'answer-wrong-centered show-red' : 'answer-wrong-centered';
    if (isAnswerWaiting) return 'hidden'; // Panel lowered while waiting for AI response
    if (isQuestOffer) return 'quest-offer-centered'; // Golden glow for quest
    // Note: isAnswerProcessing falls through to 'bottom-anchored' - stays in place like recording

    // Fail-dance state - same red glow as answer-wrong but off-screen
    if (isFailDance) return 'answer-wrong-centered show-red hidden';

    // Hidden state (completely off-screen) - includes basic and input-basic
    if (isBasic || isInputBasic) return 'hidden';

    // Recording submit state - bottom anchored for review
    if (isRecordingSubmit) return 'bottom-anchored';

    // Answer submit state - bottom anchored for review
    if (isAnswerSubmit) return 'bottom-anchored';

    // No audio recorded state - centered for error message
    if (isNoAudioRecorded) return 'bottom-anchored';

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
              {isAskClue ? (
                <span className="quest-label" style={{ color: '#b2652a' }}>What clue do you want to ask a question about?</span>
              ) : isAnswerClue ? (
                <>
                  <span className="quest-label">Quest:</span>
                  <span className="quest-description"> {questText}</span>
                </>
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



        {/* Question Display Frame - shown during ask recording states (mirrors answer-frame styling) */}
        {showQuestionText && (
          <div className="whiteframe question-frame">
            <div className="quest">
              <p className="quest-find-out-what">
                <span className="quest-label">Your question:</span>
              </p>
              <div className="question-input-box">
                {(isAskRecording || isWaitingForFinalize) ? (
                  questionText ? (
                    <span className="question-placeholder">{questionText}</span>
                  ) : (
                    <AudioVisualizer audioLevel={audioLevel} className="question-variant" mode="listening" />
                  )
                ) : isProcessing ? (
                  <AudioVisualizer audioLevel={audioLevel} className="question-variant" mode="processing" />
                ) : isRecordingSubmit ? (
                  <span className="question-placeholder">{questionText}</span>
                ) : null}
              </div>
            </div>
          </div>
        )}

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
                ) : isAnswerSubmit ? (
                  <span className="answer-placeholder">{answerText}</span>
                ) : (
                  <span className="quest-description">{answerText || 'Someone stole your cookies.'}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Button Rail - white background with buttons */}
        {/* Hide button rail for answer feedback states only */}
        {!isAnswerWaiting && !isAnswerRight && !isAnswerWrong && !isSuccessDance && !isFailDance && (
          <div className="frame-wrapper">
            {isAskClue || isAnswerClue ? (
              /* Ask/Answer Clue State: Show clue selection panel */
              <div className="clue-selection-wrapper">
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
                {/* Toast anchored above clue selection */}
                {(activeToast === 'clue-selection:ask' || activeToast === 'clue-selection:answer') && (() => {
                  const config = getToastConfig(activeToast);
                  const message = Array.isArray(config) ? config[0]?.message : config?.message;
                  return (
                    <div className="button-toast button-toast--above-grid" onClick={() => setActiveToast(null)}>
                      {message}
                      <div className="button-toast__arrow" />
                    </div>
                  );
                })()}
              </div>
            ) : useQuestOfferStyling ? (
              /* Quest Offer: Single Accept button centered */
              <div className="button-wrapper">
                <button className="button accept-btn" onClick={handleAcceptQuest} disabled={disabled}>
                  <div className="answer">Accept</div>
                </button>
              </div>
            ) : isRecordingSubmit ? (
              /* Recording Submit State: Cancel and Send buttons (same style as answer-submit) */
              <div className="div answer-submit-buttons">
                {/* Cancel (X) button - red tint */}
                <button
                  className="button cancel-recording-btn"
                  onClick={() => {
                    setActiveToast(null);
                    navigationBus.emit({ type: 'CANCEL_RECORDING' });
                  }}
                  title="Cancel and re-record"
                >
                  <span className="cancel-x">✕</span>
                </button>

                {/* Send button - green with paper airplane icon */}
                <button
                  className="button send-recording-btn"
                  onClick={() => {
                    setActiveToast(null);
                    navigationBus.emit({ type: 'SUBMIT_RECORDING' });
                  }}
                  title="Send to AI"
                >
                  <svg className="button-icon send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="button-text">Send</div>
                </button>
              </div>
            ) : isAnswerSubmit ? (
              /* Answer Submit State: Cancel and Send buttons */
              <div className="div answer-submit-buttons">
                {/* Cancel (X) button - red tint */}
                <button
                  className="button cancel-recording-btn"
                  onClick={() => {
                    setActiveToast(null);
                    navigationBus.emit({ type: 'CANCEL_ANSWER' });
                  }}
                  title="Cancel and re-record"
                >
                  <span className="cancel-x">✕</span>
                </button>

                {/* Send button - green with paper airplane icon */}
                <button
                  className="button send-recording-btn"
                  onClick={() => {
                    setActiveToast(null);
                    navigationBus.emit({ type: 'SUBMIT_ANSWER' });
                  }}
                  title="Submit answer"
                >
                  <svg className="button-icon send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="button-text">Send</div>
                </button>
              </div>
            ) : isNoAudioRecorded ? (
              /* No Audio Recorded State: Error message and Retry button */
              <div className="div no-audio-recorded-content">
                <p className="no-audio-message">
                  No audio recorded. Please make sure you allowed voice recording.
                </p>
                <button
                  className="button retry-recording-btn"
                  onClick={handleRetryRecording}
                  title="Try again"
                >
                  <div className="button-text">Try Again</div>
                </button>
              </div>
            ) : (
              /* Normal State: Ask, Hint, Answer buttons */
              <div className="div">
                <div className="div-2">
                  {/* Ask Button - transforms to Stop when recording */}
                  <div className="ask-button-wrapper">
                    <button
                      ref={askButtonRef}
                      className={`button ${isAskRecording ? 'recording-active' : ''} ${askButtonDisabled ? 'disabled' : ''} ${isAskRecording && !isActuallyRecording ? 'disabled' : ''}`}
                      onClick={isAskRecording ? (isActuallyRecording ? onRecordStop : undefined) : handleAskClick}
                      disabled={askButtonDisabled || (isAskRecording && !isActuallyRecording)}
                      title={isAskRecording ? (isActuallyRecording ? "Stop recording" : "Starting...") : "Ask a question"}
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
                    {/* Toast anchored above Ask/Stop button */}
                    {(activeToast === 'input:first' || activeToast === 'input:ask-recording') && (() => {
                      const config = getToastConfig(activeToast);
                      const message = Array.isArray(config) ? config[0]?.message : config?.message;
                      return (
                        <div className="button-toast" onClick={() => setActiveToast(null)}>
                          {message}
                          <div className="button-toast__arrow" />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Hint Button - cardboard button with lightbulb, pressed when hint showing */}
                  <div className="hint-button-wrapper">
                    <button
                      ref={hintButtonRef}
                      className={`hint-btn ${showHint ? 'active' : ''} ${hintButtonDisabled ? 'disabled' : ''}`}
                      onClick={handleHintClick}
                      disabled={hintButtonDisabled}
                      title="Get a hint"
                    >
                      <img className="img" alt="" src="/VisualAssets/lightbulb.svg" />
                    </button>
                    {/* Toast anchored above Hint button */}
                    {activeToast === 'input:hint' && (() => {
                      const config = getToastConfig('input:hint');
                      const message = Array.isArray(config) ? config[0]?.message : config?.message;
                      return (
                        <div className="button-toast" onClick={() => setActiveToast(null)}>
                          {message}
                          <div className="button-toast__arrow" />
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Answer Button - locked until first transcript received or quest complete, transforms when recording answer */}
                <div className="answer-button-wrapper" ref={answerButtonRef}>
                  <NextButton
                    locked={!unlockAnswerButton && questState !== 'complete'}
                    onClick={handleAnswerClick}
                    onRecordStop={onRecordStop}
                    label="Answer"
                    disabled={answerButtonDisabled}
                    isRecording={isAnswerRecording}
                    isActuallyRecording={isActuallyRecording}
                  />
                  {/* Toast anchored above Answer button */}
                  {(activeToast === 'input:post-ai' || activeToast === 'answer:recording') && (() => {
                    const config = getToastConfig(activeToast);
                    const message = Array.isArray(config) ? config[0]?.message : config?.message;
                    return (
                      <div className="button-toast" onClick={() => setActiveToast(null)}>
                        {message}
                        <div className="button-toast__arrow" />
                      </div>
                    );
                  })()}
                </div>
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
  const [showStamp, setShowStamp] = React.useState(false);

  const isAnswerRight = dialogueState === 'answer-right';
  const isAnswerWrong = dialogueState === 'answer-wrong';
  const isSuccessDance = dialogueState === 'success-dance';
  const isFailDance = dialogueState === 'fail-dance';

  // Reset when leaving feedback states
  React.useEffect(() => {
    if (!isAnswerRight && !isAnswerWrong && !isFailDance && !isSuccessDance) {
      setShowStamp(false);
    }
  }, [isAnswerRight, isAnswerWrong, isFailDance, isSuccessDance]);

  // Timeline: show stamp immediately -> jiggle for 4s -> VIDEO_COMPLETE/dance
  // Note: Panel reveal delay (0.5s) is handled by delayingReveal in RecordPanel
  React.useEffect(() => {
    if (isAnswerRight || isAnswerWrong) {
      // Show stamp immediately (panel will be hidden for 0.5s by delayingReveal)
      setShowStamp(true);

      // Trigger glow when stamp appears
      if (isAnswerRight) {
        onGreenGlowStart?.();
      } else {
        onRedGlowStart?.();
      }

      // Wait 3 seconds then emit VIDEO_COMPLETE
      if (isAnswerWrong) {
        const timer = setTimeout(() => {
          navigationBus.emit({
            type: 'VIDEO_COMPLETE',
            nodeId: '',
            videoType: 'answer-wrong'
          });
          onAnswerWrongVideoComplete?.();
        }, 3000);
        return () => clearTimeout(timer);
      }

      if (isAnswerRight) {
        const timer = setTimeout(() => {
          onAnswerRightVideoComplete?.();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    // For success-dance and fail-dance, show stamp immediately (already revealed)
    if (isSuccessDance || isFailDance) {
      setShowStamp(true);
      if (isSuccessDance) {
        onGreenGlowStart?.();
      } else {
        onRedGlowStart?.();
      }
    }
  }, [isAnswerRight, isAnswerWrong, isSuccessDance, isFailDance]);

  const isWrongState = isAnswerWrong || isFailDance;
  const stampClass = `answer-seal-stamp ${showStamp ? 'stamp-visible' : ''} ${isWrongState ? 'stamp-wrong' : 'stamp-right'}`;

  return (
    <div className="answer-stamp-container">
      <div className={stampClass}>
        <img
          src={isWrongState ? '/VisualAssets/angrySeal.png' : '/VisualAssets/happySeal.png'}
          alt="Answer Seal"
          className="answer-seal-image"
        />
      </div>
    </div>
  );
};
