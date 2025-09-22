/**
 * SpeechBubbleOrchestrator - Uses scroll-based transforms like BackgroundOrchestrator
 * but with delayed transitions to coordinate with character entrance animations.
 */
import React, { useMemo } from 'react';
import { useScrollOffset } from '../hooks/useScrollOffset';
import { CardboardBubble } from './CardboardBubble';
import type { Scene, CharacterScene } from '../types/scene';

interface SpeechBubbleOrchestratorProps {
  scenes: Scene[];
  currentIndex: number;
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

export function SpeechBubbleOrchestrator({ scenes }: SpeechBubbleOrchestratorProps) {
  // Get current scroll offset (float in scene units)
  const dummyRef = React.useRef<HTMLDivElement>(null);
  const { offset: scrollOffset } = useScrollOffset(dummyRef);

  // Track scroll direction
  const prevScrollOffsetRef = React.useRef(scrollOffset);
  const scrollDirection = scrollOffset > prevScrollOffsetRef.current ? 'forward' : 'backward';

  // Update previous scroll offset for next render
  React.useEffect(() => {
    prevScrollOffsetRef.current = scrollOffset;
  }, [scrollOffset]);

  // Find character scenes to render bubbles for
  const characterBubbles = useMemo(() => {
    const bubbles: Array<{
      scene: CharacterScene;
      sceneIndex: number;
      transform: string;
    }> = [];

    scenes.forEach((scene, index) => {
      if (scene?.type === 'character') {
        const transform = translateForSpeechBubble(index, scrollOffset);
        bubbles.push({
          scene: scene as CharacterScene,
          sceneIndex: index,
          transform
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
      {characterBubbles.map(({ scene, sceneIndex, transform }) => {
        const speakerLabel = scene.speaker === "left"
          ? scene["left-character"] || "Left"
          : scene.speaker === "right"
          ? scene["right-character"] || "Right"
          : "Narrator";

        // Detect if bubble is entering (visible)
        const isVisible = transform === 'translateY(0)';
        const isEntering = isVisible;

        // Detect if this scene has character entrance animation
        // Check if any characters are entering (not just if speaker is left/right)
        const leftCharacter = scene["left-character"];
        const rightCharacter = scene["right-character"];

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

        // Character swapping includes when next scene has NOCHARACTER (character exits)
        const leftCharSwapping = leftCharacter && (leftCharacter !== nextLeftChar || nextLeftChar === 'NOCHARACTER');
        const rightCharSwapping = rightCharacter && (rightCharacter !== nextRightChar || nextRightChar === 'NOCHARACTER');

        const hasSwapAnimation = leftCharSwapping || rightCharSwapping;

        let transition;
        if (isEntering) {
          // Entering bubble - check scroll direction and animation needs

            if ((hasEnteringAnimation && scrollDirection === 'forward') || (scrollDirection === 'backward' && hasSwapAnimation)) {
              transition = 'transform 0.4s ease-out 1.6s'; // Forward + character entrance: delay
            } else {
              transition = 'transform 0.4s ease-out 0s'; // Forward + no character entrance: immediate
            }
          }
         else {

          transition = 'transform 0.3s ease-out 0s'; // Default/waiting
        }

        // Determine if this scene should show waiting bubble
        const isPageFactoryScene = !scene.flowSequence && scene.type === "character";
        const isUserScene = scene.speaker === "left";
        const hasSceneId = !!(scene as any).sceneId;
        const nextSceneForWaiting = scenes[sceneIndex + 1];
        const nextSceneIsAI = nextSceneForWaiting &&
                             nextSceneForWaiting.type === "character" &&
                             !(nextSceneForWaiting as any).flowSequence &&
                             (nextSceneForWaiting as any).speaker === "right";

        const shouldShowWaitingBubble = isPageFactoryScene && isUserScene && hasSceneId && !nextSceneIsAI;

        return (
          <div
            key={`bubble-${sceneIndex}`}
            style={{
              position: 'absolute',
              top: '50vh', // Center vertically in viewport
              left: '50%',
              transform: `translate(-50%, -50%) ${transform}`, // Combine centering with scroll transform
              transition,
              pointerEvents: 'auto'
            }}
          >
            <CardboardBubble
              side={scene.speaker === 'left' ? 'left' : scene.speaker === 'right' ? 'right' : 'center'}
              speakerLabel={speakerLabel}
              showWaitingBubble={shouldShowWaitingBubble}
            >
              {scene.text}
            </CardboardBubble>

            {/* Debug overlay for bubble state - DISABLED
            <div style={{
              position: 'absolute',
              top: '-80px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 255, 0, 0.8)',
              color: 'black',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-line',
              zIndex: 1000,
              pointerEvents: 'none',
              textAlign: 'center'
            }}>
              {`BUBBLE DEBUG
Scene: ${sceneIndex}
Speaker: ${scene.speaker}
scrollDirection: ${scrollDirection}
hasEnteringAnimation: ${hasEnteringAnimation}
hasSwapAnimation: ${hasSwapAnimation}
isEntering: ${isEntering}
isExiting: ${isExiting}
transform: ${transform}
transition: ${transition}`}
            </div> */}
          </div>
        );
      })}

      {/* Waiting bubbles are now integrated into CardboardBubble components */}
    </div>
  );
}