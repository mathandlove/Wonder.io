/**
 * SpeechBubbleOrchestrator - Uses direction-based animations like BackgroundOrchestrator
 * Animates bubbles in/out based on navigation direction (forward/backward) instead of indices
 * This makes it immune to node deletions and provides cleaner animations
 */
import { useMemo, useState, useEffect } from 'react';
import { CardboardBubble } from '@features/chat/components/CardboardBubble';
import { useNavigationStore, selectNavigationGraph, selectCurrentNodeId, selectLastFrozenNode } from '@core/navigation/navigationStore';
import { AudioVisualizer } from '@core/recording/AudioVisualizer';
import { useAudioLevel } from '@core/recording/RecordingOrchestrator';
import { useIsMobile } from '@core/uiLayout/useIsMobile';
import type { CharacterScene } from '@core/types/scene';
import type { Node } from '@core/navigation/navigationGraphTypes';

// Bubble state for tracking previous/current bubbles
interface BubbleState {
  nodeId: string; // Use node ID as stable identifier
  scene: CharacterScene;
  navItem: Node;
  leftCharacter?: string | null;
  rightCharacter?: string | null;
  previousLeftCharacter?: string | null; // From frozen snapshot
  previousRightCharacter?: string | null; // From frozen snapshot
}

export function SpeechBubbleOrchestrator() {
  // Get real-time audio level for visualization
  const audioLevel = useAudioLevel();

  // Mobile detection for positioning
  const isMobile = useIsMobile();

  // OPTIMIZED: Subscribe only to graph structure, currentId, and lastFrozenNode
  const navigationGraph = useNavigationStore(selectNavigationGraph);
  const currentNodeId = useNavigationStore(selectCurrentNodeId);
  const lastFrozenNode = useNavigationStore(selectLastFrozenNode);

  // Get navigation direction from history
  const navigationDirection = useMemo(() => {
    const history = navigationGraph.navigationHistory;
    if (!history || history.length === 0) return 'initial';
    return history[history.length - 1]?.trigger || 'forward';
  }, [navigationGraph.navigationHistory]);

  // Get current bubble state
  // Uses lastFrozenNode (like CharacterOrchestrator) to detect character entrances
  const currentBubble = useMemo((): BubbleState | null => {
    if (!currentNodeId) return null;

    const navItem = navigationGraph.byId[currentNodeId];
    if (!navItem || navItem.scene?.type !== 'character') return null;

    const scene = navItem.scene as CharacterScene;

    // Helper to extract character from a node (matching CharacterOrchestrator pattern)
    const getChar = (node: Node | null, side: 'left' | 'right') => {
      if (!node) return 'NOCHARACTER';
      const key = side === 'left' ? 'left-character' : 'right-character';
      const nodeScene = node.scene as any;
      return nodeScene?.[key] || 'NOCHARACTER';
    };

    return {
      nodeId: currentNodeId,
      scene,
      navItem,
      leftCharacter: scene["left-character"],
      rightCharacter: scene["right-character"],
      previousLeftCharacter: getChar(lastFrozenNode, 'left'), // Use frozen snapshot
      previousRightCharacter: getChar(lastFrozenNode, 'right'), // Use frozen snapshot
    };
  }, [currentNodeId, navigationGraph.byId, lastFrozenNode]);

  // Track current bubble and previous bubble for slide-in/out animations
  // Note: 'previous' is used for rendering exit animations, NOT for character comparison
  // Character entrance detection uses bubbleState.previousLeftCharacter from frozen snapshot
  const [bubbles, setBubbles] = useState<{
    previous: BubbleState | null; // For rendering the exit animation
    current: BubbleState | null;  // For rendering the current bubble
    direction: 'forward' | 'backward';
  }>({
    previous: null,
    current: currentBubble,
    direction: 'forward'
  });

  // Update bubbles when currentBubble changes
  useEffect(() => {
    if (!currentBubble) {
      // If no character scene, clear current but keep previous for exit animation
      setBubbles(prev => ({ ...prev, current: null }));
      return;
    }

    setBubbles(prev => {
      if (currentBubble.nodeId !== prev.current?.nodeId) {
        // New scene - store previous for exit animation, update current for entrance
        const isBackward = navigationDirection === 'backward' || navigationDirection === 'force-backward';

        return {
          previous: prev.current, // Store for slide-out animation
          current: currentBubble,
          direction: isBackward ? 'backward' : 'forward'
        };
      } else {
        // Same node - just update content (phase changes don't need animation)
        return {
          ...prev,
          current: currentBubble
        };
      }
    });
  }, [currentBubble, navigationDirection]);

  // Helper function to render a bubble
  const renderBubble = (
    bubbleState: BubbleState,
    key: string,
    animationStyle: string | null,
    isSlideIn: boolean // true for slide-in animations, false for slide-out
  ) => {
    const characterScene = bubbleState.scene;
    const navItem = bubbleState.navItem;
    const phase = navItem.phase;

    // Determine speaker and side
    const speakerLabel = characterScene.speaker === "left"
      ? characterScene["left-character"] || "Left"
      : characterScene.speaker === "right"
      ? characterScene["right-character"] || "Right"
      : "Narrator";

    const side = characterScene.speaker === 'left' ? 'left' :
           characterScene.speaker === 'right' ? 'right' : 'center';

    // Show AudioVisualizer placeholder when in input-recording phase
    const isRecording = phase === 'input-recording';
    const isProcessing = phase === 'input-processing';
    const isRecordingSubmit = phase === 'recording-submit';
    const isAnswerSubmit = phase === 'answer-submit';
    const isAnswerWaiting = phase === 'answer-waiting';
    const isAnswerRight = phase === 'answer-right';
    const isAnswerWrong = phase === 'answer-wrong';
    const isSuccessDance = phase === 'success-dance';
    const isFailDance = phase === 'fail-dance';

    // During recording, show transcript from scene or AudioVisualizer
    // During processing, ALWAYS show AudioVisualizer with "Processing..." (ignore any text)
    // During recording-submit, show the transcript for user review
    const hasTranscript = characterScene.questionText && characterScene.questionText.trim();
    const hasFeedback = (characterScene as any).feedbackText && (characterScene as any).feedbackText.trim();

    // Priority: feedback > processing > recording-submit > recording > normal text
    const bubbleContent = hasFeedback
      ? (characterScene as any).feedbackText // Show AI feedback if available
      : isProcessing
      ? null // Always null during processing - will show AudioVisualizer with "Processing..."
      : isRecordingSubmit
      ? (hasTranscript ? characterScene.questionText : null) // During review: show transcript
      : isRecording
      ? (hasTranscript ? characterScene.questionText : null) // During recording: show transcript or AudioVisualizer
      : characterScene.text; // Normal phase: show scene text

    // Show waiting bubble based solely on phase
    const shouldShowWaitingBubble = phase === 'ai-waiting';

    // Hide bubble completely during ask recording states (now shown in RecordPanel input box instead)
    // Also hide during recording-submit, answer-submit, answer feedback, and dance animations
    if (isRecording || isProcessing || isRecordingSubmit || isAnswerSubmit || isAnswerWaiting || isAnswerRight || isAnswerWrong || isSuccessDance || isFailDance) return null;

    // Skip rendering if no content (unless recording/processing - show AudioVisualizer or transcript)
    if (!bubbleContent && !(isRecording && !hasTranscript) && !isProcessing) return null;

    // Check for character entrance animation (only matters for slide-in)
    // Use frozen snapshot (like CharacterOrchestrator) for accurate entrance detection
    // This correctly handles transitions through non-character scenes (successDance, etc.)
    const leftCharacter = bubbleState.leftCharacter;
    const rightCharacter = bubbleState.rightCharacter;

    // Get characters from frozen snapshot (the state BEFORE this transition started)
    const prevLeftChar = bubbleState.previousLeftCharacter || 'NOCHARACTER';
    const prevRightChar = bubbleState.previousRightCharacter || 'NOCHARACTER';

    const leftCharEntering = leftCharacter && leftCharacter !== prevLeftChar;
    const rightCharEntering = rightCharacter && rightCharacter !== prevRightChar;
    const hasEnteringAnimation = leftCharEntering || rightCharEntering;

    // Determine animation delay
    // - Slide-OUT animations: ALWAYS 0s (immediate exit)
    // - Slide-IN animations with character entrance: 1.6s (both forward AND backward)
    // - Slide-IN animations without character entrance: 0s
    let animationDelay = '0s';
    if (isSlideIn && animationStyle && hasEnteringAnimation) {
      // Delay for slide-in when characters are entering (any direction)
      // Text must wait for character entrance animation to complete
      // This applies to both forward and backward scrolling with character changes
      animationDelay = '1.6s';
    }

    // Simple flexbox positioning based on speaker side
    const justifyContent = side === 'left' ? 'flex-start' :
                         side === 'right' ? 'flex-end' :
                         'center';

    // Bubble wrapper - positioned within the safe area, uses flexbox for horizontal alignment
    // Parent flex column with justifyContent: 'center' handles vertical centering
    // Slide-out bubbles use absolute positioning so they don't affect current bubble's centering
    const bubbleStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent, // Horizontal alignment: flex-start (left), flex-end (right), center
      width: '100%',
      animation: animationStyle ? `${animationStyle} 0.6s ease-out ${animationDelay} both` : 'none',
      // Note: 'both' = backwards + forwards
      // - 'backwards' applies the "from" keyframe state during the delay (keeps bubble off-screen)
      // - 'forwards' keeps the "to" keyframe state after animation completes (keeps bubble on-screen)
      pointerEvents: 'auto',
      // Slide-out (previous) bubbles: absolute position so they don't affect current bubble centering
      // Slide-in (current) bubbles: relative position to participate in flex centering
      ...(isSlideIn ? {} : {
        position: 'absolute' as const,
        top: '50%',
        left: 0,
        transform: 'translateY(-50%)', // Start centered, animation will move it
      }),
    };

    return (
      <div
        key={key}
        style={bubbleStyle}
      >
        <CardboardBubble
          side={side}
          speakerLabel={speakerLabel}
          showWaitingBubble={shouldShowWaitingBubble}
          isPlaceholder={(isRecording && !hasTranscript) || isProcessing}
        >
          {bubbleContent ? (
            bubbleContent
          ) : (isRecording && !hasTranscript) ? (
            <AudioVisualizer audioLevel={audioLevel} className="bubble-variant" mode="listening" />
          ) : isProcessing ? (
            <AudioVisualizer audioLevel={0} className="bubble-variant" mode="processing" />
          ) : null}
        </CardboardBubble>
      </div>
    );
  };

  // If no current bubble, don't render anything
  if (!bubbles.current) {
    return null;
  }

  // RecordPanel height estimate + extra padding for safe area
  // This creates a safe area above the RecordPanel for speech bubbles
  // Desktop: Panel is ~150px visible (32px hidden below screen in bottom-anchored state)
  // Add some padding to prevent bubble from touching the panel
  const recordPanelHeight = isMobile ? 100 : 180;

  return (
    <div className="speech-bubble-layer" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 100,
      pointerEvents: 'none',
      overflowX: 'hidden'
    }}>
      {/* Speech bubble safe area - from top to above RecordPanel */}
      <div className="speech-bubble-area" style={{
        position: 'absolute',
        top: 0,
        left: 'var(--panel-left-width)',
        right: 'var(--panel-right-width)',
        height: `calc(100vh - ${recordPanelHeight}px)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center', // Centers bubble vertically in safe area
        alignItems: 'stretch', // Stretch horizontally so bubble can align left/right/center
        pointerEvents: 'none',
      }}>
        {/* Previous bubble - slides out in opposite direction */}
        {bubbles.previous && bubbles.previous.nodeId !== bubbles.current.nodeId && (
          renderBubble(
            bubbles.previous,
            `prev-${bubbles.previous.nodeId}`,
            bubbles.direction === 'forward'
              ? 'slideOutToTop'      // Forward: old slides up
              : 'slideOutToBottom',  // Backward: old slides down
            false // isSlideIn = false (this is a slide-out, no delay)
          )
        )}

        {/* Current bubble - slides in from opposite direction */}
        {renderBubble(
          bubbles.current,
          `current-${bubbles.current.nodeId}`,
          // Animate unless it's the same node (phase change within same scene)
          !bubbles.previous || bubbles.previous.nodeId !== bubbles.current.nodeId
            ? (bubbles.direction === 'forward' ? 'slideInFromBottom' : 'slideInFromTop')
            : null,
          true // isSlideIn = true (this is a slide-in, may have delay)
        )}
      </div>

      <style>{`
        /* Slide animations - bubble is centered in safe area via flexbox */
        /* Forward navigation: new slides up from bottom, old slides up to top */
        @keyframes slideInFromBottom {
          from {
            transform: translateY(100vh);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes slideOutToTop {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-100vh);
          }
        }

        /* Backward navigation: new slides down from top, old slides down to bottom */
        @keyframes slideInFromTop {
          from {
            transform: translateY(-100vh);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes slideOutToBottom {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(100vh);
          }
        }
      `}</style>
    </div>
  );
}
