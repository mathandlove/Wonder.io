import React, { useEffect, useMemo, useState, useRef } from "react";
import { useScrollManager } from "../hooks/useScrollManager";
import type { Scene } from "../types/scene";
import type { PanelRange } from "./types";
import { buildPanelRangesFromScenes } from "./buildPanelRangesFromScenes";
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
  const ranges = useMemo<PanelRange[]>(
    () => buildPanelRangesFromScenes(scenes),
    [scenes]
  );

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
    return ranges.find(r => i >= r.startIndex && i <= r.endIndex) ?? null;
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

    const targetKey = `${targetCharacter ?? 'none'}-default`;
    const currentKey = `${currentPanel.character ?? 'none'}-default`;

    // If character identity is changing and we currently have a visible character
    if (targetKey !== currentKey && currentPanel.visible && currentPanel.character) {
      // Step 1: Keep current character visible but mark as exiting
      setPanel(prev => ({ ...prev, visible: true, exiting: true, transitioning: true }));

      // Step 2: After exit completes, switch to new character
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = setTimeout(() => {
        setPanel({
          visible: targetVisible,
          character: targetCharacter,
          speaking: targetSpeaking,
          transitioning: false,
          exiting: false
        });
      }, EXIT_MS);
    } else {
      // No character change or no current character - set directly
      setPanel({
        visible: targetVisible,
        character: targetCharacter,
        speaking: targetSpeaking,
        transitioning: false,
        exiting: false
      });
    }
  };

  // Handle active range changes
  useEffect(() => {
    if (active) {
      transitionCharacter(
        'left',
        active.left?.character ?? null,
        !!active.left?.visible,
        !!active.left?.speaking
      );
      transitionCharacter(
        'right',
        active.right?.character ?? null,
        !!active.right?.visible,
        !!active.right?.speaking
      );
    } else {
      // No active range - hide both panels
      transitionCharacter('left', null, false);
      transitionCharacter('right', null, false);
    }
  }, [active]);

  // Generate change keys for character/pose changes
  const changeKeys = useMemo(() => ({
    leftKey: `${leftPanel.character ?? 'none'}-default`,
    rightKey: `${rightPanel.character ?? 'none'}-default`
  }), [leftPanel.character, rightPanel.character]);

  // set gutters via CSS vars (don't reflow via DOM)
  useEffect(() => {
    const root = document.documentElement;
    const left = leftPanel.visible ? DEFAULT_GUTTER : 0;
    const right = rightPanel.visible ? DEFAULT_GUTTER : 0;
    root.style.setProperty("--character-gutter-left", `${left}px`);
    root.style.setProperty("--character-gutter-right", `${right}px`);
  }, [leftPanel.visible, rightPanel.visible]);


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
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "var(--character-gutter-left,0px)", pointerEvents: "auto" }}>
        <CharacterPanel
          side="left"
          visible={leftPanel.visible}
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
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "var(--character-gutter-right,0px)", pointerEvents: "auto" }}>
        <CharacterPanel
          side="right"
          visible={rightPanel.visible}
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