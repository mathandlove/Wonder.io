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

  // AnimNonce state for forcing animation restarts
  const [leftEnterNonce, setLeftEnterNonce] = useState(0);
  const [rightEnterNonce, setRightEnterNonce] = useState(0);
  const [prevSceneIndex, setPrevSceneIndex] = useState(0);

  // Compute panel data directly from navigationArray (no metadata needed!)
  const { leftPanel, rightPanel, currentSpeaker } = useMemo(() => {
    const i = Math.max(0, Math.min(navigationArray.length - 1, Math.round(scrollOffset)));
    const currentNavItem = navigationArray[i];
    const previousNavItem = navigationArray[i - 1];
    const nextNavItem = navigationArray[i + 1];

    if (!currentNavItem) {
      return { leftPanel: null, rightPanel: null, currentSpeaker: null };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const speaker = (currentNavItem.scene as any)?.speaker || null;

    // Helper to extract character from a navigation item
    const getChar = (navItem: typeof currentNavItem | undefined, side: 'left' | 'right') => {
      if (!navItem) return null;
      const key = side === 'left' ? 'left-character' : 'right-character';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (navItem.scene as any)?.[key] || null;
    };

    const leftChar = getChar(currentNavItem, 'left');
    const rightChar = getChar(currentNavItem, 'right');

    return {
      leftPanel: leftChar ? {
        character: leftChar,
        previousCharacter: getChar(previousNavItem, 'left'),
        nextCharacter: getChar(nextNavItem, 'left'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pose: (currentNavItem.scene as any)?.meta?.panelLeft?.pose || null,
      } : null,
      rightPanel: rightChar ? {
        character: rightChar,
        previousCharacter: getChar(previousNavItem, 'right'),
        nextCharacter: getChar(nextNavItem, 'right'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pose: (currentNavItem.scene as any)?.meta?.panelRight?.pose || null,
      } : null,
      currentSpeaker: speaker
    };
  }, [scrollOffset, navigationArray]);

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



  // Track when we've scrolled to a new scene and trigger animation restart
  useEffect(() => {
    const currentSceneIndex = Math.round(scrollOffset);

    // Check if we've moved to a different scene
    if (currentSceneIndex !== prevSceneIndex) {
      const isMovingForward = currentSceneIndex > prevSceneIndex;

      // Get current navigation item
      const currentNavItem = navigationArray[currentSceneIndex];

      // Check allowAnimate flag
      const allowAnimate = currentNavItem?.sceneState?.type === 'dialogue'
        ? currentNavItem.sceneState.allowAnimate !== false  // Default to true if not specified
        : true;

      setPrevSceneIndex(currentSceneIndex);

      // Increment nonces when moving forward and animations are allowed
      // CharacterPanel will derive whether to show entrance animation based on previousCharacter !== characterName
      if (isMovingForward && allowAnimate && currentNavItem) {
        setLeftEnterNonce(n => n + 1);
        setRightEnterNonce(n => n + 1);
      }
    }
  }, [scrollOffset, prevSceneIndex, navigationArray]);


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
          animNonce={rightEnterNonce}
          scrollDirection={scrollDirection}
          isSpeaking={currentSpeaker === 'right'}
          onEntranceComplete={handleRightEntranceComplete}
        />
      </div>
    </div>
  );
};