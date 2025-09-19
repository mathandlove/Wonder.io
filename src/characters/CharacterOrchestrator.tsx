import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { useScrollManager } from "../hooks/useScrollManager";
import type { Scene } from "../types/scene";
import type { PanelRange } from "./types";
import { buildPanelRangesFromScenes, NOCHARACTER } from "./buildPanelRangesFromScenes";
import { CharacterPanel } from "./CharacterPanel";

const DEFAULT_GUTTER = 280; // px; tune for your design
const EXIT_MS = 300; // Match CharacterPanel exit time

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

  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Determine if we need a transition animation
    const needsTransition = (
      // Character identity is changing
      (targetKey !== currentKey) &&
      // We currently have a visible character that needs to exit
      (currentPanel.visible && currentPanel.character) &&
      // We're not already in a transition
      !currentPanel.transitioning
    );


    if (needsTransition) {
      // Step 1: Keep current character visible but mark as exiting
      setPanel(prev => ({ ...prev, visible: true, exiting: true, transitioning: true }));

      // Step 2: After exit completes, switch to new character/state
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = setTimeout(() => {
        setPanel({
          visible: effectiveTargetVisible,
          character: effectiveTargetCharacter,
          speaking: effectiveTargetVisible ? targetSpeaking : false,
          transitioning: false,
          exiting: false
        });
      }, EXIT_MS);
    } else {
      // No transition needed - set directly
      setPanel({
        visible: effectiveTargetVisible,
        character: effectiveTargetCharacter,
        speaking: effectiveTargetVisible ? targetSpeaking : false,
        transitioning: false,
        exiting: false
      });
    }
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

  // Generate change keys for character/pose changes
  const changeKeys = useMemo(() => ({
    leftKey: `${leftPanel.character ?? 'none'}-default`,
    rightKey: `${rightPanel.character ?? 'none'}-default`
  }), [leftPanel.character, rightPanel.character]);

  // Publish panel widths as CSS variables based on current scene's panelRestricted value
  useLayoutEffect(() => {
    const currentSceneIndex = Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset)));
    const currentScene = scenes[currentSceneIndex] as any;
    const shouldShowPanels = currentScene?.panelRestricted ?? false;

    // Set CSS variables based on whether the current scene should be panel-restricted
    const leftWidth = shouldShowPanels ? "280px" : "0px";
    const rightWidth = shouldShowPanels ? "280px" : "0px";

    document.documentElement.style.setProperty("--panel-left-width", leftWidth);
    document.documentElement.style.setProperty("--panel-right-width", rightWidth);
  }, [scrollOffset, scenes]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);


  // Fixed overlay container
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }}>
      {/* Left gutter column */}
      <div className="character-panel--left" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "280px", pointerEvents: "auto" }}>
        <CharacterPanel
          side="left"
          visible={true}
          isSpeaking={!!leftPanel.speaking}
          characterName={leftPanel.character}
          pose={leftPanel.pose ?? null}
          storyId={storyId}
          direction={direction}
          changeKey={changeKeys.leftKey}
          exiting={!!leftPanel.exiting}
        />
      </div>

      {/* Right gutter column */}
      <div className="character-panel--right" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "280px", pointerEvents: "auto" }}>
        <CharacterPanel
          side="right"
          visible={true}
          isSpeaking={!!rightPanel.speaking}
          characterName={rightPanel.character}
          pose={rightPanel.pose ?? null}
          storyId={storyId}
          direction={direction}
          changeKey={changeKeys.rightKey}
          exiting={!!rightPanel.exiting}
        />
      </div>
    </div>
  );
};