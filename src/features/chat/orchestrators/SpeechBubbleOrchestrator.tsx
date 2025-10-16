/**
 * SpeechBubbleOrchestrator - Uses scroll-based transforms like BackgroundOrchestrator
 * but with delayed transitions to coordinate with character entrance animations.
 */
import React, { useMemo } from 'react';
import { CardboardBubble } from '@features/chat/components/CardboardBubble';
import { useSceneStates } from '@core/scenes/SceneStates';
import { useSceneManager } from '@core/scenes/SceneManager';
import type { Scene, CharacterScene } from '@core/types/scene';
import type { NavigationItem } from '@core/navigation/types';

// Extended scene types that include commonly accessed properties
type SceneWithId = Scene & {
  sceneId?: string;
  flowSequence?: boolean;
  speaker?: "left" | "right";
  "left-character"?: string;
  "right-character"?: string;
};

interface SpeechBubbleOrchestratorProps {
  scenes: Scene[];
  currentIndex?: number;
}

// Speech bubble positioning logic - each bubble only visible for its own scene
function translateForSpeechBubble(sceneIndex: number, scrollOffset: number): string {
  const tolerance = 0.1;

  if (scrollOffset < sceneIndex - tolerance) {
    // Bubble is waiting below (not reached yet)
    const distance = sceneIndex - scrollOffset;
    const translateY = Math.abs(distance - 1) < 0.02 ? 100 : distance * 100;
    return `translateY(${translateY}vh)`;
  } else if (scrollOffset > sceneIndex + tolerance) {
    // Bubble has scrolled up and away (exits immediately after its scene)
    return `translateY(${(sceneIndex - scrollOffset) * 100}vh)`;
  } else {
    // Bubble is visible only during its own scene
    return 'translateY(0)';
  }
}

export function SpeechBubbleOrchestrator({ scenes, currentIndex = 0 }: SpeechBubbleOrchestratorProps) {
  // Get scene states for dialogue state management
  const sceneStates = useSceneStates();

  // IMPORTANT: Get navigationArray to access modified scenes (like recording scenes)
  // navigationArray contains ALL scene items including dynamically created ones
  const sceneManager = useSceneManager();
  const { navigationArray, navigationIndex } = sceneManager;

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
      navItem: NavigationItem,
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
      {speechBubbles.map(({ scene, sceneIndex, firstSceneIndex, transform }) => {
        const characterScene = scene as CharacterScene;
        const sceneId = (characterScene as SceneWithId).sceneId;

        // Get the navigation item to access scene state (more reliable than sceneStates context)
        const navItem = navigationArray[sceneIndex];
        const sceneState = navItem?.sceneState;
        const dialogueState = sceneState?.type === 'dialogue' ? sceneState.state : null;

        // Determine speaker and side
        const speakerLabel = characterScene.speaker === "left"
          ? characterScene["left-character"] || "Left"
          : characterScene.speaker === "right"
          ? characterScene["right-character"] || "Right"
          : "Narrator";

        const side = characterScene.speaker === 'left' ? 'left' :
               characterScene.speaker === 'right' ? 'right' : 'center';

        // Show "Listening..." placeholder when in input-recording state
        const isRecording = dialogueState === 'input-recording';

        // During recording, show transcript from scene state or default to "Listening..."
        // The scene text might be default placeholder like "Test words", so we check scene state for actual transcript
        const hasTranscript = sceneState?.type === 'dialogue' && sceneState.questionText && sceneState.questionText.trim();
        const bubbleContent = isRecording
          ? (hasTranscript ? sceneState.questionText : 'Listening...')
          : characterScene.text;

        // Show waiting bubble based solely on dialogue state
        // When state is 'ai-waiting', show the animated ellipses bubble
        const shouldShowWaitingBubble = dialogueState === 'ai-waiting';

        // Skip rendering if no content
        if (!bubbleContent) return null;

        // Detect if bubble is entering (visible)
        const isVisible = transform === 'translateY(0)';
        const isEntering = isVisible;

        // Animation and transition logic
        const leftCharacter = characterScene["left-character"];
        const rightCharacter = characterScene["right-character"];

        // Check previous scene in navigationArray to see if characters changed (indicating entrance)
        const prevNavItem = sceneIndex > 0 ? navigationArray[sceneIndex - 1] : null;
        const prevScene = prevNavItem?.scene;
        const prevLeftChar = prevScene && 'left-character' in prevScene ? prevScene["left-character"] : null;
        const prevRightChar = prevScene && 'right-character' in prevScene ? prevScene["right-character"] : null;

        const leftCharEntering = leftCharacter && leftCharacter !== prevLeftChar;
        const rightCharEntering = rightCharacter && rightCharacter !== prevRightChar;
        const hasEnteringAnimation = leftCharEntering || rightCharEntering;

        // Check next scene in navigationArray to see if characters will change (indicating swap for backwards scroll)
        const nextNavItem = sceneIndex < navigationArray.length - 1 ? navigationArray[sceneIndex + 1] : null;
        const nextSceneForSwap = nextNavItem?.scene;
        const nextLeftChar = nextSceneForSwap && 'left-character' in nextSceneForSwap ? nextSceneForSwap["left-character"] : null;
        const nextRightChar = nextSceneForSwap && 'right-character' in nextSceneForSwap ? nextSceneForSwap["right-character"] : null;

        const leftCharSwapping = leftCharacter && (leftCharacter !== nextLeftChar || nextLeftChar === 'NOCHARACTER');
        const rightCharSwapping = rightCharacter && (rightCharacter !== nextRightChar || nextRightChar === 'NOCHARACTER');
        const hasSwapAnimation = leftCharSwapping || rightCharSwapping;

        let transition;
        if (isEntering) {
          if ((hasEnteringAnimation && scrollDirection === 'forward') || (scrollDirection === 'backward' && hasSwapAnimation)) {
            transition = 'transform 0.4s ease-out 1.6s'; // Forward + character entrance: delay
          } else {
            transition = 'transform 0.4s ease-out 0s'; // Forward + no character entrance: immediate
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
              isPlaceholder={isRecording && !hasTranscript}
            >
              {bubbleContent}
            </CardboardBubble>
          </div>
        );
      })}

      {/* Waiting bubbles are now integrated into CardboardBubble components */}
    </div>
  );
}