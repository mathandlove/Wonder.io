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
  const [prevScrollOffset, setPrevScrollOffset] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'forward' | 'backward'>('forward');

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

  // Detect scroll direction
  useEffect(() => {
    if (scrollOffset !== prevScrollOffset) {
      setScrollDirection(scrollOffset > prevScrollOffset ? 'forward' : 'backward');
      setPrevScrollOffset(scrollOffset);
    }
  }, [scrollOffset, prevScrollOffset]);

  // Track when we've scrolled to a new scene and trigger animation restart
  useEffect(() => {
    const currentSceneIndex = Math.round(scrollOffset);

    // Check if we've moved to a different scene
    if (currentSceneIndex !== prevSceneIndex) {
      setPrevSceneIndex(currentSceneIndex);

      if (scrollDirection === 'forward') {
        // Forward scrolling: animate on entering state
        if (leftPanel?.animationState === 'entering') {
          setLeftEnterNonce(n => n + 1);
        }
        if (rightPanel?.animationState === 'entering') {
          setRightEnterNonce(n => n + 1);
        }
      } else {
        // Backward scrolling: animate on aboutToSwap
        if (leftPanel?.aboutToSwap) {
          setLeftEnterNonce(n => n + 1);
        }
        if (rightPanel?.aboutToSwap) {
          setRightEnterNonce(n => n + 1);
        }
      }
    }
  }, [scrollOffset, leftPanel?.animationState, rightPanel?.animationState, leftPanel?.aboutToSwap, rightPanel?.aboutToSwap, prevSceneIndex, scrollDirection]);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }}>
      {/* Left gutter column */}
      <div className="character-panel--left" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "280px", pointerEvents: "auto" }}>
        <CharacterPanel
          side="left"
          visible={!!leftPanel?.character && leftPanel?.character !== 'NOCHARACTER'}
          characterName={leftPanel?.character || null}
          previousCharacter={leftPanel?.previousCharacter || null}
          nextCharacter={leftPanel?.nextCharacter || null}
          animationState={leftPanel?.animationState}
          aboutToSwap={leftPanel?.aboutToSwap}
          scrollDirection={scrollDirection}
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
          nextCharacter={rightPanel?.nextCharacter || null}
          animationState={rightPanel?.animationState}
          aboutToSwap={rightPanel?.aboutToSwap}
          scrollDirection={scrollDirection}
          storyId={storyId}
          animNonce={rightEnterNonce}
        />
      </div>
    </div>
  );
};