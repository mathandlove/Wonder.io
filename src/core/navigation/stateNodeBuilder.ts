/**
 * State Node Builder - Converts scenes into a linked graph of state nodes
 *
 * Core Responsibilities:
 * 1. Expand scenes into their constituent state nodes (enter, speak, exit, dialogue substates)
 * 2. Generate stable unique IDs for each state node (using ulid)
 * 3. Link nodes within scenes (prev/next pointers)
 * 4. Link between scenes (scene tail → next scene head)
 * 5. Build scene registry for O(1) scene-range operations
 *
 * Key Principle: IDs are generated once and never change - React keys depend on this stability
 */

import { ulid } from 'ulid';
import type { Scene, CharacterFlowScene } from '@core/types/scene';
import type {
  StateNode,
  StateNodeId,
  SceneId,
  NavigatorState,
  SceneRegistry,
  SceneInfo,
} from './stateNodeTypes';
import type { SceneState } from './types';

/**
 * Build a complete navigator state from an array of scenes
 *
 * This is the main entry point for converting the flat scene array
 * into a doubly-linked graph of state nodes.
 *
 * Process:
 * 1. Filter out hidden scenes
 * 2. For each scene, expand into state nodes based on type
 * 3. Link nodes within each scene
 * 4. Link between scenes
 * 5. Build scene registry for fast lookups
 *
 * @param scenes - Array of story scenes
 * @returns Complete NavigatorState with linked graph
 */
export function buildStateNodeGraph(scenes: Scene[]): NavigatorState {
  const byId: Record<StateNodeId, StateNode> = {};
  const order: StateNodeId[] = [];
  const sceneRegistry: SceneRegistry = {
    byId: {},
    order: [],
  };

  let previousNodeId: StateNodeId | null = null;
  let sceneIndex = 0;

  console.log('[buildStateNodeGraph] 🏗️  Starting build with', scenes.filter(s => !s.hidden).length, 'visible scenes');

  // Process each scene
  for (const scene of scenes) {
    // Skip hidden scenes
    if (scene.hidden) continue;

    // Ensure scene has an ID
    const sceneId: SceneId = scene.sceneId || ulid();

    // Expand scene into state nodes
    const sceneNodes = expandSceneToStateNodes(scene, sceneId);

    if (sceneNodes.length === 0) continue;

    // Track first and last nodes for scene registry
    const firstNodeId = sceneNodes[0].id;
    const lastNodeId = sceneNodes[sceneNodes.length - 1].id;

    console.log(`[buildStateNodeGraph] Scene ${sceneIndex}: ${scene.type} → ${sceneNodes.length} nodes`);

    // Link nodes within the scene
    for (let i = 0; i < sceneNodes.length; i++) {
      const node = sceneNodes[i];

      // Set prevId - either previous node in scene or cross-scene link
      node.prevId = i === 0 ? previousNodeId : sceneNodes[i - 1].id;

      // Set nextId - will be updated for last node after we process next scene
      node.nextId = i === sceneNodes.length - 1 ? null : sceneNodes[i + 1].id;

      // Add to global structures
      byId[node.id] = node;
      order.push(node.id);
    }

    // Link previous scene's tail to this scene's head
    if (previousNodeId !== null && byId[previousNodeId]) {
      const prevNode = byId[previousNodeId];
      console.log(`[buildStateNodeGraph] 🔗 Cross-scene link: ${prevNode.stateKey} → ${sceneNodes[0].stateKey}`);
      byId[previousNodeId].nextId = firstNodeId;

      // Verify the link was set
      console.log(`[buildStateNodeGraph] ✓ Verified: ${byId[previousNodeId].nextId === firstNodeId ? 'SUCCESS' : 'FAILED'}`);
    }

    // Update previousNodeId for next iteration
    previousNodeId = lastNodeId;

    // Add to scene registry
    sceneRegistry.byId[sceneId] = {
      id: sceneId,
      firstNodeId,
      lastNodeId,
      nodeCount: sceneNodes.length,
    };
    sceneRegistry.order.push(sceneId);
    sceneIndex++;
  }

  // Final verification - check first 3 nodes
  console.log('[buildStateNodeGraph] 📊 First 3 nodes:');
  for (let i = 0; i < Math.min(3, order.length); i++) {
    const node = byId[order[i]];
    console.log(`  Node ${i}: ${node.stateKey}`, {
      prevId: node.prevId ? '✓' : 'null',
      nextId: node.nextId ? '✓' : 'null',
    });
  }

  return {
    byId,
    order,
    currentId: order.length > 0 ? order[0] : null,
    historyVersion: 0,
    sceneRegistry,
  };
}

/**
 * Expand a single scene into one or more state nodes
 *
 * Different scene types expand differently:
 * - Image scenes: may have "hidden" and "showing" states (if caption exists)
 * - Character scenes: may have dialogue substates (quest/input features)
 * - Character-flow scenes: expanded based on flow items with States field
 * - Simple scenes (text, full): single state node
 *
 * @param scene - Scene to expand
 * @param sceneId - Stable scene identifier
 * @returns Array of state nodes (not yet linked)
 */
function expandSceneToStateNodes(scene: Scene, sceneId: SceneId): StateNode[] {
  switch (scene.type) {
    case 'image':
      return expandImageScene(scene, sceneId);

    case 'character': {
      // Check if this character scene has States field (from character-flow flattening)
      const characterScene = scene as Scene & { States?: string[] };
      if (characterScene.States && characterScene.States.length > 0) {
        return expandCharacterWithStates(characterScene as Scene & { States: string[] }, sceneId);
      }
      return [createSimpleStateNode(scene, sceneId, 'dialogue:basic', { type: 'dialogue', state: 'basic' })];
    }

    case 'character-flow':
      return expandCharacterFlowScene(scene, sceneId);

    case 'text':
    case 'full':
      return [createSimpleStateNode(scene, sceneId, 'static', { type: 'static' })];

    case 'fail-dance':
      return [createSimpleStateNode(scene, sceneId, 'dance:fail', { type: 'dialogue', state: 'answer-wrong' })];

    case 'success-dance':
      return [createSimpleStateNode(scene, sceneId, 'dance:success', { type: 'dialogue', state: 'answer-right' })];

    default:
      console.warn('Unknown scene type:', (scene as { type?: string }).type);
      return [createSimpleStateNode(scene, sceneId, 'unknown', { type: 'static' })];
  }
}

/**
 * Image scene expansion - creates hidden/showing states if caption exists
 */
function expandImageScene(scene: Scene & { caption?: string; text?: string }, sceneId: SceneId): StateNode[] {
  const captionText = scene.caption || scene.text;
  const hasCaption = captionText && captionText.trim() !== '';

  if (hasCaption) {
    // Image with caption: 2 states (hidden → showing)
    return [
      createStateNode(
        scene,
        sceneId,
        'image:hidden',
        { type: 'image', state: 'hidden' },
        { lockForward: false, lockBackward: false }
      ),
      createStateNode(
        scene,
        sceneId,
        'image:showing',
        { type: 'image', state: 'showing' },
        { lockForward: false, lockBackward: false }
      ),
    ];
  }

  // Image without caption: single state
  return [
    createStateNode(
      scene,
      sceneId,
      'image:basic',
      { type: 'dialogue', state: 'basic' },
      { lockForward: false, lockBackward: false }
    ),
  ];
}

/**
 * Character scene with States expansion - for flattened character-flow scenes
 * States field controls which interactive features appear (quest/input)
 */
function expandCharacterWithStates(scene: Scene & { States: string[] }, sceneId: SceneId): StateNode[] {
  const states = scene.States;
  const hasQuest = states.includes('quest') || states.includes('giveQuest');
  const hasInput = states.includes('input');

  return expandDialogueStates(scene, sceneId, { hasQuest, hasInput });
}

/**
 * Character-flow scene expansion - checks flow items for States field
 */
function expandCharacterFlowScene(scene: CharacterFlowScene, sceneId: SceneId): StateNode[] {
  const flowItemWithStates = scene.flow.find(item => item.States && item.States.length > 0);

  if (flowItemWithStates && flowItemWithStates.States) {
    const states = flowItemWithStates.States;
    const hasQuest = states.includes('quest') || states.includes('giveQuest');
    const hasInput = states.includes('input');

    return expandDialogueStates(scene, sceneId, { hasQuest, hasInput });
  }

  // Character-flow without features - basic dialogue
  return [
    createStateNode(
      scene,
      sceneId,
      'dialogue:basic',
      { type: 'dialogue', state: 'basic' },
      { lockForward: false, lockBackward: false }
    ),
  ];
}

/**
 * Expands dialogue states based on interactive features (quest/input)
 *
 * Flow patterns:
 * - hasInput only: input-basic → input-showInput
 * - hasQuest only: quest-basic → quest-showing → quest-accepted
 * - hasQuest + hasInput: quest-basic → quest-showing → input-showInput
 */
function expandDialogueStates(
  scene: Scene,
  sceneId: SceneId,
  features: { hasQuest: boolean; hasInput: boolean }
): StateNode[] {
  const nodes: StateNode[] = [];

  // Combined quest + input flow
  if (features.hasQuest && features.hasInput) {
    nodes.push(
      createStateNode(
        scene,
        sceneId,
        'dialogue:quest-basic',
        { type: 'dialogue', state: 'basic' },
        { lockForward: false, lockBackward: false }
      ),
      createStateNode(
        scene,
        sceneId,
        'dialogue:quest-showing',
        { type: 'dialogue', state: 'quest-showing' },
        { lockForward: true, lockBackward: true } // Block until quest accepted
      ),
      createStateNode(
        scene,
        sceneId,
        'dialogue:input-showInput',
        { type: 'dialogue', state: 'input-showInput' },
        { lockForward: true, lockBackward: false } // Block until recording
      )
    );
  }
  // Quest-only flow
  else if (features.hasQuest) {
    nodes.push(
      createStateNode(
        scene,
        sceneId,
        'dialogue:quest-basic',
        { type: 'dialogue', state: 'quest-basic' },
        { lockForward: false, lockBackward: false }
      ),
      createStateNode(
        scene,
        sceneId,
        'dialogue:quest-showing',
        { type: 'dialogue', state: 'quest-showing' },
        { lockForward: true, lockBackward: true }
      ),
      createStateNode(
        scene,
        sceneId,
        'dialogue:quest-accepted',
        { type: 'dialogue', state: 'quest-accepted' },
        { lockForward: false, lockBackward: false }
      )
    );
  }
  // Input-only flow
  else if (features.hasInput) {
    nodes.push(
      createStateNode(
        scene,
        sceneId,
        'dialogue:input-basic',
        { type: 'dialogue', state: 'input-basic' },
        { lockForward: false, lockBackward: false }
      ),
      createStateNode(
        scene,
        sceneId,
        'dialogue:input-showInput',
        { type: 'dialogue', state: 'input-showInput' },
        { lockForward: true, lockBackward: false }
      )
    );
  }

  return nodes;
}

/**
 * Create a state node with computed locks from scene state
 *
 * @param scene - Original scene data
 * @param sceneId - Stable scene identifier
 * @param stateKey - Semantic key for this state
 * @param sceneState - Full scene state object
 * @param overrideLocks - Optional lock overrides (for builder control)
 * @returns Complete StateNode (not yet linked)
 */
function createStateNode(
  scene: Scene,
  sceneId: SceneId,
  stateKey: string,
  sceneState: SceneState,
  overrideLocks?: { lockForward?: boolean; lockBackward?: boolean }
): StateNode {
  // Compute locks from scene state if not overridden
  const locks = overrideLocks || getLocksForState(sceneState);

  return {
    id: ulid(), // Stable unique ID
    sceneId,
    stateKey,
    sceneState,
    scene, // Store full scene object
    stateMeta: {},
    prevId: null, // Will be set during linking
    nextId: null, // Will be set during linking
    status: 'active',
    lockForward: locks.lockForward,
    lockBackward: locks.lockBackward,
  };
}

/**
 * Create a simple state node for scenes without substates
 */
function createSimpleStateNode(
  scene: Scene,
  sceneId: SceneId,
  stateKey: string,
  sceneState: SceneState
): StateNode {
  return createStateNode(scene, sceneId, stateKey, sceneState, {
    lockForward: false,
    lockBackward: false,
  });
}

/**
 * Determine scroll locks based on scene state
 * (Extracted from SceneManager.tsx getLocksForState)
 */
function getLocksForState(state: SceneState): { lockForward: boolean; lockBackward: boolean } {
  if (state.type === 'static') {
    return { lockForward: false, lockBackward: false };
  }

  if (state.type === 'image') {
    return { lockForward: false, lockBackward: false };
  }

  if (state.type === 'dialogue') {
    switch (state.state) {
      case 'quest-showing':
        return { lockForward: true, lockBackward: true };

      case 'input-basic':
        return { lockForward: false, lockBackward: false };

      case 'input-showInput':
        return { lockForward: true, lockBackward: false };

      case 'input-recording':
      case 'input-processing':
      case 'ai-waiting':
        return { lockForward: true, lockBackward: true };

      case 'record-answer':
      case 'waiting-for-answer-finalize':
        return { lockForward: true, lockBackward: true };

      case 'answer-processing':
      case 'answer-waiting':
      case 'answer-right':
      case 'answer-wrong':
        return { lockForward: true, lockBackward: true };

      default:
        return { lockForward: false, lockBackward: false };
    }
  }

  return { lockForward: false, lockBackward: false };
}

/**
 * Helper: Get node by ID with safe fallback
 */
export function getNodeById(
  navigatorState: NavigatorState,
  nodeId: StateNodeId | null
): StateNode | null {
  if (!nodeId) return null;
  return navigatorState.byId[nodeId] || null;
}

/**
 * Helper: Get previous node (pointer traversal)
 */
export function getPrevNode(navigatorState: NavigatorState, nodeId: StateNodeId): StateNode | null {
  const node = getNodeById(navigatorState, nodeId);
  if (!node) return null;
  return getNodeById(navigatorState, node.prevId);
}

/**
 * Helper: Get next node (pointer traversal)
 */
export function getNextNode(navigatorState: NavigatorState, nodeId: StateNodeId): StateNode | null {
  const node = getNodeById(navigatorState, nodeId);
  if (!node) return null;
  return getNodeById(navigatorState, node.nextId);
}

/**
 * Helper: Get current active node
 */
export function getCurrentNode(navigatorState: NavigatorState): StateNode | null {
  return getNodeById(navigatorState, navigatorState.currentId);
}

/**
 * Helper: Find first node of a scene
 */
export function getFirstNodeOfScene(navigatorState: NavigatorState, sceneId: SceneId): StateNode | null {
  const sceneInfo = navigatorState.sceneRegistry?.byId[sceneId];
  if (!sceneInfo) return null;
  return getNodeById(navigatorState, sceneInfo.firstNodeId);
}

/**
 * Helper: Find last node of a scene
 */
export function getLastNodeOfScene(navigatorState: NavigatorState, sceneId: SceneId): StateNode | null {
  const sceneInfo = navigatorState.sceneRegistry?.byId[sceneId];
  if (!sceneInfo) return null;
  return getNodeById(navigatorState, sceneInfo.lastNodeId);
}
