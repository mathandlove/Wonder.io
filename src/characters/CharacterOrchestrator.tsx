import React, { useEffect, useMemo } from "react";
import { useScrollManager } from "../hooks/useScrollManager";
import type { Scene } from "../types/scene";
import type { PanelRange } from "./types";
import { buildPanelRangesFromScenes } from "./buildPanelRangesFromScenes";
import { CharacterPanel } from "./CharacterPanel";

const DEFAULT_GUTTER = 280; // px; tune for your design

type Props = { storyId: string; scenes: Scene[] };

export const CharacterOrchestrator: React.FC<Props> = ({ storyId, scenes }) => {
  const { index: scrollOffset } = useScrollManager({ setCurrentIndex: () => {} }); // continuous float in "scene units"
  const ranges = useMemo<PanelRange[]>(
    () => buildPanelRangesFromScenes(scenes),
    [scenes]
  );

  // pick active range using rounded scene index (stable with snaps)
  const active = useMemo(() => {
    if (!ranges.length) return null;
    const i = Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset)));
    return ranges.find(r => i >= r.startIndex && i <= r.endIndex) ?? null;
  }, [scrollOffset, ranges, scenes.length]);

  // set gutters via CSS vars (don't reflow via DOM)
  useEffect(() => {
    const root = document.documentElement;
    const left = active?.left?.visible ? DEFAULT_GUTTER : 0;
    const right = active?.right?.visible ? DEFAULT_GUTTER : 0;
    root.style.setProperty("--character-gutter-left", `${left}px`);
    root.style.setProperty("--character-gutter-right", `${right}px`);
  }, [active]);

  // Fixed overlay container
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }}>
      {/* Left gutter column */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "var(--character-gutter-left,0px)", pointerEvents: "auto" }}>
        <CharacterPanel
          side="left"
          visible={!!active?.left?.visible}
          isSpeaking={!!active?.left?.speaking}
          characterName={active?.left?.character ?? null}
          pose={active?.left?.pose ?? null}
          storyId={storyId}
        />
      </div>

      {/* Right gutter column */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "var(--character-gutter-right,0px)", pointerEvents: "auto" }}>
        <CharacterPanel
          side="right"
          visible={!!active?.right?.visible}
          isSpeaking={!!active?.right?.speaking}
          characterName={active?.right?.character ?? null}
          pose={active?.right?.pose ?? null}
          storyId={storyId}
        />
      </div>
    </div>
  );
};