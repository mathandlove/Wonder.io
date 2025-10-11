/**
 * SpeechBubbleOrchestrator - Uses scroll-based transforms like BackgroundOrchestrator
 * but with delayed transitions to coordinate with character entrance animations.
 */
import React, { useMemo } from 'react';
import { useScrollOffset } from '@shared/hooks/useScrollOffset';
import { CardboardBubble } from '@features/chat/components/CardboardBubble';
import { useDialogue } from '../context/useChatDialogue';
import { useDialogue as useRecordingDialogue } from '@core/dialogue/DialogueContext';
import { useRecording } from '@core/recording/RecordingContext';
import type { Scene, CharacterScene, InteractiveBubbleScene, InputScene } from '@core/types/scene';
import type { Message } from '@core/dialogue/types';

// Extended scene types that include commonly accessed properties
type SceneWithId = Scene & {
  sceneId?: string;
  flowSequence?: boolean;
  speaker?: "left" | "right";
  "left-character"?: string;
  "right-character"?: string;
};

// Extended message type for dialogue system - the actual Message type already includes what we need
type ExtendedMessage = Message & {
  timestamp?: number; // For compatibility with chat system timestamps
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

export function SpeechBubbleOrchestrator({ scenes, currentIndex }: SpeechBubbleOrchestratorProps) {
  // Use passed currentIndex or fall back to scroll offset
  const dummyRef = React.useRef<HTMLDivElement>(null);
  const { offset: scrollOffsetFallback } = useScrollOffset(dummyRef);
  const scrollOffset = currentIndex !== undefined ? currentIndex : scrollOffsetFallback;

  // Get dialogue context for interactive scenes
  const { messages: globalMessages } = useDialogue();
  const { getMessagesForScene } = useRecordingDialogue();
  // Get recording context for continuous recording
  const { getDisplayText, isRecording } = useRecording();

  // Track scroll direction
  const prevScrollOffsetRef = React.useRef(scrollOffset);
  const scrollDirection = scrollOffset > prevScrollOffsetRef.current ? 'forward' : 'backward';

  // Update previous scroll offset for next render
  React.useEffect(() => {
    prevScrollOffsetRef.current = scrollOffset;
  }, [scrollOffset]);

  // Find character scenes AND interactive scenes (input/interactive-bubble) to render bubbles for
  const speechBubbles = useMemo(() => {

    const bubbles: Array<{
      scene: CharacterScene | InteractiveBubbleScene | InputScene;
      sceneIndex: number;
      transform: string;
      type: 'character' | 'interactive-bubble' | 'input';
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
      } else if (scene?.type === 'input') {
        // Handle input scenes like interactive-bubble scenes
        const transform = translateForSpeechBubble(index, scrollOffset);
        bubbles.push({
          scene: scene as InputScene,
          sceneIndex: index,
          transform,
          type: 'input'
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
          const hasSceneId = !!(characterScene as SceneWithId).sceneId;
          const nextSceneForWaiting = scenes[sceneIndex + 1];
          const nextSceneIsAI = nextSceneForWaiting &&
                               nextSceneForWaiting.type === "character" &&
                               !(nextSceneForWaiting as SceneWithId).flowSequence &&
                               (nextSceneForWaiting as SceneWithId).speaker === "right";

          shouldShowWaitingBubble = isPageFactoryScene && isUserScene && hasSceneId && !nextSceneIsAI;

        } else if (type === 'interactive-bubble' || type === 'input') {
          // Handle both interactive-bubble and input scenes the same way
          const sceneId = (scene as SceneWithId).sceneId || '';

          // PRIORITY: Use global recording state when actively recording
          if (isRecording()) {
            const globalText = getDisplayText();
            console.log('🎯 USING GLOBAL RECORDING STATE (story-map):', {
              sceneIndex,
              globalText,
              displayingText: globalText || "🎤 Listening..."
            });
            side = 'left';
            speakerLabel = (scene as SceneWithId)["left-character"] || "Player";
            bubbleContent = globalText || "🎤 Listening...";
            shouldShowWaitingBubble = false;
          } else {
            // Fall back to dialogue messages when not actively recording
            const recordingMessages = getMessagesForScene(sceneId);
            const messages = recordingMessages.length > 0 ? recordingMessages : globalMessages;
            const latestMessage = messages[messages.length - 1];

            console.log('💬 USING DIALOGUE MESSAGES (recording stopped):', {
              sceneIndex,
              sceneId,
              messageCount: messages.length,
              latestMessage: latestMessage?.text || 'none'
            });

            if (latestMessage) {
              // Set side based on message sender
              side = latestMessage.sender === 'player' ? 'left' : 'right';
              speakerLabel = latestMessage.sender === 'player'
                ? (scene as SceneWithId)["left-character"] || "Player"
                : (scene as SceneWithId)["right-character"] || "AI";

              // Generate content based on message status
              const extMessage = latestMessage as ExtendedMessage;
              if (extMessage.status === 'recording' && !latestMessage.text) {
                bubbleContent = "🎤 Listening...";
              } else if (extMessage.isInterim && latestMessage.text) {
                bubbleContent = `${latestMessage.text}...`;
              } else if (latestMessage.text) {
                bubbleContent = latestMessage.text;
              } else if (extMessage.status === 'pending') {
                bubbleContent = "Sending...";
              } else if (extMessage.status === 'error') {
                bubbleContent = "Failed to send";
              }

              // For interactive scenes, always show waiting bubble, but control visibility
              const isUserMessage = latestMessage.sender === 'player';
              const hasAIResponse = messages.some(m => {
                const extM = m as ExtendedMessage;
                const extLatest = latestMessage as ExtendedMessage;
                // Use timestamp if available (chat system), otherwise use ts (dialogue system)
                const mTime = extM.timestamp || new Date(extM.ts).getTime();
                const latestTime = extLatest.timestamp || new Date(extLatest.ts).getTime();
                return m.sender === 'npc' && mTime > latestTime;
              });
              shouldShowWaitingBubble = isUserMessage && extMessage.status === 'sent' && !hasAIResponse;
            } else {
              // No messages yet - show placeholder
              side = 'left';
              speakerLabel = (scene as SceneWithId)["left-character"] || "Player";
              bubbleContent = "🎤 Press and hold to record";
              // No waiting bubble for placeholder state
              shouldShowWaitingBubble = false;
            }
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
          // Interactive and input scenes use simpler transitions
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