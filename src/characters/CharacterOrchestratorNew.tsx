/**
 * CharacterOrchestrator - Simplified version using meta-based animation states
 * Reads animation state directly from scene meta instead of computing it
 */
import React, { useMemo, useLayoutEffect, useState, useEffect } from 'react';
import type { Scene } from '../types/scene';
import { CharacterPanel } from './CharacterPanel';
import { useScrollManager } from '../hooks/useScrollManager';

type Props = { storyId: string; scenes: Scene[] };

export const CharacterOrchestrator: React.FC<Props> = ({ storyId, scenes }) => {
  const { index: scrollOffset } = useScrollManager({ setCurrentIndex: () => {} });
  const [leftEnterNonce, setLeftEnterNonce] = useState(0);
  const [rightEnterNonce, setRightEnterNonce] = useState(0);
  const [prevSceneIndex, setPrevSceneIndex] = useState(0);

  // Get current scene meta for direct access to animation states
  const currentMeta = useMemo(() => {
    const i = Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset)));
    const currentScene = scenes[i];
    return currentScene?.meta || null;
  }, [scrollOffset, scenes]);

  // Publish panel widths as CSS variables based on current scene's panelRestricted value
  useLayoutEffect(() => {
    const currentSceneIndex = Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset)));
    const currentScene = scenes[currentSceneIndex] as any;
    const shouldShowPanels = currentScene?.panelRestricted ?? false;

    const leftWidth = shouldShowPanels ? "280px" : "0px";
    const rightWidth = shouldShowPanels ? "280px" : "0px";

    document.documentElement.style.setProperty("--panel-left-width", leftWidth);
    document.documentElement.style.setProperty("--panel-right-width", rightWidth);
  }, [scrollOffset, scenes]);

  // Extract panel data from meta
  const leftPanel = currentMeta?.panelLeft;
  const rightPanel = currentMeta?.panelRight;

  // Track when we've scrolled to a new scene and trigger animation restart
  useEffect(() => {
    const currentSceneIndex = Math.round(scrollOffset);

    // Check if we've moved to a different scene
    if (currentSceneIndex !== prevSceneIndex) {
      setPrevSceneIndex(currentSceneIndex);

      // Check if left character should animate (entering state)
      if (leftPanel?.animationState === 'entering') {
        setLeftEnterNonce(n => n + 1);
      }

      // Check if right character should animate (entering state)
      if (rightPanel?.animationState === 'entering') {
        setRightEnterNonce(n => n + 1);
      }
    }
  }, [scrollOffset, leftPanel?.animationState, rightPanel?.animationState, prevSceneIndex]);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }}>
      {/* Left gutter column */}
      <div className="character-panel--left" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "280px", pointerEvents: "auto" }}>
        <CharacterPanel
          side="left"
          visible={!!leftPanel?.character && leftPanel?.character !== 'NOCHARACTER'}
          characterName={leftPanel?.character || null}
          previousCharacter={leftPanel?.previousCharacter || null}
          animationState={leftPanel?.animationState}
          aboutToSwap={leftPanel?.aboutToSwap}
          storyId={storyId}
          animNonce={leftEnterNonce}
        />
      </div>

      {/* Right gutter column */}
      <div className="character-panel--right" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "280px", pointerEvents: "auto" }}>
        <CharacterPanel
          side="right"
          visible={!!rightPanel?.character && rightPanel?.character !== 'NOCHARACTER'}
          characterName={rightPanel?.character || null}
          previousCharacter={rightPanel?.previousCharacter || null}
          animationState={rightPanel?.animationState}
          aboutToSwap={rightPanel?.aboutToSwap}
          storyId={storyId}
          animNonce={rightEnterNonce}
        />
      </div>
    </div>
  );
};