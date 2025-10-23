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
import { useNavigationStore } from '@core/navigation/navigationStore';

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
