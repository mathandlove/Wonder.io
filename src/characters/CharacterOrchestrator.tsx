import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { useScrollManager } from "../hooks/useScrollManager";
import type { Scene } from "../types/scene";
import type { PanelRange } from "./types";
import { buildPanelRangesFromScenes, NOCHARACTER } from "./buildPanelRangesFromScenes";
import { CharacterPanel } from "./CharacterPanel";

const DEFAULT_GUTTER = 280; // px; tune for your design

type PanelState = {
  visible: boolean;
  character: string | null;
  pose?: string | null;
  speaking?: boolean;
  transitioning?: boolean;
  exiting?: boolean; // Flag to indicate character should exit
};

type Props = { storyId: string; scenes: Scene[] };

export const CharacterOrchestrator: React.FC<Props> = ({ storyId, scenes }) => {
  const { index: scrollOffset } = useScrollManager({ setCurrentIndex: () => {} }); // continuous float in "scene units"
  const ranges = useMemo<PanelRange[]>(() => {
    const builtRanges = buildPanelRangesFromScenes(scenes);


    return builtRanges;
  }, [scenes]);

  // State for managing transitions
  const [leftPanel, setLeftPanel] = useState<PanelState>({
    visible: false,
    character: null
  });
  const [rightPanel, setRightPanel] = useState<PanelState>({
    visible: false,
    character: null
  });

  // AnimNonce state for forcing animation restarts
  const [leftEnterNonce, setLeftEnterNonce] = useState(0);
  const [rightEnterNonce, setRightEnterNonce] = useState(0);
  const [prevSceneIndex, setPrevSceneIndex] = useState(0);


  // pick active range using rounded scene index (stable with snaps)
  const active = useMemo(() => {
    if (!ranges.length) return null;
    const i = Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset)));
    const activeRange = ranges.find(r => i >= r.startIndex && i <= r.endIndex) ?? null;


    return activeRange;
  }, [scrollOffset, ranges, scenes.length]);

  // Compute scroll direction
  const rounded = useMemo(() => Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset))), [scrollOffset, scenes.length]);
  const lastRoundedRef = React.useRef(rounded);
  const direction = rounded > lastRoundedRef.current ? 'down' : rounded < lastRoundedRef.current ? 'up' : 'none';
  React.useEffect(() => { lastRoundedRef.current = rounded; }, [rounded]);

  // Helper function to handle character transitions
  const transitionCharacter = (
    side: 'left' | 'right',
    targetCharacter: string | null,
    targetVisible: boolean,
    targetSpeaking?: boolean
  ) => {
    const currentPanel = side === 'left' ? leftPanel : rightPanel;
    const setPanel = side === 'left' ? setLeftPanel : setRightPanel;

    // Handle NOCHARACTER as a request to hide the panel
    const isTargetNoCharacter = targetCharacter === NOCHARACTER;
    const effectiveTargetVisible = targetVisible && !isTargetNoCharacter;
    const effectiveTargetCharacter = isTargetNoCharacter ? null : targetCharacter;

    const targetKey = `${effectiveTargetCharacter ?? 'none'}-default`;
    const currentKey = `${currentPanel.character ?? 'none'}-default`;

    // Determine if character is changing
    const isCharacterChanging = (targetKey !== currentKey);

    // Set panel state immediately - let CSS animations handle timing
    setPanel({
      visible: effectiveTargetVisible,
      character: effectiveTargetCharacter,
      speaking: effectiveTargetVisible ? targetSpeaking : false,
      transitioning: isCharacterChanging,
      exiting: false
    });
  };

  // Handle active range changes
  useEffect(() => {
    if (active) {
      // Character-type scene - panels are always visible
      transitionCharacter(
        'left',
        active.left?.character ?? null,
        true, // Always visible for character scenes
        !!active.left?.speaking
      );
      transitionCharacter(
        'right',
        active.right?.character ?? null,
        true, // Always visible for character scenes
        !!active.right?.speaking
      );
    } else {
      // No active range - keep current characters but hide panels
      transitionCharacter('left', leftPanel.character, false);
      transitionCharacter('right', rightPanel.character, false);
    }
  }, [active]);

  // Track when we've scrolled to a new scene and trigger animation restart
  useEffect(() => {
    const currentSceneIndex = Math.round(scrollOffset);

    // Check if we've moved to a different scene
    if (currentSceneIndex !== prevSceneIndex) {
      setPrevSceneIndex(currentSceneIndex);

      // Forward scrolling: animate on entering state (transitioning)
      if (direction === 'down') {
        if (leftPanel.transitioning) {
          setLeftEnterNonce(n => n + 1);
        }
        if (rightPanel.transitioning) {
          setRightEnterNonce(n => n + 1);
        }
      } else if (direction === 'up') {
        // Backward scrolling: animate on transitioning as well
        if (leftPanel.transitioning) {
          setLeftEnterNonce(n => n + 1);
        }
        if (rightPanel.transitioning) {
          setRightEnterNonce(n => n + 1);
        }
      }
    }
  }, [scrollOffset, leftPanel.transitioning, rightPanel.transitioning, prevSceneIndex, direction]);

  // Generate change keys for character/pose changes
  const changeKeys = useMemo(() => ({
    leftKey: `${leftPanel.character ?? 'none'}-default`,
    rightKey: `${rightPanel.character ?? 'none'}-default`
  }), [leftPanel.character, rightPanel.character]);

  // Publish panel widths as CSS variables to constrain main content
  useLayoutEffect(() => {
    const updatePanelWidths = () => {
      const currentSceneIndex = Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset)));
      const currentScene = scenes[currentSceneIndex] as any;
      const shouldShowPanels = currentScene?.panelRestricted ?? false;

      // Always calculate panel widths to constrain center to 600px
      const panelWidth = Math.max(280, (window.innerWidth - 600) / 2);
      const leftWidth = shouldShowPanels ? `${panelWidth}px` : "0px";
      const rightWidth = shouldShowPanels ? `${panelWidth}px` : "0px";

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
          characterName={leftPanel.character}
          pose={leftPanel.pose ?? null}
          storyId={storyId}
          animationState={leftPanel.transitioning ? 'entering' : (leftPanel.speaking ? 'speaking' : 'idle')}
          aboutToSwap={!!leftPanel.transitioning}
          scrollDirection={direction === 'down' ? 'forward' : 'backward'}
          animNonce={leftEnterNonce}
        />
      </div>

      {/* Right gutter column - expands to take available space */}
      <div className="character-panel--right" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "calc((100vw - 600px) / 2)", minWidth: "280px", pointerEvents: "auto" }}>
        <CharacterPanel
          side="right"
          visible={true}
          characterName={rightPanel.character}
          pose={rightPanel.pose ?? null}
          storyId={storyId}
          animationState={rightPanel.transitioning ? 'entering' : (rightPanel.speaking ? 'speaking' : 'idle')}
          aboutToSwap={!!rightPanel.transitioning}
          scrollDirection={direction === 'down' ? 'forward' : 'backward'}
          animNonce={rightEnterNonce}
        />
      </div>
    </div>
  );
};