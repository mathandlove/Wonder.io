/**
 * Navigation Graph Builder - Converts scenes into a linked graph of nodes
 *
 * Core Responsibilities:
 * 1. Expand scenes into their constituent nodes (enter, speak, exit, dialogue substates)
 * 2. Generate stable unique IDs for each node (using ulid)
 * 3. Link nodes within scenes (prev/next pointers)
 * 4. Link between scenes (scene tail → next scene head)
 * 5. Build scene registry for O(1) scene-range operations
 *
 * Key Principle: IDs are generated once and never change - React keys depend on this stability
 */

import { ulid } from 'ulid';
import type { Scene, CharacterFlowScene } from '@core/types/scene';
import type {
  Node,
  NodeId,
  SceneId,
  NavigationGraph,
  SceneRegistry,
} from './navigationGraphTypes';
import type { SceneState } from './types';

/**
 * Build a complete navigation graph from an array of scenes
 *
 * This is the main entry point for converting the flat scene array
 * into a doubly-linked graph of nodes.
 *
 * Process:
 * 1. Filter out hidden scenes
 * 2. For each scene, expand into nodes based on type
 * 3. Link nodes within each scene
 * 4. Link between scenes
 * 5. Build scene registry for fast lookups
 *
 * @param scenes - Array of story scenes
 * @returns Complete NavigationGraph with linked graph
 */
export function buildNavigationGraph(scenes: Scene[]): NavigationGraph {
  const byId: Record<NodeId, Node> = {};
  const order: NodeId[] = [];
  const sceneRegistry: SceneRegistry = {
    byId: {},
    order: [],
  };

  let previousNodeId: NodeId | null = null;

  // Process each scene
  for (const scene of scenes) {
    // Ensure scene has an ID
    const sceneId: SceneId = scene.sceneId || ulid();

    // Expand scene into state nodes
    const sceneNodes = expandSceneToNodes(scene, sceneId);

    if (sceneNodes.length === 0) continue;

    // Track first and last nodes for scene registry
    const firstNodeId = sceneNodes[0].id;
    const lastNodeId = sceneNodes[sceneNodes.length - 1].id;

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
      byId[previousNodeId].nextId = firstNodeId;
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

  }

  return {
    byId,
    order,
    currentId: order.length > 0 ? order[0] : null,
    lastFrozenNode: null,
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
export function expandSceneToNodes(scene: Scene, sceneId: SceneId): Node[] {
  switch (scene.type) {
    case 'image':
      return expandImageScene(scene, sceneId);

    case 'character': {
      // Check if this character scene has States field (from character-flow flattening)
      const characterScene = scene as Scene & { States?: string[] };
      if (characterScene.States && characterScene.States.length > 0) {
        return expandCharacterWithStates(characterScene as Scene & { States: string[] }, sceneId);
      }
      return [createSimpleNode(scene, sceneId, 'dialogue:basic', { type: 'dialogue', state: 'basic' })];
    }

    case 'character-flow':
      return expandCharacterFlowScene(scene, sceneId);

    case 'text':
    case 'full':
      return [createSimpleNode(scene, sceneId, 'static', { type: 'static' })];

    case 'fail-dance':
      return [createSimpleNode(scene, sceneId, 'dance:fail', { type: 'dialogue', state: 'answer-wrong' })];

    case 'success-dance':
      return [createSimpleNode(scene, sceneId, 'dance:success', { type: 'dialogue', state: 'answer-right' })];

    default:
      console.warn('Unknown scene type:', (scene as { type?: string }).type);
      return [createSimpleNode(scene, sceneId, 'unknown', { type: 'static' })];
  }
}

/**
 * Image scene expansion - creates hidden/showing states if caption exists
 */
function expandImageScene(scene: Scene & { caption?: string; text?: string }, sceneId: SceneId): Node[] {
  const captionText = scene.caption || scene.text;
  const hasCaption = captionText && captionText.trim() !== '';

  if (hasCaption) {
    // Image with caption: 2 states (hidden → showing)
    return [
      createNode(
        scene,
        sceneId,
        'image:hidden',
        { type: 'image', state: 'hidden' },
        { lockForward: false, lockBackward: false }
      ),
      createNode(
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
    createNode(
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
function expandCharacterWithStates(scene: Scene & { States: string[] }, sceneId: SceneId): Node[] {
  const states = scene.States;
  const hasQuest = states.includes('quest') || states.includes('giveQuest');
  const hasInput = states.includes('input');

  return expandDialogueStates(scene, sceneId, { hasQuest, hasInput });
}

/**
 * Character-flow scene expansion - checks flow items for States field
 */
function expandCharacterFlowScene(scene: CharacterFlowScene, sceneId: SceneId): Node[] {
  const flowItemWithStates = scene.flow.find(item => item.States && item.States.length > 0);

  if (flowItemWithStates && flowItemWithStates.States) {
    const states = flowItemWithStates.States;
    const hasQuest = states.includes('quest') || states.includes('giveQuest');
    const hasInput = states.includes('input');

    return expandDialogueStates(scene, sceneId, { hasQuest, hasInput });
  }

  // Character-flow without features - basic dialogue
  return [
    createNode(
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
): Node[] {
  const nodes: Node[] = [];

  // Combined quest + input flow
  if (features.hasQuest && features.hasInput) {
    nodes.push(
      createNode(
        scene,
        sceneId,
        'dialogue:quest-basic',
        { type: 'dialogue', state: 'basic' },
        { lockForward: false, lockBackward: false }
      ),
      createNode(
        scene,
        sceneId,
        'dialogue:quest-showing',
        { type: 'dialogue', state: 'quest-showing' },
        { lockForward: true, lockBackward: true } // Block until quest accepted
      ),
      createNode(
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
      createNode(
        scene,
        sceneId,
        'dialogue:quest-basic',
        { type: 'dialogue', state: 'quest-basic' },
        { lockForward: false, lockBackward: false }
      ),
      createNode(
        scene,
        sceneId,
        'dialogue:quest-showing',
        { type: 'dialogue', state: 'quest-showing' },
        { lockForward: true, lockBackward: true }
      ),
      createNode(
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
      createNode(
        scene,
        sceneId,
        'dialogue:input-basic',
        { type: 'dialogue', state: 'input-basic' },
        { lockForward: false, lockBackward: false }
      ),
      createNode(
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
 * @returns Complete Node (not yet linked)
 */
function createNode(
  scene: Scene,
  sceneId: SceneId,
  stateKey: string,
  sceneState: SceneState,
  overrideLocks?: { lockForward?: boolean; lockBackward?: boolean }
): Node {
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
function createSimpleNode(
  scene: Scene,
  sceneId: SceneId,
  stateKey: string,
  sceneState: SceneState
): Node {
  return createNode(scene, sceneId, stateKey, sceneState, {
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
  navigationGraph: NavigationGraph,
  nodeId: NodeId | null
): Node | null {
  if (!nodeId) return null;
  return navigationGraph.byId[nodeId] || null;
}

/**
 * Helper: Get previous node (pointer traversal)
 */
export function getPrevNode(navigationGraph: NavigationGraph, nodeId: NodeId): Node | null {
  const node = getNodeById(navigationGraph, nodeId);
  if (!node) return null;
  return getNodeById(navigationGraph, node.prevId);
}

/**
 * Helper: Get next node (pointer traversal)
 */
export function getNextNode(navigationGraph: NavigationGraph, nodeId: NodeId): Node | null {
  const node = getNodeById(navigationGraph, nodeId);
  if (!node) return null;
  return getNodeById(navigationGraph, node.nextId);
}

/**
 * Helper: Get current active node
 */
export function getCurrentNode(navigationGraph: NavigationGraph): Node | null {
  return getNodeById(navigationGraph, navigationGraph.currentId);
}

/**
 * Helper: Find first node of a scene
 */
export function getFirstNodeOfScene(navigationGraph: NavigationGraph, sceneId: SceneId): Node | null {
  const sceneInfo = navigationGraph.sceneRegistry?.byId[sceneId];
  if (!sceneInfo) return null;
  return getNodeById(navigationGraph, sceneInfo.firstNodeId);
}

/**
 * Helper: Find last node of a scene
 */
export function getLastNodeOfScene(navigationGraph: NavigationGraph, sceneId: SceneId): Node | null {
  const sceneInfo = navigationGraph.sceneRegistry?.byId[sceneId];
  if (!sceneInfo) return null;
  return getNodeById(navigationGraph, sceneInfo.lastNodeId);
}
