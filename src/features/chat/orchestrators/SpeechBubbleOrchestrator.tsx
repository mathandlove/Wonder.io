/**
 * SpeechBubbleOrchestrator - Uses scroll-based transforms like BackgroundOrchestrator
 * but with delayed transitions to coordinate with character entrance animations.
 */
import React, { useMemo } from 'react';
import { CardboardBubble } from '@features/chat/components/CardboardBubble';
import { useNavigationStore, selectNavigationGraph, selectCurrentNodeId } from '@core/navigation/navigationStore';
import { AudioVisualizer } from '@core/recording/AudioVisualizer';
import { useRecording } from '@core/recording/RecordingContext';
import type { Scene, CharacterScene } from '@core/types/scene';
import type { Node } from '@core/navigation/types';

// Extended scene types that include commonly accessed properties
type SceneWithId = Scene & {
  sceneId?: string;
  flowSequence?: boolean;
  speaker?: "left" | "right";
  "left-character"?: string;
  "right-character"?: string;
};

export function SpeechBubbleOrchestrator() {

  // OPTIMIZED: Subscribe only to graph structure and currentId
  // This prevents re-renders when other graph properties change (history, lifecycle events, etc.)
  const navigationGraph = useNavigationStore(selectNavigationGraph);
  const currentNodeId = useNavigationStore(selectCurrentNodeId);
  const { state: recordingState } = useRecording();

  // Convert navigationGraph to array format for compatibility
  // Map graph.order to Node objects for iteration
  // OPTIMIZED: Only rebuild when order or byId changes, not on every graph mutation
  const navigationArray = useMemo(() => {
    return navigationGraph.order.map((nodeId, index) => {
      const node = navigationGraph.byId[nodeId];
      return {
        ...node,
        index,
      };
    });
  }, [navigationGraph.order, navigationGraph.byId]);

  // Calculate current navigation index from currentId
  // OPTIMIZED: Only recalculate when currentId or order changes
  const navigationIndex = useMemo(() => {
    if (!currentNodeId) return 0;
    return navigationGraph.order.indexOf(currentNodeId);
  }, [currentNodeId, navigationGraph.order]);

  // Use navigationIndex for scroll offset since we're working with navigationArray
  // NOT currentIndex which is based on visible scenes array
  const scrollOffset = navigationIndex;

  // Track scroll direction
  const prevScrollOffsetRef = React.useRef(scrollOffset);
  const scrollDirection = scrollOffset > prevScrollOffsetRef.current ? 'forward' : 'backward';

  // Update previous scroll offset for next render
  React.useEffect(() => {
    prevScrollOffsetRef.current = scrollOffset;
  }, [scrollOffset]);

  // Find character scenes to render bubbles for
  // IMPORTANT: Use navigationArray to get the actual scene objects (including dynamically created ones)
  // STRATEGY: Group navigation items by sceneId to prevent unwanted animations when states change
  // within the same scene (e.g., input-showInput → record-answer → answer-waiting)
  const speechBubbles = useMemo(() => {

    const bubbles: Array<{
      scene: CharacterScene;
      sceneIndex: number;
      firstSceneIndex: number; // The first index where this scene appeared (stable position)
      transform: string;
    }> = [];

    // Group navigation items by sceneId, tracking both first and latest appearances
    // firstIndex = where the scene first appeared (used for positioning)
    // latestIndex = the most recent state (used for getting current content)
    const sceneIdToNavItem = new Map<string, {
      navItem: Node & { index: number },
      firstIndex: number,
      latestIndex: number
    }>();

    // Build a map of sceneId -> array of indices for that scene
    const sceneIdToIndices = new Map<string, number[]>();

    // Process all navigation items
    for (let i = 0; i < navigationArray.length; i++) {
      const navItem = navigationArray[i];
      const scene = navItem.scene;

      if (scene?.type === 'character') {
        const sceneId = navItem.sceneId || `unknown-${i}`;

        // Track all indices for this scene
        if (!sceneIdToIndices.has(sceneId)) {
          sceneIdToIndices.set(sceneId, []);
        }
        sceneIdToIndices.get(sceneId)!.push(i);

        const existing = sceneIdToNavItem.get(sceneId);
        if (!existing) {
          // First time seeing this scene - track its first position
          sceneIdToNavItem.set(sceneId, {
            navItem,
            firstIndex: i,
            latestIndex: i
          });
        } else if (i > existing.latestIndex) {
          // Update to latest state, but keep the first position
          sceneIdToNavItem.set(sceneId, {
            navItem,
            firstIndex: existing.firstIndex, // Keep original position
            latestIndex: i
          });
        }
      }
    }

    // Custom transform function that understands same-scene ranges
    const translateForSameScene = (sceneId: string, firstIndex: number): string => {
      const indices = sceneIdToIndices.get(sceneId) || [firstIndex];
      const minIndex = Math.min(...indices);
      const maxIndex = Math.max(...indices);

      const tolerance = 0.1;

      // Check if scrollOffset is within this scene's range
      if (scrollOffset >= minIndex - tolerance && scrollOffset <= maxIndex + tolerance) {
        // We're within this scene (any of its states) - show the bubble
        return 'translateY(0)';
      } else if (scrollOffset < minIndex - tolerance) {
        // Bubble is waiting below (not reached yet)
        const distance = minIndex - scrollOffset;
        const translateY = Math.abs(distance - 1) < 0.02 ? 100 : distance * 100;
        return `translateY(${translateY}vh)`;
      } else {
        // Bubble has scrolled up and away
        return `translateY(${(maxIndex - scrollOffset) * 100}vh)`;
      }
    };

    // Now convert our scene-based map to bubbles array
    sceneIdToNavItem.forEach(({ navItem, firstIndex, latestIndex }, sceneId) => {
      // Use custom transform that understands scene ranges
      const transform = translateForSameScene(sceneId, firstIndex);
      bubbles.push({
        scene: navItem.scene as CharacterScene,
        sceneIndex: latestIndex, // For other logic that needs to know current index
        firstSceneIndex: firstIndex, // The stable position
        transform
      });
    });

    return bubbles;
  }, [navigationArray, scrollOffset]);

  // Waiting bubbles are now integrated into each CardboardBubble

  return (
    <div className="speech-bubble-layer" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 100,
      pointerEvents: 'none'
    }}>
      {/* Main speech bubbles */}
      {speechBubbles.map(({ scene, sceneIndex, transform }) => {
        const characterScene = scene as CharacterScene;
        const sceneId = (characterScene as SceneWithId).sceneId;

        // Get the navigation item to access phase
        const navItem = navigationArray[sceneIndex];
        const phase = navItem?.phase;

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

        // During recording, show transcript from scene or AudioVisualizer
        // During processing, ALWAYS show AudioVisualizer with "Processing..." (ignore any text)
        // The scene text might be default placeholder like "Test words", so we check scene for actual transcript
        const hasTranscript = characterScene.questionText && characterScene.questionText.trim();
        const hasFeedback = (characterScene as any).feedbackText && (characterScene as any).feedbackText.trim();

        // Priority: feedback > processing > recording > normal text
        // Feedback takes priority to show AI explanation for wrong answers
        const bubbleContent = hasFeedback
          ? (characterScene as any).feedbackText // Show AI feedback if available
          : isProcessing
          ? null // Always null during processing - will show AudioVisualizer with "Processing..."
          : isRecording
          ? (hasTranscript ? characterScene.questionText : null) // During recording: show transcript or AudioVisualizer
          : characterScene.text; // Normal phase: show scene text

        // Show waiting bubble based solely on phase
        // When phase is 'ai-waiting', show the animated ellipses bubble
        const shouldShowWaitingBubble = phase === 'ai-waiting';

        // Skip rendering if no content (unless recording/processing - show AudioVisualizer)
        if (!bubbleContent && !(isRecording && !hasTranscript) && !isProcessing) return null;

        // Detect if bubble is entering (visible)
        const isVisible = transform === 'translateY(0)';
        const isEntering = isVisible;

        // Animation and transition logic
        const leftCharacter = characterScene["left-character"];
        const rightCharacter = characterScene["right-character"];

        // Check previous scene in navigationArray to see if characters changed (indicating entrance)
        const prevNavItem = sceneIndex > 0 ? navigationArray[sceneIndex - 1] : null;
        const prevScene = prevNavItem?.scene;
        // Treat missing character properties as 'NOCHARACTER' to match CharacterOrchestrator behavior
        const prevLeftChar = prevScene && 'left-character' in prevScene ? prevScene["left-character"] : 'NOCHARACTER';
        const prevRightChar = prevScene && 'right-character' in prevScene ? prevScene["right-character"] : 'NOCHARACTER';

        const leftCharEntering = leftCharacter && leftCharacter !== prevLeftChar;
        const rightCharEntering = rightCharacter && rightCharacter !== prevRightChar;
        const hasEnteringAnimation = leftCharEntering || rightCharEntering;

        // Check next scene in navigationArray to see if characters will change (indicating swap for backwards scroll)
        // Note: Currently not used, but kept for future backward scroll optimizations
        // const nextNavItem = sceneIndex < navigationArray.length - 1 ? navigationArray[sceneIndex + 1] : null;
        // const nextSceneForSwap = nextNavItem?.scene;
        // const nextLeftChar = nextSceneForSwap && 'left-character' in nextSceneForSwap ? nextSceneForSwap["left-character"] : 'NOCHARACTER';
        // const nextRightChar = nextSceneForSwap && 'right-character' in nextSceneForSwap ? nextSceneForSwap["right-character"] : 'NOCHARACTER';
        // const leftCharSwapping = leftCharacter && (leftCharacter !== nextLeftChar || nextLeftChar === 'NOCHARACTER');
        // const rightCharSwapping = rightCharacter && (rightCharacter !== nextRightChar || nextRightChar === 'NOCHARACTER');
        // const hasSwapAnimation = leftCharSwapping || rightCharSwapping;

        let transition;
        if (isEntering) {
          // Only delay for FORWARD scrolling with character entrance animations
          // Never delay for backward scrolling - kids will re-read the line
          if (hasEnteringAnimation && scrollDirection === 'forward') {
            transition = 'transform 0.4s ease-out 1.6s'; // Forward + character entrance: delay
          } else {
            transition = 'transform 0.4s ease-out 0s'; // No delay for backward or no entrance animation
          }
        } else {
          transition = 'transform 0.3s ease-out 0s'; // Default/waiting
        }

        // Simple flexbox positioning based on speaker side
        const justifyContent = side === 'left' ? 'flex-start' :
                             side === 'right' ? 'flex-end' :
                             'center';

        const bubbleStyle = {
          position: 'absolute' as const,
          top: '50vh',
          left: 'var(--panel-left-width)', // Start after left panel
          right: 'var(--panel-right-width)', // End before right panel
          width: 'auto', // Let it fill available space between panels
          transform: `translateY(-50%) ${transform}`,
          display: 'flex',
          justifyContent,
          alignItems: 'center',
          transition,
          pointerEvents: 'auto' as const,
        };

        return (
          <div
            key={`bubble-${sceneId || `fallback-${sceneIndex}`}`}
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
                <AudioVisualizer audioLevel={recordingState.audioLevel} className="bubble-variant" mode="listening" />
              ) : isProcessing ? (
                <AudioVisualizer audioLevel={0} className="bubble-variant" mode="processing" />
              ) : null}
            </CardboardBubble>
          </div>
        );
      })}

      {/* Waiting bubbles are now integrated into CardboardBubble components */}
    </div>
  );
}