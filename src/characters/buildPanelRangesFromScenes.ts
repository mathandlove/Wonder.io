import type { Scene } from "../types/scene";
import type { PanelRange } from "./types";

// Special character name to indicate explicit "no character" state
// cspell:ignore NOCHARACTER
export const NOCHARACTER = "NOCHARACTER";

/**
 * Derive Character Panel ranges from scene metadata.
 * For now: look for optional metadata on scenes:
 *   scene.meta?.panelLeft  = { character, pose, speaking?: boolean }
 *   scene.meta?.panelRight = { character, pose, speaking?: boolean }
 */
export function buildPanelRangesFromScenes(scenes: Scene[]): PanelRange[] {
  if (!scenes?.length) return [];


  const ranges: PanelRange[] = [];
  let current: PanelRange | null = null;

  const sameSide = (a?: any, b?: any): boolean => {
    const visibleSame = (!!a?.visible === !!b?.visible);
    const characterSame = (a?.character ?? null) === (b?.character ?? null);
    const poseSame = (a?.pose ?? null) === (b?.pose ?? null);
    const speakingSame = (!!a?.speaking === !!b?.speaking);

    // Special handling for NOCHARACTER - it should never match with real characters
    const aChar = a?.character ?? null;
    const bChar = b?.character ?? null;
    const hasNoCharacterMismatch = (aChar === NOCHARACTER && bChar !== NOCHARACTER) ||
                                   (bChar === NOCHARACTER && aChar !== NOCHARACTER);

    return visibleSame && characterSame && poseSame && speakingSame && !hasNoCharacterMismatch;
  };

  for (let i = 0; i < scenes.length; i++) {
    const s: any = scenes[i];

    // Determine if this scene type should show panels
    const characterSceneTypes = ['character', 'quest', 'input'];
    const isCharacterTypeScene = characterSceneTypes.includes(s?.type) || s?.flowSequence === true;
    const speaker = s?.speaker || null;

    // Check if this is a NEW flow (should reset character state)
    const isNewFlow = s?.newFlow === true;

    // If this is not a character-type scene, skip panel creation entirely
    if (!isCharacterTypeScene) {
      continue;
    }

    // For character-type scenes, determine character visibility and speaking state
    const hasLeftCharacter = s?.meta?.panelLeft?.character || s['left-character'];
    const hasRightCharacter = s?.meta?.panelRight?.character || s['right-character'];

    const left = s?.meta?.panelLeft
      ? {
          visible: true,
          character: s.meta.panelLeft.character ?? NOCHARACTER,
          speaking: s.meta.panelLeft.speaking !== undefined ? s.meta.panelLeft.speaking : (speaker === 'left')
        }
      : hasLeftCharacter
      ? {
          visible: true,
          character: s['left-character'],
          speaking: speaker === 'left'
        }
      : {
          visible: true, // Always visible for character scenes to maintain symmetry
          character: NOCHARACTER,
          speaking: false
        };

    const right = s?.meta?.panelRight
      ? {
          visible: true,
          character: s.meta.panelRight.character ?? NOCHARACTER,
          speaking: s.meta.panelRight.speaking !== undefined ? s.meta.panelRight.speaking : (speaker === 'right')
        }
      : hasRightCharacter
      ? {
          visible: true,
          character: s['right-character'],
          speaking: speaker === 'right'
        }
      : {
          visible: true, // Always visible for character scenes to maintain symmetry
          character: NOCHARACTER,
          speaking: false
        };

    // Keep each side independent
    const normLeft = left;
    const normRight = right;

    const shouldContinueRange = current &&
      sameSide(current.left, normLeft) &&
      sameSide(current.right, normRight);




    if (shouldContinueRange) {
      current.endIndex = i;
    } else {
      if (current) {
        ranges.push(current);
      }
      current = {
        startIndex: i,
        endIndex: i,
        left: normLeft,
        right: normRight,
      };
    }
  }
  if (current) {
    ranges.push(current);
  }


  return ranges;
}