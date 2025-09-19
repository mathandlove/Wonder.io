import type { Scene } from "../types/scene";
import type { PanelRange } from "./types";

/**
 * Derive Character Panel ranges from scene metadata.
 * For now: look for optional metadata on scenes:
 *   scene.meta?.panelLeft  = { character, pose, speaking?: boolean }
 *   scene.meta?.panelRight = { character, pose, speaking?: boolean }
 *   scene.meta?.allowFullBleed = boolean
 */
export function buildPanelRangesFromScenes(scenes: Scene[]): PanelRange[] {
  if (!scenes?.length) return [];
  const ranges: PanelRange[] = [];
  let current: PanelRange | null = null;

  const sameSide = (a?: any, b?: any) =>
    (!!a?.visible === !!b?.visible) &&
    (a?.character ?? null) === (b?.character ?? null) &&
    (a?.pose ?? null) === (b?.pose ?? null) &&
    (!!a?.speaking === !!b?.speaking);

  for (let i = 0; i < scenes.length; i++) {
    const s: any = scenes[i];
    const left = s?.meta?.panelLeft
      ? { visible: true, character: s.meta.panelLeft.character ?? null }
      : { visible: false, character: null };
    const right = s?.meta?.panelRight
      ? { visible: true, character: s.meta.panelRight.character ?? null }
      : { visible: false, character: null };

    // Enforce "both or none"
    const anyVisible = left.visible || right.visible;
    const normLeft  = anyVisible ? { visible: true,  character: left.character  } : { visible: false, character: null };
    const normRight = anyVisible ? { visible: true,  character: right.character } : { visible: false, character: null };

    const allowFullBleed = !!s?.meta?.allowFullBleed;

    if (
      current &&
      sameSide(current.left, normLeft) &&
      sameSide(current.right, normRight) &&
      !!current.allowFullBleed === allowFullBleed
    ) {
      current.endIndex = i;
    } else {
      if (current) ranges.push(current);
      current = {
        startIndex: i,
        endIndex: i,
        left: normLeft,
        right: normRight,
        allowFullBleed,
      };
    }
  }
  if (current) ranges.push(current);
  return ranges;
}