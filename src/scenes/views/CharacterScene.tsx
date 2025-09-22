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

    // Show waiting bubble for PageFactory user scenes ONLY if no AI response exists yet AND main bubble is ready
    const mainBubbleReady = shouldAnimateImmediately ? true : isReady;
    const shouldShowWaiting = isPageFactoryScene && isUserScene && hasSceneId && !nextSceneIsAI && mainBubbleReady;

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
  }, [scene, sceneIndex, scenes, isReady]);

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
      <div style={{ position: 'relative' }}>
        <CardboardBubble
          side={scene.speaker === 'left' ? 'left' : scene.speaker === 'right' ? 'right' : 'center'}
          speakerLabel={speakerLabel}
          shouldAnimateImmediately={shouldAnimateImmediately}
          isReady={isReady}
          onViewportExit={handleBubbleViewportExit}
          onViewportEnter={handleBubbleViewportEnter}
          onReady={handleEntranceComplete}
        >
          {scene.text}
        </CardboardBubble>

        {/* Debug overlay for main bubble */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          left: '0',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#0ff',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-line',
          zIndex: 1000,
          pointerEvents: 'none',
          maxWidth: '200px'
        }}>
          {`MAIN BUBBLE
Scene: ${sceneIndex}
Speaker: ${scene.speaker}
Side: ${scene.speaker === 'left' ? 'left' : scene.speaker === 'right' ? 'right' : 'center'}
shouldAnimateImmediately: ${shouldAnimateImmediately}
bubbleReady: ${bubbleReady}
isReady: ${isReady}
mainBubbleReady: ${shouldAnimateImmediately ? true : isReady}`}
        </div>
      </div>


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

          {/* Debug overlay for waiting bubble */}
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '0',
            background: 'rgba(255, 0, 0, 0.8)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-line',
            zIndex: 1001,
            pointerEvents: 'none',
            maxWidth: '200px'
          }}>
            {`WAITING BUBBLE
Scene: ${sceneIndex}
showWaitingBubble: ${showWaitingBubble}
isPageFactoryScene: ${!scene.flowSequence && scene.type === "character"}
isUserScene: ${scene.speaker === "left"}
hasSceneId: ${!!(scene as any).sceneId}
nextSceneIsAI: ${(() => {
  const nextScene = sceneIndex !== undefined ? scenes[sceneIndex + 1] : null;
  return !!(nextScene &&
    nextScene.type === "character" &&
    !(nextScene as any).flowSequence &&
    (nextScene as any).speaker === "right");
})()}
shouldShowWaiting: ${(() => {
  const isPageFactoryScene = !scene.flowSequence && scene.type === "character";
  const isUserScene = scene.speaker === "left";
  const hasSceneId = !!(scene as any).sceneId;
  const nextScene = sceneIndex !== undefined ? scenes[sceneIndex + 1] : null;
  const nextSceneIsAI = nextScene &&
                       nextScene.type === "character" &&
                       !(nextScene as any).flowSequence &&
                       (nextScene as any).speaker === "right";
  return isPageFactoryScene && isUserScene && hasSceneId && !nextSceneIsAI;
})()}`}
          </div>
        </div>
      )}
    </div>
  );
}