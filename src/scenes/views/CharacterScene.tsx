/**
 * Displays character dialogue scenes with speaker identification.
 * Shows text in a speech bubble with character name and background.
 * Also shows a sticky "waiting" peek bubble at the bottom when an AI reply is pending.
 */
import React, { useState, useEffect } from "react";
import type { SceneProps } from "../registry";
import type { CharacterScene as CharacterSceneType } from "../../types/scene";
import { WaitingBubble } from "../../components/WaitingBubble";
import { useDialogue } from "../../context/DialogueContext";
import { CardboardBubble } from "../../components/CardboardBubble";
import { useCharacterAnimation } from "../../context/CharacterAnimationContext";

export default function CharacterScene({ scene, sceneIndex }: SceneProps<CharacterSceneType>) {
  const { isWaitingPending } = useDialogue();
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
    console.log(`🎯 Character entrance completed - speaker: ${scene.speaker}, setting bubbleReady to true`);
    setBubbleReady(true);
  };

  // Callback for when bubble leaves viewport - reset to wait for entrance again
  const handleBubbleViewportExit = () => {
    console.log(`🔄 Bubble viewport exit - speaker: ${scene.speaker}, setting bubbleReady to false`);
    setBubbleReady(false); // Reset for all bubbles, will be set back to true appropriately
  };

  // Callback for when bubble enters viewport - set ready immediately for non-delayed bubbles
  const handleBubbleViewportEnter = () => {
    console.log(`📍 Bubble viewport enter - speaker: ${scene.speaker}, shouldDelay: ${shouldDelay}`);
    if (!shouldDelay) {
      // For non-delayed bubbles (center/narrator), set ready immediately as if entrance completed
      console.log(`⚡ Non-delayed bubble - setting bubbleReady to true immediately`);
      setBubbleReady(true);
    }
  };

  // Register callback when component mounts or dependencies change
  useEffect(() => {
    console.log(`🔧 CharacterScene useEffect - speaker: ${scene.speaker}, shouldDelay: ${shouldDelay}, sceneIndex: ${sceneIndex}`);
    if (shouldDelay && sceneIndex !== undefined) {
      console.log(`📝 Registering entrance callback for delayed bubble`);
      registerEntranceCallback(sceneIndex, scene.speaker as 'left' | 'right', handleEntranceComplete);
    } else if (!shouldDelay) {
      // For non-delayed bubbles (center/narrator), set ready immediately
      console.log(`⚡ Setting bubbleReady to true for non-delayed bubble`);
      setBubbleReady(true);
    }
  }, [shouldDelay, sceneIndex, scene.speaker, registerEntranceCallback]);

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

      {/* Waiting bubble near the bottom while we're waiting for AI */}
      {isWaitingPending && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none", // so it does not intercept clicks
          }}
        >
          <WaitingBubble />
        </div>
      )}
    </div>
  );
}