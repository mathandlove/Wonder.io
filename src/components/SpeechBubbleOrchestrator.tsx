/**
 * SpeechBubbleOrchestrator - Uses scroll-based transforms like BackgroundOrchestrator
 * but with delayed transitions to coordinate with character entrance animations.
 */
import React, { useMemo } from 'react';
import { useScrollOffset } from '../hooks/useScrollOffset';
import { CardboardBubble } from './CardboardBubble';
import { useDialogue } from '../dialogue/DialogueContext';
import type { Scene, CharacterScene, InteractiveBubbleScene } from '../types/scene';

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

export function SpeechBubbleOrchestrator({ scenes, currentIndex }: SpeechBubbleOrchestratorProps) {
  // Use passed currentIndex or fall back to scroll offset
  const dummyRef = React.useRef<HTMLDivElement>(null);
  const { offset: scrollOffsetFallback } = useScrollOffset(dummyRef);
  const scrollOffset = currentIndex !== undefined ? currentIndex : scrollOffsetFallback;

  // Get dialogue context for interactive scenes
  const { getMessagesForScene } = useDialogue();

  // Track scroll direction
  const prevScrollOffsetRef = React.useRef(scrollOffset);
  const scrollDirection = scrollOffset > prevScrollOffsetRef.current ? 'forward' : 'backward';

  // Update previous scroll offset for next render
  React.useEffect(() => {
    prevScrollOffsetRef.current = scrollOffset;
  }, [scrollOffset]);

  // Find character scenes AND interactive-bubble scenes to render bubbles for
  const speechBubbles = useMemo(() => {

    const bubbles: Array<{
      scene: CharacterScene | InteractiveBubbleScene;
      sceneIndex: number;
      transform: string;
      type: 'character' | 'interactive-bubble';
    }> = [];

    scenes.forEach((scene, index) => {
      if (scene?.type === 'character') {
        const transform = translateForSpeechBubble(index, scrollOffset);
        bubbles.push({
          scene: scene as CharacterScene,
          sceneIndex: index,
          transform,
          type: 'character'
        });
      } else if (scene?.type === 'interactive-bubble') {
        const transform = translateForSpeechBubble(index, scrollOffset);
        bubbles.push({
          scene: scene as InteractiveBubbleScene,
          sceneIndex: index,
          transform,
          type: 'interactive-bubble'
        });
      }
    });

    return bubbles;
  }, [scenes, scrollOffset]);

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
      {speechBubbles.map(({ scene, sceneIndex, transform, type }) => {
        // Handle different bubble content based on scene type
        let bubbleContent: React.ReactNode = null;
        let speakerLabel = "";
        let side: 'left' | 'right' | 'center' = 'center';
        let shouldShowWaitingBubble = false;

        if (type === 'character') {
          const characterScene = scene as CharacterScene;
          speakerLabel = characterScene.speaker === "left"
            ? characterScene["left-character"] || "Left"
            : characterScene.speaker === "right"
            ? characterScene["right-character"] || "Right"
            : "Narrator";

          side = characterScene.speaker === 'left' ? 'left' :
                 characterScene.speaker === 'right' ? 'right' : 'center';

          bubbleContent = characterScene.text;

          // Determine if this scene should show waiting bubble (existing logic)
          const isPageFactoryScene = !characterScene.flowSequence && characterScene.type === "character";
          const isUserScene = characterScene.speaker === "left";
          const hasSceneId = !!(characterScene as any).sceneId;
          const nextSceneForWaiting = scenes[sceneIndex + 1];
          const nextSceneIsAI = nextSceneForWaiting &&
                               nextSceneForWaiting.type === "character" &&
                               !(nextSceneForWaiting as any).flowSequence &&
                               (nextSceneForWaiting as any).speaker === "right";

          shouldShowWaitingBubble = isPageFactoryScene && isUserScene && hasSceneId && !nextSceneIsAI;

        } else if (type === 'interactive-bubble') {
          const interactiveScene = scene as InteractiveBubbleScene;
          const messages = getMessagesForScene(interactiveScene.sceneId || '');

          // Find the most relevant message to display
          const recordingMessage = messages.find(m => m.status === 'recording' || m.status === 'pending');
          const latestMessage = messages[messages.length - 1];
          const displayMessage = recordingMessage || latestMessage;

          if (displayMessage) {
            // Set side based on message sender
            side = displayMessage.sender === 'player' ? 'left' : 'right';
            speakerLabel = displayMessage.sender === 'player'
              ? interactiveScene["left-character"] || "Player"
              : interactiveScene["right-character"] || "AI";

            // Generate content based on message status
            if (displayMessage.status === 'recording' && !displayMessage.text) {
              bubbleContent = "🎤 Listening...";
            } else if (displayMessage.isInterim && displayMessage.text) {
              bubbleContent = `${displayMessage.text}...`;
            } else if (displayMessage.text) {
              bubbleContent = displayMessage.text;
            } else if (displayMessage.status === 'pending') {
              bubbleContent = "Sending...";
            } else if (displayMessage.status === 'error') {
              bubbleContent = "Failed to send";
            }

            // For interactive scenes, always show waiting bubble, but control visibility
            const isUserMessage = displayMessage.sender === 'player';
            const hasAIResponse = messages.some(m => m.sender === 'npc' && m.ts > displayMessage.ts);
            shouldShowWaitingBubble = isUserMessage && displayMessage.status === 'sent' && !hasAIResponse;
          } else {
            // No messages yet - show placeholder
            side = 'left';
            speakerLabel = interactiveScene["left-character"] || "Player";
            bubbleContent = "🎤 Press and hold to record";
            // No waiting bubble for placeholder state
            shouldShowWaitingBubble = false;
          }
        }

        // Skip rendering if no content
        if (!bubbleContent) return null;

        // Detect if bubble is entering (visible)
        const isVisible = transform === 'translateY(0)';
        const isEntering = isVisible;

        // Animation and transition logic (simplified for interactive scenes)
        let transition;
        if (type === 'character') {
          const characterScene = scene as CharacterScene;
          // Detect if this scene has character entrance animation
          const leftCharacter = characterScene["left-character"];
          const rightCharacter = characterScene["right-character"];

          // Check previous scene to see if characters changed (indicating entrance)
          const prevScene = sceneIndex > 0 ? scenes[sceneIndex - 1] : null;
          const prevLeftChar = prevScene && 'left-character' in prevScene ? prevScene["left-character"] : null;
          const prevRightChar = prevScene && 'right-character' in prevScene ? prevScene["right-character"] : null;

          const leftCharEntering = leftCharacter && leftCharacter !== prevLeftChar;
          const rightCharEntering = rightCharacter && rightCharacter !== prevRightChar;
          const hasEnteringAnimation = leftCharEntering || rightCharEntering;

          // Check next scene to see if characters will change (indicating swap for backwards scroll)
          const nextSceneForSwap = sceneIndex < scenes.length - 1 ? scenes[sceneIndex + 1] : null;
          const nextLeftChar = nextSceneForSwap && 'left-character' in nextSceneForSwap ? nextSceneForSwap["left-character"] : null;
          const nextRightChar = nextSceneForSwap && 'right-character' in nextSceneForSwap ? nextSceneForSwap["right-character"] : null;

          const leftCharSwapping = leftCharacter && (leftCharacter !== nextLeftChar || nextLeftChar === 'NOCHARACTER');
          const rightCharSwapping = rightCharacter && (rightCharacter !== nextRightChar || nextRightChar === 'NOCHARACTER');
          const hasSwapAnimation = leftCharSwapping || rightCharSwapping;

          if (isEntering) {
            if ((hasEnteringAnimation && scrollDirection === 'forward') || (scrollDirection === 'backward' && hasSwapAnimation)) {
              transition = 'transform 0.4s ease-out 1.6s'; // Forward + character entrance: delay
            } else {
              transition = 'transform 0.4s ease-out 0s'; // Forward + no character entrance: immediate
            }
          } else {
            transition = 'transform 0.3s ease-out 0s'; // Default/waiting
          }
        } else {
          // Interactive scenes use simpler transitions
          transition = 'transform 0.4s ease-out 0s';
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
            key={`bubble-${sceneIndex}-${type}`}
            style={bubbleStyle}
          >
            <CardboardBubble
              side={side}
              speakerLabel={speakerLabel}
              showWaitingBubble={shouldShowWaitingBubble}
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