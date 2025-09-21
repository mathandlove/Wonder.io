import React, { useEffect, useMemo, useState, useLayoutEffect } from "react";
import { useScrollManager } from "../hooks/useScrollManager";
import { useCharacterAnimation } from "../context/CharacterAnimationContext";
import type { Scene } from "../types/scene";
import { CharacterPanel } from "./CharacterPanel";



type Props = {
  storyId: string;
  scenes: Scene[];
};

export const CharacterOrchestrator: React.FC<Props> = ({ storyId, scenes }) => {
  const { index: scrollOffset } = useScrollManager({ setCurrentIndex: () => {} }); // continuous float in "scene units"
  const { notifyEntranceComplete } = useCharacterAnimation();

  // Get current scene meta for direct access to animation states
  const currentMeta = useMemo(() => {
    const i = Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset)));
    const currentScene = scenes[i];
    return (currentScene as any)?.meta || null;
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



  // Compute scroll direction based on actual scrollOffset changes
  const lastScrollOffsetRef = React.useRef(scrollOffset);
  const direction = useMemo(() => {
    const diff = scrollOffset - lastScrollOffsetRef.current;
    if (Math.abs(diff) < 0.01) return 'none'; // Small threshold to avoid jitter
    return diff > 0 ? 'down' : 'up';
  }, [scrollOffset]);
  React.useEffect(() => { lastScrollOffsetRef.current = scrollOffset; }, [scrollOffset]);



  // Track when we've scrolled to a new scene and trigger animation restart
  useEffect(() => {
    const currentSceneIndex = Math.round(scrollOffset);

    // Check if we've moved to a different scene
    if (currentSceneIndex !== prevSceneIndex) {
      setPrevSceneIndex(currentSceneIndex);

      // Increment animNonce when scene changes to force animation restart
      // Only trigger animation restart when character is entering (different from previous)
      if (leftPanel?.animationState === 'entering') {
        setLeftEnterNonce(n => n + 1);
      }
      if (rightPanel?.animationState === 'entering') {
        setRightEnterNonce(n => n + 1);
      }
    }
  }, [scrollOffset, prevSceneIndex, leftPanel?.animationState, rightPanel?.animationState]);


  // Publish panel widths as CSS variables to constrain main content
  useLayoutEffect(() => {
    const updatePanelWidths = () => {

      // Always calculate panel widths to constrain center to 600px
      const panelWidth = Math.max(280, (window.innerWidth - 600) / 2);
      const leftWidth = `${panelWidth}px`; // Always apply panel width for consistent speech bubble sizing
      const rightWidth = `${panelWidth}px`; // Always apply panel width for consistent speech bubble sizing

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
      {/* Left gutter column - expands to take available space */}
      <div className="character-panel--left" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "calc((100vw - 600px) / 2)", minWidth: "280px", pointerEvents: "auto" }}>
        <CharacterPanel
          side="left"
          visible={true}
          characterName={leftPanel?.character ?? null}
          previousCharacter={leftPanel?.previousCharacter ?? null}
          nextCharacter={leftPanel?.nextCharacter ?? null}
          pose={leftPanel?.pose ?? null}
          storyId={storyId}
          animationState={leftPanel?.animationState ?? 'idle'}
          aboutToSwap={leftPanel?.aboutToSwap ?? false}
          animNonce={leftEnterNonce}
          scrollDirection={direction === 'down' ? 'forward' : direction === 'up' ? 'backward' : 'forward'}
          onEntranceComplete={handleLeftEntranceComplete}
        />
      </div>

      {/* Right gutter column - expands to take available space */}
      <div className="character-panel--right" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "calc((100vw - 600px) / 2)", minWidth: "280px", pointerEvents: "auto" }}>
        <CharacterPanel
          side="right"
          visible={true}
          characterName={rightPanel?.character ?? null}
          previousCharacter={rightPanel?.previousCharacter ?? null}
          nextCharacter={rightPanel?.nextCharacter ?? null}
          pose={rightPanel?.pose ?? null}
          storyId={storyId}
          animationState={rightPanel?.animationState ?? 'idle'}
          aboutToSwap={rightPanel?.aboutToSwap ?? false}
          animNonce={rightEnterNonce}
          scrollDirection={direction === 'down' ? 'forward' : direction === 'up' ? 'backward' : 'forward'}
          onEntranceComplete={handleRightEntranceComplete}
        />
      </div>
    </div>
  );
};