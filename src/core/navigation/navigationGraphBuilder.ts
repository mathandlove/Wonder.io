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
  NavigationGraph,
} from './navigationGraphTypes';

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

  let previousNodeId: NodeId | null = null;

  // Process each scene
  for (const scene of scenes) {
    // Expand scene into state nodes
    const sceneNodes = expandSceneToNodes(scene);

    if (sceneNodes.length === 0) continue;

    // Track first and last nodes
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
  }

  return {
    byId,
    order,
    currentId: order.length > 0 ? order[0] : null,
    lastFrozenNode: null,
    historyVersion: 0,
  };
}

/**
 * Expand a single scene into one or more state nodes
 *
 * Different scene types expand differently:
 * - Image scenes: may have "hidden" and "showing" states (if caption exists)
 * - Character scenes: may have dialogue substates (quest/input features)
 * - Character-flow scenes: expanded based on flow items with phaseSteps
 * - Simple scenes (text, full): single state node
 *
 * @param scene - Scene to expand
 * @returns Array of state nodes (not yet linked)
 */
export function expandSceneToNodes(scene: Scene): Node[] {
  switch (scene.type) {
    case 'image':
      return expandImageScene(scene);

    case 'character':
      // Character scenes are now simple - phase is tracked on the scene itself, not via multiple nodes
      return [createSimpleNode(scene)];

    case 'character-flow':
      return expandCharacterFlowScene(scene);

    case 'text':
    case 'full':
      return [createSimpleNode(scene)];

    case 'fail-dance':
      return [createSimpleNode(scene)];

    case 'success-dance':
      return [createSimpleNode(scene)];

    default:
      console.warn('Unknown scene type:', (scene as { type?: string }).type);
      return [createSimpleNode(scene)];
  }
}

/**
 * Image scene expansion - creates single node with phase management
 */
function expandImageScene(scene: Scene): Node[] {
  // Image scenes create a single node that starts in 'image_only' phase
  // Will transition to 'caption' phase if the scene has a caption
  return [createNode(scene)];
}

/**
 * Character-flow scene expansion - creates single node with phase management
 *
 * Unlike the old multi-node approach, character-flow scenes now create ONE node
 * that transitions through phases internally (managed by dialogueSceneMachine).
 *
 * This follows the imageScene pattern:
 * - One visual scene = One node
 * - Phases are managed by child state machine
 * - User scrolls through phases (basic → quest-showing → input) within the node
 * - Only moves to next node after all phases are exhausted
 *
 * The flow array determines which phases are available:
 * - If flow has quest item → node can transition to 'quest-showing' phase
 * - If flow has input item → node can transition to 'input' phase
 * - dialogueSceneMachine reads the flow to determine phase routing
 */
function expandCharacterFlowScene(scene: CharacterFlowScene): Node[] {
  // Character-flow scenes create ONE node with phase tracking
  // The dialogueSceneMachine will manage phase transitions based on the flow
  console.log('[expandCharacterFlowScene] Creating single node with phase management for flow with', scene.flow.length, 'items');

  return [createNode(scene)];
}

/**
 * Create a state node
 *
 * @param scene - Original scene data
 * @returns Complete Node (not yet linked)
 */
function createNode(
  scene: Scene
): Node {
  // Determine initial phase based on scene type
  let initialPhase: string;

  if (scene.phase) {
    // Use explicit phase from scene if provided
    initialPhase = scene.phase;
  } else if (scene.type === 'image') {
    initialPhase = 'image_only';
  } else if (scene.type === 'character' || scene.type === 'character-flow') {
    initialPhase = 'basic';
  } else if (scene.type === 'fail-dance') {
    initialPhase = 'answer-wrong';
  } else if (scene.type === 'success-dance') {
    initialPhase = 'answer-right';
  } else {
    initialPhase = 'static';
  }

  // Get phaseSteps from scene or compute defaults
  let phaseSteps: string[];
  if ('phaseSteps' in scene && Array.isArray(scene.phaseSteps) && scene.phaseSteps.length > 0) {
    // Use phaseSteps from scene (set by loadStory for dialogue, or manually)
    phaseSteps = scene.phaseSteps;
  } else if (scene.type === 'image') {
    // Image scenes: check if caption exists
    const hasCaption = ('text' in scene && scene.text) || ('caption' in scene && scene.caption);
    phaseSteps = hasCaption ? ['image_only', 'caption'] : ['image_only'];
  } else if (scene.type === 'character' || scene.type === 'character-flow') {
    // Dialogue scenes: default to basic only (phaseSteps should be set by loadStory)
    phaseSteps = ['basic'];
  } else if (scene.type === 'fail-dance') {
    phaseSteps = ['answer-wrong'];
  } else if (scene.type === 'success-dance') {
    phaseSteps = ['answer-right'];
  } else {
    // Default: single static phase
    phaseSteps = ['static'];
  }

  // Calculate phaseIndex from initialPhase
  let phaseIndex = phaseSteps.indexOf(initialPhase);
  if (phaseIndex === -1) {
    console.warn('[createNode] Phase not found in phaseSteps, using 0', {
      phase: initialPhase,
      phaseSteps,
      sceneType: scene.type
    });
    phaseIndex = 0;
    initialPhase = phaseSteps[0];
  }

  return {
    id: ulid(), // Stable unique ID
    scene, // Store full scene object
    phase: initialPhase, // Initialize phase from scene type
    phaseSteps, // Available phases for this node
    phaseIndex, // Current position in phaseSteps
    prevId: null, // Will be set during linking
    nextId: null, // Will be set during linking
    status: 'active',
  };
}

/**
 * Create a simple state node for scenes without substates
 */
function createSimpleNode(
  scene: Scene
): Node {
  return createNode(scene);
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

