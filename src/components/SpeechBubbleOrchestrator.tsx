/**
 * SpeechBubbleOrchestrator - Uses scroll-based transforms like BackgroundOrchestrator
 * but with delayed transitions to coordinate with character entrance animations.
 */
import React, { useMemo } from 'react';
import { useScrollOffset } from '../hooks/useScrollOffset';
import { CardboardBubble } from './CardboardBubble';
import { WaitingBubble } from './WaitingBubble';
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

  // Calculate waiting bubbles for PageFactory scenes
  const waitingBubbles = useMemo(() => {
    return characterBubbles
      .filter(({ scene, sceneIndex }) => {
        const isPageFactoryScene = !scene.flowSequence && scene.type === "character";
        const isUserScene = scene.speaker === "left";
        const hasSceneId = !!(scene as any).sceneId;
        const nextScene = scenes[sceneIndex + 1];
        const nextSceneIsAI = nextScene &&
                             nextScene.type === "character" &&
                             !(nextScene as any).flowSequence &&
                             (nextScene as any).speaker === "right";

        return isPageFactoryScene && isUserScene && hasSceneId && !nextSceneIsAI;
      })
      .map(({ sceneIndex, transform }) => ({ sceneIndex, transform }));
  }, [characterBubbles, scenes]);

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

        // Detect if bubble is entering (visible) or exiting
        const isVisible = transform === 'translateY(0)';
        const isEntering = isVisible;
        const isExiting = !isVisible && transform.includes('-');

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
        const nextScene = sceneIndex < scenes.length - 1 ? scenes[sceneIndex + 1] : null;
        const nextLeftChar = nextScene && 'left-character' in nextScene ? nextScene["left-character"] : null;
        const nextRightChar = nextScene && 'right-character' in nextScene ? nextScene["right-character"] : null;

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

      {/* Waiting bubbles with same scroll logic but different positioning */}
      {waitingBubbles.map(({ sceneIndex, transform }) => {
        // Detect waiting bubble state
        const isVisible = transform.includes('translateY(0)');
        const isExiting = !isVisible && transform.includes('-');

        let waitingTransition;
        if (isVisible) {
          waitingTransition = 'transform 0.4s ease-out 0.4s'; // Entrance: longer delay than main bubbles
        } else if (isExiting) {
          waitingTransition = 'transform 0.2s ease-in 0s'; // Exit: fast, no delay
        } else {
          waitingTransition = 'transform 0.3s ease-out 0s'; // Default/waiting
        }

        return (
          <div
            key={`waiting-${sceneIndex}`}
            style={{
              position: 'absolute',
              top: '50vh',
              right: '10px',
              transform: `translateY(-50%) ${transform}`,
              transition: waitingTransition,
              pointerEvents: 'auto'
            }}
          >
            <div style={{ marginTop: '80px' }}> {/* Position below main bubble */}
              <WaitingBubble
                side="right"
                speakerLabel="AI"
                isDelayed={false}
                isReady={true}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}