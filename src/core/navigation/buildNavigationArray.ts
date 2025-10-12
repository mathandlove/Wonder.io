/**
 * buildNavigationArray - Converts scenes into a flat navigation array
 *
 * Takes story scenes and expands them into NavigationItems based on:
 * - Scene type (image, dialogue, text, etc.)
 * - States field (for character-flow scenes with quest/input)
 * - Caption presence (for image scenes)
 *
 * Each NavigationItem represents one "scroll stop" in the story.
 */

import type { Scene } from '@core/types/scene';
import type { NavigationItem, SceneState } from './types';
import { ulid } from 'ulid';

/**
 * Main builder function - converts scenes to navigation array
 */
export function buildNavigationArray(scenes: Scene[]): NavigationItem[] {
  const navigationArray: NavigationItem[] = [];
  let navigationIndex = 0;

  for (const scene of scenes) {
    // Skip hidden scenes
    if (scene.hidden) continue;

    // Ensure scene has an ID
    const sceneId = scene.sceneId || ulid();

    // Expand scene into navigation items based on type
    const items = expandScene(scene, sceneId, navigationIndex);
    navigationArray.push(...items);
    navigationIndex += items.length;
  }

  return navigationArray;
}

/**
 * Expands a single scene into one or more navigation items
 */
function expandScene(scene: Scene, sceneId: string, startIndex: number): NavigationItem[] {
  switch (scene.type) {
    case 'image':
      return expandImageScene(scene, sceneId, startIndex);

    case 'character-flow':
      return expandCharacterFlowScene(scene, sceneId, startIndex);

    // Simple scenes with no substates
    case 'text':
    case 'character':
    case 'full':
    case 'caption':
    case 'interactive-bubble':
      return [createSimpleNavigationItem(scene, sceneId, startIndex)];

    default:
      console.warn('Unknown scene type:', (scene as any).type);
      return [createSimpleNavigationItem(scene, sceneId, startIndex)];
  }
}

/**
 * Image scene expansion - creates hidden/showing states if caption exists
 */
function expandImageScene(scene: Scene & { caption?: string; text?: string }, sceneId: string, startIndex: number): NavigationItem[] {
  const captionText = scene.caption || scene.text;
  const hasCaption = captionText && captionText.trim() !== '';

  if (hasCaption) {
    // Image with caption: 2 states
    return [
      {
        scene,
        sceneId,
        sceneState: { type: 'image', state: 'hidden' },
        lockForward: true,
        lockBackward: false,
        index: startIndex,
      },
      {
        scene,
        sceneId,
        sceneState: { type: 'image', state: 'showing' },
        lockForward: false,
        lockBackward: false,
        index: startIndex + 1,
      },
    ];
  }

  // Image without caption: simple
  return [{
    scene,
    sceneId,
    sceneState: { type: 'simple' },
    lockForward: false,
    lockBackward: false,
    index: startIndex,
  }];
}

/**
 * Character-flow scene expansion - checks flow items for States field
 * States field controls which interactive features appear (quest/input)
 */
function expandCharacterFlowScene(scene: Scene & { flow: Array<{ States?: string[] }> }, sceneId: string, startIndex: number): NavigationItem[] {
  // Check if any flow item has States field with features
  const flowItemWithStates = scene.flow.find(item => item.States && item.States.length > 0);

  if (flowItemWithStates && flowItemWithStates.States) {
    // Has interactive features - expand based on States array
    const states = flowItemWithStates.States;
    const hasQuest = states.includes('quest');
    const hasInput = states.includes('input');

    return expandDialogueStates(scene, sceneId, startIndex, { hasQuest, hasInput });
  }

  // Simple character-flow scene without interactive features
  return [{
    scene,
    sceneId,
    sceneState: { type: 'simple' },
    lockForward: false,
    lockBackward: false,
    index: startIndex,
  }];
}

/**
 * Expands a dialogue scene with States into full state machine
 * States: ["quest", "input"] or ["input"] or ["quest"]
 *
 * Flow depends on which features are enabled:
 * - hasQuest + hasInput: pre-feature → show-quest → input-ready → input-recording → ai-waiting → basic
 * - hasInput only: pre-feature → input-ready → input-recording → ai-waiting → basic
 * - hasQuest only: pre-feature → show-quest → basic
 */
function expandDialogueStates(
  scene: Scene,
  sceneId: string,
  startIndex: number,
  features: { hasQuest: boolean; hasInput: boolean }
): NavigationItem[] {
  const items: NavigationItem[] = [];
  let currentIndex = startIndex;

  // 1. Pre-feature state (dialogue shows, feature not yet revealed)
  items.push({
    scene,
    sceneId,
    sceneState: { type: 'dialogue', state: 'pre-feature' },
    lockForward: true,
    lockBackward: false,
    index: currentIndex++,
  });

  // 2. Show quest if quest feature enabled
  if (features.hasQuest) {
    items.push({
      scene,
      sceneId,
      sceneState: { type: 'dialogue', state: 'show-quest' },
      lockForward: true,
      lockBackward: true,
      index: currentIndex++,
    });
  }

  // 3-5. Input flow if input feature enabled
  if (features.hasInput) {
    items.push({
      scene,
      sceneId,
      sceneState: { type: 'dialogue', state: 'input-ready' },
      lockForward: true,
      lockBackward: false,
      index: currentIndex++,
    });

    items.push({
      scene,
      sceneId,
      sceneState: { type: 'dialogue', state: 'input-recording' },
      lockForward: true,
      lockBackward: false,
      index: currentIndex++,
    });

    items.push({
      scene,
      sceneId,
      sceneState: { type: 'dialogue', state: 'ai-waiting' },
      lockForward: true,
      lockBackward: false,
      index: currentIndex++,
    });
  }

  // 6. Final basic state (all features completed)
  items.push({
    scene,
    sceneId,
    sceneState: { type: 'dialogue', state: 'basic' },
    lockForward: false,
    lockBackward: false,
    index: currentIndex++,
  });

  return items;
}

/**
 * Creates a simple navigation item for scenes with no substates
 */
function createSimpleNavigationItem(scene: Scene, sceneId: string, index: number): NavigationItem {
  return {
    scene,
    sceneId,
    sceneState: { type: 'simple' },
    lockForward: false,
    lockBackward: false,
    index,
  };
}
