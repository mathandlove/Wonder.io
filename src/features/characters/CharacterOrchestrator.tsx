import React, { useEffect, useMemo, useState, useLayoutEffect } from "react";
import { useCharacterAnimation } from '@features/characters/CharacterAnimationContext';
import { useSceneManager } from '@core/scenes/SceneManager';
import type { Scene } from '@core/types/scene';
import { CharacterPanel } from "./CharacterPanel";



type Props = {
  storyId: string;
  scenes: Scene[];
  currentIndex?: number;
};

export const CharacterOrchestrator: React.FC<Props> = ({ storyId, scenes, currentIndex = 0 }) => {
  const { notifyEntranceComplete } = useCharacterAnimation();
  const { navigationArray } = useSceneManager();

  // Use currentIndex directly (always passed from ScrollControl)
  const scrollOffset = currentIndex;

  // Get current scene meta and speaker info
  const { currentMeta, currentSpeaker } = useMemo(() => {
    const i = Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset)));
    const currentScene = scenes[i];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (currentScene as any)?.meta || null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const speaker = (currentScene as any)?.speaker || null;

    return { currentMeta: meta, currentSpeaker: speaker };
  }, [scrollOffset, scenes]);


  // AnimNonce state for forcing animation restarts
  const [leftEnterNonce, setLeftEnterNonce] = useState(0);
  const [rightEnterNonce, setRightEnterNonce] = useState(0);
  const [prevSceneIndex, setPrevSceneIndex] = useState(0);

  // Extract panel data from meta
  const leftPanel = currentMeta?.panelLeft;
  const rightPanel = currentMeta?.panelRight;

  // Get current scene index for callback coordination
  const currentSceneIndex = Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset)));

  // Create callbacks to notify when entrance completes
  const handleLeftEntranceComplete = () => {
    notifyEntranceComplete(currentSceneIndex, 'left');
  };

  const handleRightEntranceComplete = () => {
    notifyEntranceComplete(currentSceneIndex, 'right');
  };



  // Track scroll direction with stable state
  const [scrollDirection, setScrollDirection] = useState<'forward' | 'backward'>('forward');
  const prevScrollOffsetRef = React.useRef(scrollOffset);

  React.useEffect(() => {
    const diff = scrollOffset - prevScrollOffsetRef.current;
    if (Math.abs(diff) > 0.01) { // Small threshold to avoid jitter
      const newDirection = diff > 0 ? 'forward' : 'backward';
      setScrollDirection(newDirection);
    }
    prevScrollOffsetRef.current = scrollOffset;
  }, [scrollOffset]);



  // Helper function to get character from a scene
  const getCharacterFromScene = (scene: any, side: 'left' | 'right'): string | null => {
    const key = side === 'left' ? 'left-character' : 'right-character';
    return scene?.[key] || scene?.meta?.[side === 'left' ? 'panelLeft' : 'panelRight']?.character || null;
  };

  // Track when we've scrolled to a new scene and trigger animation restart
  useEffect(() => {
    const currentSceneIndex = Math.round(scrollOffset);

    // Check if we've moved to a different scene
    if (currentSceneIndex !== prevSceneIndex) {
      const isMovingForward = currentSceneIndex > prevSceneIndex;

      // Get current, previous, and next navigation items
      const currentNavItem = navigationArray[currentSceneIndex];
      const previousNavItem = navigationArray[currentSceneIndex - 1];

      // Check allowAnimate flag
      const allowAnimate = currentNavItem?.sceneState?.type === 'dialogue'
        ? currentNavItem.sceneState.allowAnimate !== false  // Default to true if not specified
        : true;

      setPrevSceneIndex(currentSceneIndex);

      // Only trigger entrance animations when moving forward and allowed
      if (isMovingForward && allowAnimate && currentNavItem) {
        // Check if LEFT character is new (different from previous scene)
        const currentLeftChar = getCharacterFromScene(currentNavItem.scene, 'left');
        const previousLeftChar = previousNavItem ? getCharacterFromScene(previousNavItem.scene, 'left') : null;
        const leftCharacterIsNew = currentLeftChar !== previousLeftChar && currentLeftChar !== null;

        // Check if RIGHT character is new (different from previous scene)
        const currentRightChar = getCharacterFromScene(currentNavItem.scene, 'right');
        const previousRightChar = previousNavItem ? getCharacterFromScene(previousNavItem.scene, 'right') : null;
        const rightCharacterIsNew = currentRightChar !== previousRightChar && currentRightChar !== null;

        if (leftCharacterIsNew) {
          setLeftEnterNonce(n => n + 1);
        }
        if (rightCharacterIsNew) {
          setRightEnterNonce(n => n + 1);
        }
      }
    }
  }, [scrollOffset, prevSceneIndex, leftEnterNonce, rightEnterNonce, navigationArray]);


  // Publish panel widths as CSS variables to constrain main content
  useLayoutEffect(() => {
    const updatePanelWidths = () => {
      // Use 22vw for both panels
      const panelWidth = window.innerWidth * 0.22; // 22% of viewport width
      const leftWidth = `${panelWidth}px`;
      const rightWidth = `${panelWidth}px`;

      document.documentElement.style.setProperty("--panel-left-width", leftWidth);
      document.documentElement.style.setProperty("--panel-right-width", rightWidth);
    };

    updatePanelWidths();

    // Update on resize
    window.addEventListener('resize', updatePanelWidths);
    return () => window.removeEventListener('resize', updatePanelWidths);
  }, [scrollOffset, scenes]);



  // Fixed overlay container
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }}>
      {/* Left gutter column - 22% of viewport width */}
      <div className="character-panel--left" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "22vw", pointerEvents: "auto" }}>
        <CharacterPanel
          side="left"
          visible={true}
          characterName={leftPanel?.character ?? null}
          previousCharacter={leftPanel?.previousCharacter ?? null}
          nextCharacter={leftPanel?.nextCharacter ?? null}
          pose={leftPanel?.pose ?? null}
          storyId={storyId}
          newCharacter={leftPanel?.newCharacter ?? false}
          aboutToSwap={leftPanel?.aboutToSwap ?? false}
          animNonce={leftEnterNonce}
          scrollDirection={scrollDirection}
          isSpeaking={currentSpeaker === 'left'}
          onEntranceComplete={handleLeftEntranceComplete}
        />
      </div>

      {/* Right gutter column - 22% of viewport width */}
      <div className="character-panel--right" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "22vw", pointerEvents: "auto" }}>
        <CharacterPanel
          side="right"
          visible={true}
          characterName={rightPanel?.character ?? null}
          previousCharacter={rightPanel?.previousCharacter ?? null}
          nextCharacter={rightPanel?.nextCharacter ?? null}
          pose={rightPanel?.pose ?? null}
          storyId={storyId}
          newCharacter={rightPanel?.newCharacter ?? false}
          aboutToSwap={rightPanel?.aboutToSwap ?? false}
          animNonce={rightEnterNonce}
          scrollDirection={scrollDirection}
          isSpeaking={currentSpeaker === 'right'}
          onEntranceComplete={handleRightEntranceComplete}
        />
      </div>
    </div>
  );
};