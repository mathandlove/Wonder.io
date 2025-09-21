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
    setBubbleReady(true);
  };

  // Callback for when bubble leaves viewport - reset to wait for entrance again
  const handleBubbleViewportExit = () => {
    if (shouldDelay) {
      setBubbleReady(false);
    }
  };

  // Register callback when component mounts or dependencies change
  useEffect(() => {
    if (shouldDelay && sceneIndex !== undefined) {
      registerEntranceCallback(sceneIndex, scene.speaker as 'left' | 'right', handleEntranceComplete);
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