/**
 * RecordPanel - Reactive recording UI
 *
 * Reads state directly from currentNode and emits events to navigation bus.
 * No longer needs orchestrator to pass props - derives everything from navigation state.
 *
 * Displays: Quest label, Ask button, Hint button, Answer button, Toast notifications, Video feedback
 */
import React from 'react';
import { Toast, useToast } from '../../features/chat/ui/Toast';
import { AudioVisualizer } from './AudioVisualizer';
import { WaveVisualizer } from './WaveVisualizer';
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

/** Truncate text to maxLength characters with ellipsis if longer */
const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

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

  // Get clue registry for looking up clues by reference
  const { getCluesByReference } = useClueStore();

  // Read state reactively from navigation store (triggers re-render on phase changes)
  const currentNode = useNavigationStore(selectCurrentNode);
  const scene = currentNode?.scene;

  // Get conversation metadata to find clueReference
  // Use AIOrchestrator's getConversationMetadata (where the metadata is actually stored)
  const characterScene = scene as CharacterScene | undefined;
  const conversationMetadata = getConversationMetadata(characterScene?.conversationId);
  const clueReference = conversationMetadata?.clueReference;

  // Look up clues by reference (deterministic based on story structure)
  // Only look up clues when we have a valid reference to avoid warnings
  const clues = clueReference ? getCluesByReference(clueReference) : [];
  const dialogueState = currentNode?.phase || 'basic'; // Phase IS the dialogue state

  // Get unlockAnswerButton flag from machine context
  const [unlockAnswerButton, setUnlockAnswerButton] = React.useState(false);
  React.useEffect(() => {
    const service = getServiceInstance();
    if (!service) {
      return;
    }

    const subscription = service.subscribe((snapshot) => {
      const newValue = snapshot.context.unlockAnswerButton;
      // Only update state if value actually changed (avoid unnecessary re-renders)
      setUnlockAnswerButton((prev) => (prev !== newValue ? newValue : prev));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);



  // Derive quest state from phase (quest complete when we have answerText and it's correct)
  const questState: 'active' | 'complete' | 'failed' = React.useMemo(() => {
    if (dialogueState === 'answer-right') return 'complete';
    if (dialogueState === 'answer-wrong') return 'failed';
    return 'active';
  }, [dialogueState]);

  // Get quest text from conversation metadata
  const conversationId = (scene as CharacterScene)?.conversationId;
  const metadata = conversationId ? getConversationMetadata(conversationId) : null;
  const questText = metadata?.questText || "Find out what going on.";

  // Get answer text from scene
  const answerText = (scene as CharacterScene)?.answerText || '';

  // Disabled state (could be extended with additional logic)
  const disabled = false;

  // Determine visual state based on dialogueState
  const isBasic = dialogueState === 'basic';
  const isInputBasic = dialogueState === 'input-basic';
  const isQuestOffer = dialogueState === 'quest-showing';
  // Standalone phases for mobile (no speech bubbles)
  const isStandaloneQuest = dialogueState === 'quest-standalone';
  const isInput = dialogueState === 'input';
  const isAskClue = dialogueState === 'askClue';
  const isAnswerClue = dialogueState === 'answerClue';
  const isPreAskRecording = dialogueState === 'pre-ask-recording';
  const isPreAnswerRecording = dialogueState === 'pre-answer-recording';
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
  const isNoMicrophone = dialogueState === 'no-microphone';
  const isWaiting = dialogueState === 'ai-waiting' || isWaitingForFinalize || isWaitingForAnswerFinalize || isAnswerWaiting || isProcessing || isAnswerProcessing;

  // Hidden state (basic or input-basic) should use quest-offer visual styling
  // Standalone quest also uses quest-offer styling (centered Accept button)
  const useQuestOfferStyling = isQuestOffer || isBasic || isInputBasic || isStandaloneQuest;

  // Helper to dismiss toast
  const dismissToast = () => {
    setActiveToast(null);
  };

  const handleAskClick = () => {
    if (disabled) return;
    dismissToast();
    navigationBus.emit({ type: 'ASK_BUTTON_CLICKED' });
  };

  const handleAcceptQuest = () => {
    if (disabled) return;
    dismissToast();
    navigationBus.emit({ type: 'REQUEST_NAV_NEXT' });
  };

  const handleAnswerClick = () => {
    if (disabled) return;
    dismissToast();
    navigationBus.emit({ type: 'ANSWER_BUTTON_CLICKED' });
  };


  const handleRetryRecording = () => {
    dismissToast();
    navigationBus.emit({ type: 'RETRY_RECORDING' });
  };

  // Disable logic:
  // - When Ask is recording: Hint and Answer are disabled, but Ask is enabled (so user can stop)
  // - When Answer is recording: Ask and Hint are disabled, but Answer is enabled (so user can stop)
  // - When waiting: all buttons disabled
  const askButtonDisabled = isAnswerRecording || isWaiting || isAnswerWaiting || disabled;
  const answerButtonDisabled = isAskRecording || isWaiting || isAnswerWaiting || disabled;

  // Show answer text for answer-related states (including success-dance and fail-dance)
  // Note: isAnswerRecording and isAnswerProcessing now use the visualizer in the button rail (same as ask recording)
  // Note: isAnswerSubmit, isAnswerWrong, isAnswerRight, and isAnswerWaiting now have their own dedicated layout sections (same as recording-submit)
  const showAnswerText = isWaitingForAnswerFinalize || isSuccessDance || isFailDance;

  // Show question text for ask recording states (mirrors answer recording display)
  // Note: recording-submit now has its own dedicated layout section
  // Note: isProcessing now has its own full-width panel in the button rail
  const showQuestionText = isWaitingForFinalize;
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

    // Helper to check if toast should show (not in persistent memory)
    const shouldShowToast = (key: ToastKey) => !hasShown(key);

    // Recording states take priority (check these first)
    // 1. Entering recording state for a question: "Ask a question out loud..."
    if (isAskRecording && shouldShowToast('input:ask-recording')) {
      toastToShow = 'input:ask-recording';
      markShown('input:ask-recording'); // Mark as shown since we use inline toast
    }
    // 2. Entering recording state for an answer: "Tell the answer then click stop."
    else if (isAnswerRecording && shouldShowToast('answer:recording')) {
      toastToShow = 'answer:recording';
      markShown('answer:recording'); // Mark as shown since we use inline toast
    }
    // 3. Pre-ask-recording phase: Show first toast pointing to "Ask Your Question" button
    else if (isPreAskRecording && shouldShowToast('input:first')) {
      toastToShow = 'input:first';
      markShown('input:first');
    }
    // 5. Normal input state toasts (when buttons are visible and not recording)
    else if (isButtonsVisible) {
      // Priority 1: When answer button is unlocked, show post-ai toast pointing to "I Know Now"
      // This takes priority because it's the most relevant action when user can answer
      if (unlockAnswerButton && shouldShowToast('input:post-ai')) {
        toastToShow = 'input:post-ai';
        markShown('input:post-ai');
      }
      // Priority 2: After getting wrong answer and returning to input, show hint toast
      else if (justCameFromWrongAnswerRef.current && shouldShowToast('input:hint')) {
        toastToShow = 'input:hint';
        markShown('input:hint'); // Mark as shown since we use inline toast
        justCameFromWrongAnswerRef.current = false; // Reset flag
      }
      // Priority 3: First time seeing input phase, show initial guidance
      else if (shouldShowToast('input:first')) {
        toastToShow = 'input:first';
        markShown('input:first'); // Mark as shown since we use inline toast
        // Delay showing if container was previously hidden (transitioning in)
        needsDelay = prevState === '' || prevState === 'basic' || prevState === 'input-basic' || prevState === 'quest-showing';
      }
    }

    if (toastToShow && needsDelay) {
      // Delay toast to wait for container transition (0.6s transition + small buffer)
      toastTimeoutRef.current = setTimeout(() => {
        setActiveToast(toastToShow);
      }, 700);
    } else if (toastToShow) {
      // Only set toast if we have one to show (don't clear existing toast unnecessarily)
      setActiveToast(toastToShow);
    }

    prevDialogueStateRef.current = dialogueState;

    // Cleanup timeout on unmount or re-run
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [dialogueState, isButtonsVisible, isAskClue, isAnswerClue, isAskRecording, isAnswerRecording, isPreAskRecording, unlockAnswerButton]);

  // Determine which positioning class to apply based on state
  const getContainerClass = () => {
    // During reveal delay, keep panel hidden
    if (delayingReveal) return 'hidden';

    // Centered states (important moments)
    if (isAnswerRight) return showGreenGlow ? 'answer-right-centered show-green' : 'answer-right-centered';
    if (isSuccessDance) return 'answer-right-centered show-green hidden';
    if (isAnswerWrong) return showRedGlow ? 'answer-wrong-centered show-red' : 'answer-wrong-centered';
    if (isAnswerWaiting) return 'hidden'; // Panel lowered while waiting for AI response
    if (dialogueState === 'ai-waiting') return 'hidden'; // Hide panel while waiting for AI (Ask flow)
    if (isQuestOffer) return 'quest-offer-centered'; // Golden glow for quest

    // Standalone phases for mobile (no speech bubbles, centered on screen)
    if (isStandaloneQuest) return 'quest-offer-centered'; // Same styling as quest-offer

    // Fail-dance state - same red glow as answer-wrong but off-screen
    if (isFailDance) return 'answer-wrong-centered show-red hidden';

    // Hidden state (completely off-screen) - includes basic and input-basic
    if (isBasic || isInputBasic) return 'hidden';

    // Input/answer sequence phases - all centered at midpoint
    // This keeps the panel elevated during the entire input flow
    if (isInput) return 'quest-offer-centered';        // Input phase (ready to record)
    if (isAskClue) return 'quest-offer-centered';      // Clue selection
    if (isAnswerClue) return 'quest-offer-centered';   // Recording answer about clue
    if (isPreAskRecording) return 'quest-offer-centered'; // Pre-recording instruction screen for asking
    if (isPreAnswerRecording) return 'quest-offer-centered'; // Pre-recording instruction screen for answering
    if (isAskRecording) return 'quest-offer-centered'; // Recording question (input-recording)
    if (isProcessing) return 'quest-offer-centered';   // Processing recording (input-processing)
    if (isRecordingSubmit) return 'quest-offer-centered'; // Review recording
    if (isAnswerRecording) return 'quest-offer-centered'; // Recording answer (record-answer)
    if (isAnswerProcessing) return 'quest-offer-centered'; // Processing answer
    if (isAnswerSubmit) return 'quest-offer-centered'; // Submit answer for review
    if (isNoAudioRecorded) return 'quest-offer-centered'; // Error state - no audio
    if (isNoMicrophone) return 'quest-offer-centered'; // Error state - no microphone

    // Rest position - bottom anchored for other interactive states
    return 'bottom-anchored';
  };

  const containerClass = getContainerClass();

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
      {/* Main Frame - matching Figma exactly */}
      <div className="frame">
        {/* Quest Section - white card with shadow (hidden when no audio recorded or no microphone) */}
        {/* Also hidden during recording-submit, answer-submit, answer-wrong, answer-right, and answer-waiting phases which have their own layout */}
        {!isNoAudioRecorded && !isNoMicrophone && !isRecordingSubmit && !isAnswerSubmit && !isAnswerWrong && !isAnswerRight && !isAnswerWaiting && (
          <div className={`whiteframe ${useQuestOfferStyling ? 'quest-offer' : ''} ${isAskClue || isAnswerClue ? 'clue-selection' : ''}`}>
            <div className="quest">
              <p className={`quest-find-out-what ${useQuestOfferStyling ? 'quest-offer' : ''}`}>
                {isAskClue ? (
                  <span className="quest-label" style={{ color: '#b2652a' }}>Select a Clue to Ask About</span>
                ) : isAnswerClue ? (
                  <>
                    <span className="quest-label">Question:</span>
                    <span className="quest-description"> {questText}</span>
                  </>
                ) : isPreAskRecording ? (
                  <>
                    <span className="quest-label">Ask Your Question Out Loud</span>
                    <br />
                    <span className="quest-description">What do you want to know?</span>
                  </>
                ) : isPreAnswerRecording ? (
                  <>
                    <span className="quest-label">Speak Your Answer Out Loud</span>
                    <br />
                    <span className="quest-description">{questText}</span>
                  </>
                ) : useQuestOfferStyling ? (
                  <>
                    <span className="quest-label">The Big Question:</span>
                    <br />
                    <span className="quest-description">{questText}</span>
                  </>
                ) : (
                  <>
                    <span className="quest-label">The Big Question:</span>
                    <br />
                    <span className="quest-description">{questText}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Recording Submit Layout - "Did you say this?" with parchment text display and styled buttons */}
        {isRecordingSubmit && (
          <>
            <div className="whiteframe recording-submit-frame">
              <div className="quest">
                <p className="quest-find-out-what">
                  <span className="quest-label">Did you say this?</span>
                </p>
                <div className="transcript-display">
                  <img className="transcript-mic-icon" src="/VisualAssets/recordIcon.svg" alt="" />
                  <span className="transcript-text">{truncateText(questionText)}</span>
                </div>
              </div>
            </div>
            <div className="frame-wrapper recording-submit-buttons">
              <div className="button-halves-container">
                <div className="half-panel cancel-panel-wrapper">
                  <button
                    className="half-panel-button cancel-panel"
                    onClick={() => {
                      setActiveToast(null);
                      navigationBus.emit({ type: 'CANCEL_RECORDING' });
                    }}
                    title="Try again"
                  >
                    <span className="button-try-again">Try<br />Again</span>
                  </button>
                </div>
                <div className="half-panel submit-panel-wrapper">
                  <button
                    className="half-panel-button submit-panel"
                    onClick={() => {
                      setActiveToast(null);
                      navigationBus.emit({ type: 'SUBMIT_RECORDING' });
                    }}
                    title="Submit"
                  >
                    <div className="button-text">Submit</div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Answer Submit Layout - "Did you say this?" with parchment text display and styled buttons (same as recording-submit) */}
        {/* Also shown during answer-waiting so panel maintains styling while animating (but with processing indicator) */}
        {(isAnswerSubmit || isAnswerWaiting) && (
          <>
            <div className="whiteframe recording-submit-frame">
              <div className="quest">
                <p className="quest-find-out-what">
                  <span className="quest-label">Did you say this?</span>
                </p>
                <div className="transcript-display">
                  <img className="transcript-mic-icon" src="/VisualAssets/recordIcon.svg" alt="" />
                  <span className="transcript-text">{truncateText(answerText)}</span>
                </div>
              </div>
            </div>
            <div className="frame-wrapper recording-submit-buttons">
              <div className="button-halves-container">
                {isAnswerWaiting ? (
                  <div className="half-panel full-width">
                    <div className="half-panel-button visualizer-panel processing-panel">
                      <div className="processing-indicator">
                        <span className="processing-dot" />
                        <span className="processing-dot" />
                        <span className="processing-dot" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="half-panel cancel-panel-wrapper">
                      <button
                        className="half-panel-button cancel-panel"
                        onClick={() => {
                          setActiveToast(null);
                          navigationBus.emit({ type: 'CANCEL_ANSWER' });
                        }}
                        title="Try again"
                      >
                        <span className="button-try-again">Try<br />Again</span>
                      </button>
                    </div>
                    <div className="half-panel submit-panel-wrapper">
                      <button
                        className="half-panel-button submit-panel"
                        onClick={() => {
                          setActiveToast(null);
                          navigationBus.emit({ type: 'SUBMIT_ANSWER' });
                        }}
                        title="Submit"
                      >
                        <div className="button-text">Submit</div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Answer Wrong Layout - same as answer-submit with buttons (seal goes over this) */}
        {isAnswerWrong && (
          <>
            <div className="whiteframe recording-submit-frame">
              <div className="quest">
                <p className="quest-find-out-what">
                  <span className="quest-label">Did you say this?</span>
                </p>
                <div className="transcript-display">
                  <img className="transcript-mic-icon" src="/VisualAssets/recordIcon.svg" alt="" />
                  <span className="transcript-text">{truncateText(answerText)}</span>
                </div>
              </div>
            </div>
            <div className="frame-wrapper recording-submit-buttons">
              <div className="button-halves-container">
                <div className="half-panel cancel-panel-wrapper">
                  <button
                    className="half-panel-button cancel-panel"
                    onClick={() => {
                      setActiveToast(null);
                      navigationBus.emit({ type: 'CANCEL_ANSWER' });
                    }}
                    title="Try again"
                  >
                    <span className="button-try-again">Try<br />Again</span>
                  </button>
                </div>
                <div className="half-panel submit-panel-wrapper">
                  <button
                    className="half-panel-button submit-panel"
                    onClick={() => {
                      setActiveToast(null);
                      navigationBus.emit({ type: 'SUBMIT_ANSWER' });
                    }}
                    title="Submit"
                  >
                    <div className="button-text">Submit</div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Answer Right Layout - same as answer-submit with buttons (seal goes over this) */}
        {isAnswerRight && (
          <>
            <div className="whiteframe recording-submit-frame">
              <div className="quest">
                <p className="quest-find-out-what">
                  <span className="quest-label">Did you say this?</span>
                </p>
                <div className="transcript-display">
                  <img className="transcript-mic-icon" src="/VisualAssets/recordIcon.svg" alt="" />
                  <span className="transcript-text">{truncateText(answerText)}</span>
                </div>
              </div>
            </div>
            <div className="frame-wrapper recording-submit-buttons">
              <div className="button-halves-container">
                <div className="half-panel cancel-panel-wrapper">
                  <button
                    className="half-panel-button cancel-panel"
                    onClick={() => {
                      setActiveToast(null);
                      navigationBus.emit({ type: 'CANCEL_ANSWER' });
                    }}
                    title="Try again"
                  >
                    <span className="button-try-again">Try<br />Again</span>
                  </button>
                </div>
                <div className="half-panel submit-panel-wrapper">
                  <button
                    className="half-panel-button submit-panel"
                    onClick={() => {
                      setActiveToast(null);
                      navigationBus.emit({ type: 'SUBMIT_ANSWER' });
                    }}
                    title="Submit"
                  >
                    <div className="button-text">Submit</div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* No Audio Recorded Message - shown instead of quest when no audio detected */}
        {isNoAudioRecorded && (
          <div className="whiteframe no-audio-frame">
            <div className="quest">
              <p className="quest-find-out-what quest-offer">
                <span className="no-audio-title">No audio recorded.</span>
                <br />
                <span className="no-audio-subtitle">Please make sure you allowed voice recording.</span>
              </p>
            </div>
          </div>
        )}

        {/* No Microphone Message - shown instead of quest when no microphone detected */}
        {isNoMicrophone && (
          <div className="whiteframe no-audio-frame">
            <div className="quest">
              <p className="quest-find-out-what quest-offer">
                <span className="no-audio-title">No microphone detected.</span>
                <br />
                <span className="no-audio-subtitle">Please change your settings.</span>
              </p>
            </div>
          </div>
        )}



        {/* Question Display Frame - shown during ask recording states (mirrors answer-frame styling) */}
        {showQuestionText && (
          <div className="whiteframe question-frame">
            <div className="quest">
              <p className="quest-find-out-what">
                <span className="quest-label">Your question:</span>
              </p>
              <div className="question-input-box">
                {isAskRecording ? (
                  <AudioVisualizer audioLevel={audioLevel} className="question-variant" mode="listening" />
                ) : isProcessing ? (
                  <AudioVisualizer audioLevel={audioLevel} className="question-variant" mode="processing" />
                ) : (isRecordingSubmit || isWaitingForFinalize) ? (
                  <span className="question-placeholder">{truncateText(questionText)}</span>
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
                <span className="quest-label">Your answer:</span>
              </p>
              <div className="answer-input-box">
                {(isAnswerSubmit || isWaitingForAnswerFinalize) ? (
                  <span className="answer-placeholder">{truncateText(answerText)}</span>
                ) : (
                  <span className="quest-description">{truncateText(answerText) || 'Someone stole your cookies.'}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Button Rail - white background with buttons */}
        {/* Hide button rail for answer feedback states and recording-submit/answer-submit (they have their own buttons) */}
        {!isAnswerWaiting && !isAnswerRight && !isAnswerWrong && !isSuccessDance && !isFailDance && !isRecordingSubmit && !isAnswerSubmit && (
          <div className="frame-wrapper">
            {isAskClue || isAnswerClue ? (
              /* Ask/Answer Clue State: Show clue selection panel */
              <div className="clue-selection-wrapper">
                <ClueSelectionPanel
                  clues={clues}
                  onClueSelect={(label) => {
                    // Find the clue description for this label
                    const selectedClue = clues.find(c => c.hotspotName === label);
                    const clueDescription = selectedClue?.description || '';

                    // Emit CLUE_SELECTED event to navigation machine with description
                    navigationBus.emit({
                      type: 'CLUE_SELECTED',
                      clueLabel: label,
                      clueDescription: clueDescription
                    });
                  }}
                />
              </div>
            ) : useQuestOfferStyling ? (
              /* Quest Offer: Single Accept button full width */
              <div className="button-halves-container">
                <div className="half-panel full-width">
                  <button
                    className={`half-panel-button accept-panel ${disabled ? 'disabled' : ''}`}
                    onClick={handleAcceptQuest}
                    disabled={disabled}
                  >
                    <div className="button-content">
                      <div className="button-text">Continue</div>
                      <div className="button-subtext">&nbsp;</div>
                    </div>
                  </button>
                </div>
              </div>
            ) : isPreAskRecording ? (
              /* Pre-Ask Recording: Hint button + Start Recording button */
              <div className="button-halves-container pre-ask-buttons">
                <div className="half-panel hint-panel-wrapper">
                  <button
                    className={`half-panel-button hint-panel ${disabled ? 'disabled' : ''}`}
                    onClick={() => {
                      // Toggle hint toast - if already showing, hide it; otherwise show it
                      setActiveToast(activeToast === 'input:hint' ? null : 'input:hint');
                    }}
                    disabled={disabled}
                    title="Get a hint"
                  >
                    <span className="button-hint-text">HINT</span>
                  </button>
                  {/* Hint toast - anchored to hint button */}
                  {activeToast === 'input:hint' && (() => {
                    const hintText = conversationMetadata?.hint;
                    const fallbackConfig = getToastConfig(activeToast);
                    const fallbackMessage = Array.isArray(fallbackConfig) ? fallbackConfig[0]?.message : fallbackConfig?.message;
                    const message = hintText || fallbackMessage;
                    return (
                      <div className="button-toast hint-button-toast" onClick={dismissToast}>
                        {message}
                        <div className="button-toast__arrow" />
                      </div>
                    );
                  })()}
                </div>
                <div className="half-panel ask-panel-wrapper">
                  <button
                    className={`half-panel-button accept-panel start-recording-panel ${disabled ? 'disabled' : ''}`}
                    onClick={() => {
                      setActiveToast(null);
                      navigationBus.emit({ type: 'START_RECORDING' });
                    }}
                    disabled={disabled}
                  >
                    <img className="mic-icon" src="/VisualAssets/recordIcon.svg" alt="" />
                    <div className="button-text centered-single-line">Ask Your<br className="mobile-break" /> Question</div>
                  </button>
                  {/* Toast anchored above Ask Your Question button */}
                  {activeToast === 'input:first' && (() => {
                    const config = getToastConfig(activeToast);
                    const message = Array.isArray(config) ? config[0]?.message : config?.message;
                    return (
                      <div className="button-toast" onClick={dismissToast}>
                        {message}
                        <div className="button-toast__arrow" />
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : isPreAnswerRecording ? (
              /* Pre-Answer Recording: Full width Start Recording button (no hint) */
              <div className="button-halves-container">
                <div className="half-panel full-width">
                  <button
                    className={`half-panel-button accept-panel start-recording-panel ${disabled ? 'disabled' : ''}`}
                    onClick={() => {
                      setActiveToast(null);
                      navigationBus.emit({ type: 'START_RECORDING' });
                    }}
                    disabled={disabled}
                  >
                    <img className="mic-icon" src="/VisualAssets/recordIcon.svg" alt="" />
                    <div className="button-text centered-single-line">Speak Your Answer</div>
                  </button>
                </div>
              </div>
            ) : isAskRecording ? (
              /* Ask Recording: Pulsing mic + audio-reactive sine wave */
              <div className="button-halves-container">
                <div className="half-panel full-width">
                  <div
                    className="half-panel-button visualizer-panel listening-panel"
                    onClick={isActuallyRecording ? onRecordStop : undefined}
                  >
                    <div className="mic-with-glow">
                      <div className="mic-soft-glow" />
                      <img className="mic-icon listening-mic" src="/VisualAssets/recordIcon.svg" alt="" />
                    </div>
                    <div className="gentle-waveform">
                      <WaveVisualizer
                        isRecording={isActuallyRecording}
                        waveColor="#4ade80"
                        lineWidth={4}
                        amplitude={80}
                      />
                    </div>
                    <div className="tap-to-stop-text">Tap to Stop</div>
                  </div>
                </div>
              </div>
            ) : isProcessing ? (
              /* Processing: Same layout as recording but with flashing processing indicator */
              <div className="button-halves-container">
                <div className="half-panel full-width">
                  <div className="half-panel-button visualizer-panel processing-panel">
                    <div className="processing-indicator">
                      <span className="processing-dot" />
                      <span className="processing-dot" />
                      <span className="processing-dot" />
                    </div>
                  </div>
                </div>
              </div>
            ) : isAnswerRecording ? (
              /* Answer Recording: Pulsing mic + audio-reactive sine wave (same style as Ask Recording) */
              <div className="button-halves-container">
                <div className="half-panel full-width">
                  <div
                    className="half-panel-button visualizer-panel listening-panel"
                    onClick={isActuallyRecording ? onRecordStop : undefined}
                  >
                    <div className="mic-with-glow">
                      <div className="mic-soft-glow" />
                      <img className="mic-icon listening-mic" src="/VisualAssets/recordIcon.svg" alt="" />
                    </div>
                    <div className="gentle-waveform">
                      <WaveVisualizer
                        isRecording={isActuallyRecording}
                        waveColor="#4ade80"
                        lineWidth={4}
                        amplitude={200}
                      />
                    </div>
                    <div className="tap-to-stop-text">Tap to Stop</div>
                  </div>
                </div>
              </div>
            ) : isAnswerProcessing ? (
              /* Answer Processing: Same layout as recording but with flashing processing indicator */
              <div className="button-halves-container">
                <div className="half-panel full-width">
                  <div className="half-panel-button visualizer-panel processing-panel">
                    <div className="processing-indicator">
                      <span className="processing-dot" />
                      <span className="processing-dot" />
                      <span className="processing-dot" />
                    </div>
                  </div>
                </div>
              </div>
            ) : isNoAudioRecorded || isNoMicrophone ? (
              /* No Audio Recorded / No Microphone State: Single full-width button (same as quest offer) */
              <div className="button-halves-container">
                <div className="half-panel full-width">
                  <button
                    className={`half-panel-button accept-panel ${disabled ? 'disabled' : ''}`}
                    onClick={handleRetryRecording}
                    disabled={disabled}
                  >
                    <div className="button-content">
                      <div className="button-text">Continue</div>
                      <div className="button-subtext">&nbsp;</div>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* Normal State: Ask and Answer as full-width half panels */
              <div className="button-halves-container">
                {/* Ask Panel - left half */}
                <div className="ask-button-wrapper half-panel">
                  <button
                    ref={askButtonRef}
                    className={`half-panel-button ask-panel ${isAskRecording ? 'recording-active' : ''} ${askButtonDisabled ? 'disabled' : ''} ${isAskRecording && !isActuallyRecording ? 'disabled' : ''}`}
                    onClick={isAskRecording ? (isActuallyRecording ? onRecordStop : undefined) : handleAskClick}
                    disabled={askButtonDisabled || (isAskRecording && !isActuallyRecording)}
                    title={isAskRecording ? (isActuallyRecording ? "Stop recording" : "Starting...") : "Ask a question"}
                  >
                    {isAskRecording ? (
                      <>
                        <div className="stop-square" />
                        <div className="button-text">Stop</div>
                      </>
                    ) : (
                      <div className="button-content">
                        <div className="button-text">I Don't Know</div>
                        <div className="button-subtext">Ask a question to get a clue.</div>
                      </div>
                    )}
                  </button>
                  {/* Toast anchored above Ask/Stop panel */}
                  {(activeToast === 'input:first' || activeToast === 'input:ask-recording') && (() => {
                    const config = getToastConfig(activeToast);
                    const message = Array.isArray(config) ? config[0]?.message : config?.message;
                    return (
                      <div className="button-toast" onClick={dismissToast}>
                        {message}
                        <div className="button-toast__arrow" />
                      </div>
                    );
                  })()}
                </div>

                {/* Answer Panel - right half */}
                <div className="answer-button-wrapper half-panel" ref={answerButtonRef}>
                  <button
                    className={`half-panel-button answer-panel ${isAnswerRecording ? 'recording-active' : ''} ${answerButtonDisabled ? 'disabled' : ''} ${(!unlockAnswerButton && questState !== 'complete') ? 'locked' : ''} ${isAnswerRecording && !isActuallyRecording ? 'disabled' : ''}`}
                    onClick={isAnswerRecording ? (isActuallyRecording ? onRecordStop : undefined) : ((!unlockAnswerButton && questState !== 'complete') ? undefined : handleAnswerClick)}
                    disabled={answerButtonDisabled || (isAnswerRecording && !isActuallyRecording)}
                    title={isAnswerRecording ? (isActuallyRecording ? "Stop recording" : "Starting...") : ((!unlockAnswerButton && questState !== 'complete') ? "Ask a question first to unlock" : "Answer the question")}
                  >
                    {isAnswerRecording ? (
                      <>
                        <div className="stop-square" />
                        <div className="button-text">Stop</div>
                      </>
                    ) : (
                      <>
                        {(!unlockAnswerButton && questState !== 'complete') && (
                          <img className="lock-image-overlay" src="/VisualAssets/lock.png" alt="Locked" />
                        )}
                        <div className="button-content">
                          <div className="button-text">I Know Now</div>
                          <div className="button-subtext">Make your guess.</div>
                        </div>
                      </>
                    )}
                  </button>
                  {/* Toast anchored above Answer panel */}
                  {(activeToast === 'input:post-ai' || activeToast === 'answer:recording') && (() => {
                    const config = getToastConfig(activeToast);
                    const message = Array.isArray(config) ? config[0]?.message : config?.message;
                    return (
                      <div className="button-toast" onClick={dismissToast}>
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
