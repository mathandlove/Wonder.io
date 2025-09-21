/**
 * Displays character dialogue scenes with speaker identification.
 * Shows text in a speech bubble with character name and background.
 * Also shows a sticky "waiting" peek bubble at the bottom when an AI reply is pending.
 */
import React, { useState, useEffect } from "react";
import type { SceneProps } from "../registry";
import type { CharacterScene as CharacterSceneType } from "../../types/scene";
import { CardboardBubble } from "../../components/CardboardBubble";
import { useCharacterAnimation } from "../../context/CharacterAnimationContext";

export default function CharacterScene({ scene, sceneIndex }: SceneProps<CharacterSceneType>) {
  const { registerEntranceCallback } = useCharacterAnimation();

  // Each scene manages its own bubble ready state
  const [bubbleReady, setBubbleReady] = useState(false);

  // Resolve display name from scene metadata
  const speakerLabel =
    scene.speaker === "left"
      ? scene["left-character"] || "Left"
      : scene.speaker === "right"
      ? scene["right-character"] || "Right"
      : "Narrator";

  // Determine if bubble should be delayed and if it's ready
  const shouldDelay = scene.speaker === 'left' || scene.speaker === 'right';
  const isReady = shouldDelay ? bubbleReady : true;

  // Callback for when character entrance completes
  const handleEntranceComplete = () => {
    console.log(`🎯 handleEntranceComplete called for scene ${sceneIndex}, speaker: ${scene.speaker} - setting bubbleReady to TRUE`);
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
    if (shouldDelay && sceneIndex !== undefined) {
      // Small delay to ensure callback is registered after component fully mounts
      const timeoutId = setTimeout(() => {
        console.log(`✅ Registering entrance callback for scene ${sceneIndex}, speaker: ${scene.speaker}, text: "${scene.text.substring(0, 20)}..."`);
        registerEntranceCallback(sceneIndex, scene.speaker as 'left' | 'right', handleEntranceComplete);
      }, 10);
      return () => clearTimeout(timeoutId);
    } else if (!shouldDelay) {
      // For non-delayed bubbles (center/narrator), set ready immediately
      setBubbleReady(true);
    }
  }, [shouldDelay, sceneIndex, scene.speaker, scene.text, registerEntranceCallback]); // Added scene.text to dependencies

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: scene.speaker === 'left' ? 'flex-start' : scene.speaker === 'right' ? 'flex-end' : 'center',
        position: "relative",
      }}
    >
      {/* Main character speech bubble */}
      <CardboardBubble
        side={scene.speaker === 'left' ? 'left' : scene.speaker === 'right' ? 'right' : 'center'}
        speakerLabel={speakerLabel}
        isDelayed={shouldDelay}
        isReady={isReady}
        onViewportExit={handleBubbleViewportExit}
        onViewportEnter={handleBubbleViewportEnter}
      >
        {scene.text}
      </CardboardBubble>
    </div>
  );
}