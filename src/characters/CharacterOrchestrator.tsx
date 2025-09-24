import React, { useEffect, useMemo, useState, useLayoutEffect } from "react";
import { useScrollManager } from "../hooks/useScrollManager";
import { useCharacterAnimation } from "../context/CharacterAnimationContext";
import type { Scene } from "../types/scene";
import { CharacterPanel } from "./CharacterPanel";



type Props = {
  storyId: string;
  scenes: Scene[];
  currentIndex?: number;
};

export const CharacterOrchestrator: React.FC<Props> = ({ storyId, scenes, currentIndex }) => {
  const { notifyEntranceComplete } = useCharacterAnimation();

  // Use passed currentIndex or fall back to scroll manager
  const { index: scrollOffsetFallback } = useScrollManager({ setCurrentIndex: () => {} }); // continuous float in "scene units"
  const scrollOffset = currentIndex !== undefined ? currentIndex : scrollOffsetFallback;

  // Get current scene meta and speaker info
  const { currentMeta, currentSpeaker } = useMemo(() => {
    const i = Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset)));
    const currentScene = scenes[i];
    const meta = (currentScene as any)?.meta || null;
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



  // Track when we've scrolled to a new scene and trigger animation restart
  useEffect(() => {
    const currentSceneIndex = Math.round(scrollOffset);

    // Check if we've moved to a different scene
    if (currentSceneIndex !== prevSceneIndex) {
      setPrevSceneIndex(currentSceneIndex);

      // Increment animNonce when scene changes to force animation restart
      // Only trigger animation restart when character is new
      if (leftPanel?.newCharacter) {
        setLeftEnterNonce(n => n + 1);
      }
      if (rightPanel?.newCharacter) {
        setRightEnterNonce(n => n + 1);
      }
    }
  }, [scrollOffset, prevSceneIndex, leftPanel?.newCharacter, rightPanel?.newCharacter]);


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