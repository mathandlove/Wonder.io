/**
 * Displays character dialogue scenes with speaker identification.
 * Shows text in a speech bubble with character name and background.
 * Also shows a sticky "waiting" peek bubble at the bottom when an AI reply is pending.
 */
import React, { useState, useEffect } from "react";
import type { SceneProps } from "../registry";
import type { CharacterScene as CharacterSceneType } from "../../types/scene";
import { CardboardBubble } from "../../components/CardboardBubble";
import { WaitingBubble } from "../../components/WaitingBubble";
import { useCharacterAnimation } from "../../context/CharacterAnimationContext";
import { useNavigation } from "../../context/NavigationContext";

export default function CharacterScene({ scene, sceneIndex }: SceneProps<CharacterSceneType>) {
  const { registerEntranceCallback } = useCharacterAnimation();
  const { scenes } = useNavigation();

  // Each scene manages its own bubble ready state
  const [bubbleReady, setBubbleReady] = useState(false);
  const [showWaitingBubble, setShowWaitingBubble] = useState(false);

  // Resolve display name from scene metadata
  const speakerLabel =
    scene.speaker === "left"
      ? scene["left-character"] || "Left"
      : scene.speaker === "right"
      ? scene["right-character"] || "Right"
      : "Narrator";

  // Determine if bubble should be delayed and if it's ready
  const shouldDelay = scene.speaker === 'left' || scene.speaker === 'right';
  const shouldAnimateImmediately = (scene as any).meta?.bubbleAnimateImmediately || false;
  const isReady = shouldDelay ? (shouldAnimateImmediately || bubbleReady) : true;

  // Callback for when character entrance completes
  const handleEntranceComplete = () => {
    // console.log(`🎯 handleEntranceComplete called for scene ${sceneIndex}, speaker: ${scene.speaker} - setting bubbleReady to TRUE`);
    setBubbleReady(true);
  };

  // Callback for when bubble leaves viewport - reset to wait for entrance again
  const handleBubbleViewportExit = () => {
    setBubbleReady(false); // Reset for all bubbles, will be set back to true appropriately
  };

  // Callback for when bubble enters viewport - set ready immediately for non-delayed bubbles
  const handleBubbleViewportEnter = () => {
    if (!shouldDelay) {
      // For non-delayed bubbles (center/narrator), set ready immediately as if entrance completed
      setBubbleReady(true);
    }
  };

  // Register callback when component mounts or dependencies change
  useEffect(() => {
    if (shouldDelay && !shouldAnimateImmediately && sceneIndex !== undefined) {
      // Only register entrance callbacks for scenes that need to wait for character entrance
      const timeoutId = setTimeout(() => {
        // console.log(`✅ Registering entrance callback for scene ${sceneIndex}, speaker: ${scene.speaker}, text: "${scene.text.substring(0, 20)}..."`);
        registerEntranceCallback(sceneIndex, scene.speaker as 'left' | 'right', handleEntranceComplete);
      }, 10);

      return () => {
        clearTimeout(timeoutId);
      };
    } else if (!shouldDelay || shouldAnimateImmediately) {
      // For non-delayed bubbles (center/narrator) or scenes that should animate immediately
      setBubbleReady(true);
    }
  }, [shouldDelay, shouldAnimateImmediately, sceneIndex, scene.speaker, scene.text, registerEntranceCallback]);

  // Logic for showing waiting bubble on PageFactory-created scenes
  useEffect(() => {
    // Check if this is a PageFactory-created user scene (left speaker)
    const isPageFactoryScene = !scene.flowSequence && scene.type === "character";
    const isUserScene = scene.speaker === "left";
    const hasSceneId = !!(scene as any).sceneId; // PageFactory adds sceneId
    const nextScene = sceneIndex !== undefined ? scenes[sceneIndex + 1] : null;
    const nextSceneIsAI = nextScene &&
                         nextScene.type === "character" &&
                         !(nextScene as any).flowSequence &&
                         (nextScene as any).speaker === "right";

    // Show waiting bubble for PageFactory user scenes ONLY if no AI response exists yet
    const shouldShowWaiting = isPageFactoryScene && isUserScene && hasSceneId && !nextSceneIsAI;

    console.log(`🔍 WaitingBubble Debug for scene ${sceneIndex}:`, {
      isPageFactoryScene,
      isUserScene,
      hasSceneId,
      nextSceneIsAI,
      shouldShowWaiting,
      sceneType: scene.type,
      speaker: scene.speaker,
      flowSequence: scene.flowSequence,
      sceneId: (scene as any).sceneId,
      text: scene.text?.substring(0, 30) + '...',
      totalScenes: scenes.length
    });

    if (shouldShowWaiting) {
      console.log(`✅ Showing waiting bubble for PageFactory scene ${sceneIndex}`);
      setShowWaitingBubble(true);
    } else {
      setShowWaitingBubble(false);
    }
  }, [scene, sceneIndex, scenes]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: scene.speaker === 'left' ? 'flex-start' : scene.speaker === 'right' ? 'flex-end' : 'center',
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Main character speech bubble */}
      <CardboardBubble
        side={scene.speaker === 'left' ? 'left' : scene.speaker === 'right' ? 'right' : 'center'}
        speakerLabel={speakerLabel}
        isDelayed={false}
        isReady={true}
        onViewportExit={handleBubbleViewportExit}
        onViewportEnter={handleBubbleViewportEnter}
      >
        {scene.text}
      </CardboardBubble>


      {/* Waiting bubble - positioned absolutely below the main bubble */}
      {showWaitingBubble && (
        <div
          className="waiting-bubble-entrance"
          style={{
            position: 'absolute',
            top: 'calc(50% + 100px)', // Start below center where main bubble is
            right: scene.speaker === 'left' ? '10px' : '10px', // Always position on right side
            zIndex: 10
          }}
        >
          <WaitingBubble
            side="right"
            speakerLabel="AI"
            isDelayed={false}
            isReady={true}
          />
        </div>
      )}
    </div>
  );
}