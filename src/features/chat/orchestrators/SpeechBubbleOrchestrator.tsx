/**
 * SpeechBubbleOrchestrator - Uses scroll-based transforms like BackgroundOrchestrator
 * but with delayed transitions to coordinate with character entrance animations.
 */
import React, { useMemo } from 'react';
import { CardboardBubble } from '@features/chat/components/CardboardBubble';
import { useDialogue } from '../context/useChatDialogue';
import { useDialogue as useRecordingDialogue } from '@core/dialogue/DialogueContext';
import { useRecording } from '@core/recording/RecordingContext';
import { useSceneOrchestratorContext } from '@core/scenes/SceneOrchestratorContext';
import { useSceneStates } from '@core/scenes/SceneStates';
import { useSceneManager } from '@core/scenes/SceneManager';
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

export function SpeechBubbleOrchestrator({ scenes, currentIndex = 0 }: SpeechBubbleOrchestratorProps) {
  // Get dialogue context for interactive scenes
  const { messages: globalMessages } = useDialogue();
  const { getMessagesForScene } = useRecordingDialogue();
  // Get recording context for continuous recording
  const { getDisplayText, isRecording } = useRecording();
  // Get orchestrator context for input scene state
  const orchestrator = useSceneOrchestratorContext();
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

  // Find character scenes AND interactive scenes (input/interactive-bubble) to render bubbles for
  // IMPORTANT: Use navigationArray to get the actual scene objects (including dynamically created ones)
  const speechBubbles = useMemo(() => {

    const bubbles: Array<{
      scene: CharacterScene | InteractiveBubbleScene | InputScene;
      sceneIndex: number;
      transform: string;
      type: 'character' | 'interactive-bubble' | 'input';
    }> = [];

    // Use navigationArray which contains the actual scenes being rendered
    navigationArray.forEach((navItem, index) => {
      const scene = navItem.scene;

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
      {speechBubbles.map(({ scene, sceneIndex, transform, type }) => {
        // Handle different bubble content based on scene type
        let bubbleContent: React.ReactNode = null;
        let speakerLabel = "";
        let side: 'left' | 'right' | 'center' = 'center';
        let shouldShowWaitingBubble = false;

        // Debug logging for recording scene
        const sceneWithId = scene as SceneWithId;
        if (sceneWithId.sceneId?.includes('-recording')) {
          console.log(`🔍 RECORDING SCENE FOUND:`, {
            sceneId: sceneWithId.sceneId,
            type: scene.type,
            speaker: sceneWithId.speaker,
            text: sceneWithId.text,
            sceneIndex
          });
        }

        if (type === 'character') {
          const characterScene = scene as CharacterScene;
          const sceneId = (characterScene as SceneWithId).sceneId;

          // Check if this scene has dialogue states
          const sceneState = sceneId ? sceneStates.getSceneState(sceneId) : undefined;
          const dialogueState = sceneState?.type === 'dialogue' ? sceneState.state : null;

          // Debug logging for dialogue state
          if (sceneId?.includes('-recording')) {
            console.log(`🔍 RECORDING SCENE DIALOGUE STATE:`, {
              sceneId,
              sceneState,
              dialogueState
            });
          }

          speakerLabel = characterScene.speaker === "left"
            ? characterScene["left-character"] || "Left"
            : characterScene.speaker === "right"
            ? characterScene["right-character"] || "Right"
            : "Narrator";

          side = characterScene.speaker === 'left' ? 'left' :
                 characterScene.speaker === 'right' ? 'right' : 'center';

          // Handle dialogue states - all states just show the scene text
          if (dialogueState) {
            // All dialogue states: just show the text
            bubbleContent = characterScene.text;
            console.log(`💬 ${dialogueState} state for ${sceneId}, text: "${characterScene.text}"`);
          } else {
            // No dialogue state, show text normally
            bubbleContent = characterScene.text;
          }

          // Show waiting bubble based solely on dialogue state
          // When state is 'ai-waiting', show the animated ellipses bubble
          shouldShowWaitingBubble = dialogueState === 'ai-waiting';

        } else if (type === 'interactive-bubble' || type === 'input') {
          // Handle both interactive-bubble and input scenes the same way
          const sceneId = (scene as SceneWithId).sceneId || '';

          // PRIORITY: Check orchestrator input state for input scenes
          const inputState = orchestrator?.getInputState(sceneId);

          if (type === 'input' && inputState) {
            // For input scenes, respect the orchestrator state machine
            if (inputState === 'idle') {
              // IDLE: No speech bubble shown
              bubbleContent = null; // Will be skipped by the null check below
            } else if (inputState === 'recording') {
              // RECORDING: Only show bubble when there's actual transcribed text
              const globalText = getDisplayText();
              side = 'left';
              speakerLabel = (scene as SceneWithId)["left-character"] || "Player";
              // Only show bubble if there's transcribed text (no placeholder)
              bubbleContent = globalText && globalText.trim() ? globalText : null;
              shouldShowWaitingBubble = false;
            } else if (inputState === 'waiting') {
              // WAITING: Show the player's last message + waiting bubble below
              const recordingMessages = getMessagesForScene(sceneId);
              const latestPlayerMessage = recordingMessages.filter(m => m.sender === 'player').pop();

              side = 'left';
              speakerLabel = (scene as SceneWithId)["left-character"] || "Player";
              bubbleContent = latestPlayerMessage?.text || "Sent message";
              shouldShowWaitingBubble = true;
            } else if (inputState === 'converting') {
              // CONVERTING: Creating permanent scenes
              side = 'center';
              speakerLabel = "System";
              bubbleContent = "🔄 Converting to permanent scenes...";
              shouldShowWaitingBubble = false;
            }
          } else {
            // For interactive-bubble scenes OR input scenes without orchestrator state,
            // fall back to the original logic

            // Use global recording state when actively recording
            if (isRecording()) {
              const globalText = getDisplayText();
              side = 'left';
              speakerLabel = (scene as SceneWithId)["left-character"] || "Player";
              // Only show bubble if there's transcribed text (no placeholder)
              bubbleContent = globalText && globalText.trim() ? globalText : null;
              shouldShowWaitingBubble = false;
            } else {
              // Fall back to dialogue messages when not actively recording
              const recordingMessages = getMessagesForScene(sceneId);
              const messages = recordingMessages.length > 0 ? recordingMessages : globalMessages;
              const latestMessage = messages[messages.length - 1];

              if (latestMessage) {
                // Set side based on message sender
                side = latestMessage.sender === 'player' ? 'left' : 'right';
                speakerLabel = latestMessage.sender === 'player'
                  ? (scene as SceneWithId)["left-character"] || "Player"
                  : (scene as SceneWithId)["right-character"] || "AI";

                // Generate content based on message status
                const extMessage = latestMessage as ExtendedMessage;
                if (extMessage.status === 'recording' && !latestMessage.text) {
                  // Don't show any bubble while recording without text
                  bubbleContent = null;
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
                // No messages yet - don't show any bubble
                bubbleContent = null;
              }
            }
          }
        }

        // Debug: Log final bubble state before rendering
        if (sceneWithId.sceneId?.includes('-recording')) {
          console.log(`🎨 FINAL BUBBLE STATE:`, {
            sceneId: sceneWithId.sceneId,
            bubbleContent,
            side,
            speakerLabel,
            willRender: !!bubbleContent,
            sceneIndex,
            scrollOffset,
            transform,
            isVisible: transform === 'translateY(0)'
          });
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