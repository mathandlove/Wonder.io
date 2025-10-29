/**
 * Navigation Helper Functions
 *
 * Convenience functions for common navigation operations.
 * These functions provide a cleaner API over direct store access.
 *
 * Usage:
 * - Import these helpers for one-time reads or actions
 * - For reactive state, use selectors with useNavigationStore(selector)
 */

import type { Scene } from '@core/types/scene';
import type { Node, SceneState } from '@core/navigation/types';
import type { NodeId, FrozenNodeSnapshot } from '@core/navigation/navigationGraphTypes';
import { getNodeById } from '@core/navigation/navigationGraphBuilder';
import { useNavigationStore, getLocksForState as getLocksForStateFromStore } from '@core/navigation/navigationStore';
import { ulid } from 'ulid';

/**
 * Get the current node ID
 */
export function getCurrentNodeId(): NodeId | null {
  return useNavigationStore.getState().currentId;
}

/**
 * Get the current node with full navigation metadata
 */
export function getCurrentNode(): Node | null {
  const state = useNavigationStore.getState();
  const currentNodeId = state.currentId;
  if (!currentNodeId) return null;

  const node = getNodeById(state.graph, currentNodeId);
  if (!node) return null;

  return {
    nodeId: node.id,
    scene: node.scene as Scene,
    sceneId: node.sceneId,
    sceneState: node.sceneState,
    status: node.status,
  };
}

/**
 * Get the current scene
 */
export function getCurrentScene(): Scene | null {
  const node = getCurrentNode();
  return node?.scene || null;
}

/**
 * Get the current scene ID
 */
export function getCurrentSceneId(): string | null {
  const node = getCurrentNode();
  return node?.sceneId || null;
}

/**
 * Create a frozen snapshot of a node (pure data, no navigation metadata)
 */
export function createFrozenSnapshot(nodeId: NodeId): FrozenNodeSnapshot | null {
  const state = useNavigationStore.getState();
  const node = getNodeById(state.graph, nodeId);
  if (!node) return null;

  return {
    nodeId: node.id,
    sceneId: node.sceneId,
    stateKey: node.stateKey,
    sceneState: node.sceneState,
    scene: node.scene,
  };
}

/**
 * Get the current background ID from the current scene
 */
export function getCurrentBackgroundId(): string | null {
  const currentScene = getCurrentScene();
  if (!currentScene) return null;

  if ('background' in currentScene && currentScene.background && currentScene.background.trim() !== '') {
    return currentScene.background;
  }

  return null;
}

// =============================================================================
// Action helpers - these call store actions directly
// =============================================================================

/**
 * Set scenes (rebuilds navigation graph)
 */
export function setScenes(scenes: Scene[]): void {
  useNavigationStore.getState().setScenes(scenes);
}

/**
 * Insert scene nodes after a specific node
 */
export function insertSceneNodes(afterNodeId: NodeId | null, scene: Scene): NodeId | null {
  return useNavigationStore.getState().insertSceneNodes(afterNodeId, scene);
}

/**
 * Insert a single node after a specific node
 *
 * This is a low-level function for inserting pre-constructed nodes into the graph.
 * The node should be created using helper functions like `cloneNodeWithStateChange`.
 *
 * @param afterNodeId - ID of the node to insert after (null to insert at beginning)
 * @param node - The node to insert (without prev/next pointers, which will be set automatically)
 * @returns The ID of the inserted node
 *
 * @example
 * ```typescript
 * // Clone and insert a node with modified state
 * const answerRightNodeId = getCurrentNodeId();
 * const basicNode = cloneNodeWithStateChange(answerRightNodeId, {
 *   type: 'dialogue',
 *   state: 'basic'
 * });
 *
 * if (basicNode) {
 *   insertNode(answerRightNodeId, basicNode);
 * }
 * ```
 */
export function insertNode(afterNodeId: NodeId | null, node: Omit<Node, 'prevId' | 'nextId'>): NodeId {
  return useNavigationStore.getState().insertNode(afterNodeId, node);
}

/**
 * Replace an existing node with a new node
 *
 * This function replaces a node in the graph while preserving all pointer connections.
 * The old node is removed and the new node takes its exact place in the navigation sequence.
 * This is useful for transitioning a scene to a different state without changing position.
 *
 * @param oldNodeId - ID of the node to replace
 * @param newNode - The new node to insert in its place (without prev/next pointers)
 * @returns The ID of the new node, or null if the old node wasn't found
 *
 * @example
 * ```typescript
 * // Replace answer-right node with a basic node
 * const answerRightNodeId = getCurrentNodeId();
 * const basicNode = cloneNodeWithStateChange(answerRightNodeId, {
 *   type: 'dialogue',
 *   state: 'basic'
 * });
 *
 * if (basicNode) {
 *   replaceNode(answerRightNodeId, basicNode);
 * }
 * ```
 */
export function replaceNode(oldNodeId: NodeId, newNode: Omit<Node, 'prevId' | 'nextId'>): NodeId | null {
  return useNavigationStore.getState().replaceNode(oldNodeId, newNode);
}

/**
 * Add a new state to the current node
 */
export function addStateToCurrentNode(newState: SceneState, insertAfter: boolean = true): NodeId | null {
  return useNavigationStore.getState().addStateToCurrentNode(newState, insertAfter);
}

/**
 * Update a node's state
 */
export function updateNodeState(nodeId: NodeId, newState: SceneState): void {
  useNavigationStore.getState().updateNodeState(nodeId, newState);
}

/**
 * Update scene text by recording ID
 */
export function updateSceneTextByRecordingId(recordingId: string, newText: string): void {
  useNavigationStore.getState().updateSceneTextByRecordingId(recordingId, newText);
}

/**
 * Delete a node
 */
export function deleteNode(nodeId: NodeId): void {
  useNavigationStore.getState().deleteNode(nodeId);
}

/**
 * Advance navigation (respects locks)
 */
export function advanceNavigation(direction: 'forward' | 'backward'): void {
  useNavigationStore.getState().advance(direction);
}

/**
 * Force advance navigation (bypasses locks)
 */
export function forceAdvanceNavigation(direction: 'forward' | 'backward'): void {
  useNavigationStore.getState().forceAdvance(direction);
}

/**
 * Re-export getLocksForState from navigationStore
 */
export { getLocksForState } from '@core/navigation/navigationStore';

// =============================================================================
// Node Factory Helpers - Create/clone nodes with modified state
// =============================================================================

/**
 * Clone a node with a new state
 *
 * Creates a new node that is a copy of the specified node, but with a different sceneState.
 * This is useful when you need to transition a scene to a different state without mutating
 * the original node (which could trigger unwanted reactive updates).
 *
 * The new node will have:
 * - A new unique ID (generated via ulid())
 * - The same scene, sceneId, and other properties as the original
 * - The new sceneState you provide
 * - Updated stateKey and locks based on the new state
 * - No prev/next pointers (caller must insert it into the graph)
 *
 * @param nodeId - ID of the node to clone
 * @param newState - The new scene state to apply to the cloned node
 * @returns A new node with the modified state, or null if the original node doesn't exist
 *
 * @example
 * ```typescript
 * // Clone an answer-right node as a basic node
 * const answerRightNodeId = getCurrentNodeId();
 * const basicNode = cloneNodeWithStateChange(answerRightNodeId, {
 *   type: 'dialogue',
 *   state: 'basic'
 * });
 *
 * if (basicNode) {
 *   // Insert the basic node into the graph
 *   // (you'll need to use insertSceneNodes or similar)
 * }
 * ```
 */
export function cloneNodeWithStateChange(nodeId: NodeId, newState: SceneState): Omit<Node, 'prevId' | 'nextId'> | null {
  const state = useNavigationStore.getState();
  const originalNode = getNodeById(state.graph, nodeId);

  if (!originalNode) {
    console.warn('[navigationHelpers] cloneNodeWithStateChange: Node not found:', nodeId);
    return null;
  }

  // Compute locks for the new state
  const locks = getLocksForStateFromStore(newState);

  // Generate stateKey from newState
  let stateKey = 'unknown';
  if (newState.type === 'dialogue') {
    stateKey = `dialogue:${newState.state}`;
  } else if (newState.type === 'image') {
    stateKey = `image:${newState.state}`;
  } else {
    stateKey = newState.type;
  }

  // Create the cloned node with new state
  return {
    id: ulid(), // New unique ID
    sceneId: originalNode.sceneId, // Same scene
    stateKey, // Updated based on new state
    sceneState: newState, // New state
    scene: originalNode.scene, // Same scene data
    stateMeta: originalNode.stateMeta ? { ...originalNode.stateMeta } : {}, // Clone metadata
    status: 'active', // New nodes are always active
    lockForward: locks.lockForward,
    lockBackward: locks.lockBackward,
    // Note: prevId and nextId are omitted - caller must insert into graph
  };
}
