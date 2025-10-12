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

import type { Scene, CharacterFlowScene } from '@core/types/scene';
import type { NavigationItem } from './types';
import { ulid } from 'ulid';

/**
 * Main builder function - converts scenes to navigation array
 */
export function buildNavigationArray(scenes: Scene[]): NavigationItem[] {
  console.log('🏗️ buildNavigationArray called with', scenes.length, 'scenes');
  console.log('📋 Scene types:', scenes.map(s => s.type));

  const navigationArray: NavigationItem[] = [];
  let navigationIndex = 0;

  for (const scene of scenes) {
    // Skip hidden scenes
    if (scene.hidden) continue;

    // Ensure scene has an ID
    const sceneId = scene.sceneId || ulid();

    console.log(`\n🔨 Processing scene: type=${scene.type}, sceneId=${sceneId}`);

    // Expand scene into navigation items based on type
    const items = expandScene(scene, sceneId, navigationIndex);
    console.log(`  ✨ Expanded into ${items.length} navigation item(s)`);

    navigationArray.push(...items);
    navigationIndex += items.length;
  }

  console.log(`\n✅ Built navigation array with ${navigationArray.length} total items`);
  console.log('📊 Navigation breakdown:', navigationArray.map((item, idx) => ({
    index: idx,
    sceneId: item.sceneId,
    sceneType: item.scene.type,
    stateType: item.sceneState.type,
    state: item.sceneState.type === 'dialogue' || item.sceneState.type === 'image' ? (item.sceneState as any).state : 'n/a'
  })));

  return navigationArray;
}

/**
 * Expands a single scene into one or more navigation items
 */
function expandScene(scene: Scene, sceneId: string, startIndex: number): NavigationItem[] {
  switch (scene.type) {
    case 'image':
      return expandImageScene(scene, sceneId, startIndex);

    case 'character': {
      // Check if this character scene has States field (from character-flow flattening)
      const characterScene = scene as Scene & { States?: string[] };
      if (characterScene.States && characterScene.States.length > 0) {
        return expandCharacterWithStates(characterScene as Scene & { States: string[] }, sceneId, startIndex);
      }
      return [createSimpleNavigationItem(scene, sceneId, startIndex)];
    }

    case 'character-flow':
      return expandCharacterFlowScene(scene, sceneId, startIndex);

    // Simple scenes with no substates
    case 'text':
    case 'full':
    case 'caption':
    case 'interactive-bubble':
      return [createSimpleNavigationItem(scene, sceneId, startIndex)];

    default:
      console.warn('Unknown scene type:', (scene as { type?: string }).type);
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
 * Character scene with States expansion - for flattened character-flow scenes
 * States field controls which interactive features appear (quest/input)
 */
function expandCharacterWithStates(scene: Scene & { States: string[] }, sceneId: string, startIndex: number): NavigationItem[] {
  const states = scene.States;
  const hasQuest = states.includes('quest');
  const hasInput = states.includes('input');

  console.log('🔍 expandCharacterWithStates:', { sceneId, states, hasQuest, hasInput });

  return expandDialogueStates(scene, sceneId, startIndex, { hasQuest, hasInput });
}

/**
 * Character-flow scene expansion - checks flow items for States field
 * States field controls which interactive features appear (quest/input)
 */
function expandCharacterFlowScene(scene: CharacterFlowScene, sceneId: string, startIndex: number): NavigationItem[] {
  // Check if any flow item has States field with features
  const flowItemWithStates = scene.flow.find(item => item.States && item.States.length > 0);

  console.log('🔍 expandCharacterFlowScene:', { sceneId, flowItemWithStates, flow: scene.flow });

  if (flowItemWithStates && flowItemWithStates.States) {
    // Has interactive features - expand based on States array
    const states = flowItemWithStates.States;
    const hasQuest = states.includes('quest');
    const hasInput = states.includes('input');

    console.log('✅ Found States:', { states, hasQuest, hasInput });
    return expandDialogueStates(scene, sceneId, startIndex, { hasQuest, hasInput });
  }

  console.log('⚠️ No States found, creating simple nav item');
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
 * Expands a dialogue scene with States into navigation items
 * States: ["quest", "input"] or ["input"] or ["quest"]
 *
 * Flow depends on which features are enabled:
 * - hasInput only: input-basic → input-showInput → [new scene: input-recording]
 * - hasQuest only: quest-basic → quest-showing
 * - hasQuest + hasInput: quest-basic → quest-showing → input-basic → input-showInput → [new scene: input-recording]
 */
function expandDialogueStates(
  scene: Scene,
  sceneId: string,
  startIndex: number,
  features: { hasQuest: boolean; hasInput: boolean }
): NavigationItem[] {
  const items: NavigationItem[] = [];
  let currentIndex = startIndex;

  // Quest flow
  if (features.hasQuest) {
    items.push({
      scene,
      sceneId,
      sceneState: { type: 'dialogue', state: 'quest-basic' },
      lockForward: true,
      lockBackward: false,
      index: currentIndex++,
    });

    items.push({
      scene,
      sceneId,
      sceneState: { type: 'dialogue', state: 'quest-showing' },
      lockForward: true,
      lockBackward: false,
      index: currentIndex++,
    });
  }

  // Input flow
  if (features.hasInput) {
    // 1. Input-basic: Show dialogue with text
    items.push({
      scene,
      sceneId,
      sceneState: { type: 'dialogue', state: 'input-basic' },
      lockForward: true,
      lockBackward: false,
      index: currentIndex++,
    });

    // 2. Input-showInput: Show input UI (microphone button)
    items.push({
      scene,
      sceneId,
      sceneState: { type: 'dialogue', state: 'input-showInput' },
      lockForward: true,
      lockBackward: false,
      index: currentIndex++,
    });

    // 3. Create a new scene for user recording (in the same flow)
    // Copy the entire character scene, changing sceneId, text, and speaker position
    const recordingSceneId = `${sceneId}-recording`;
    const recordingScene: Scene = {
      ...(scene as Record<string, unknown>),
      sceneId: recordingSceneId,
      text: 'Sup?', // Empty text - user will record their own
      speaker: 'left', // Position speech bubble on the left side for user
    } as Scene;

    items.push({
      scene: recordingScene,
      sceneId: recordingSceneId,
      sceneState: { type: 'dialogue', state: 'input-recording' },
      lockForward: true,
      lockBackward: false,
      index: currentIndex++,
    });
  }
    

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
