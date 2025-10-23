/**
 * State Node Operations - Graph manipulation utilities
 *
 * This module provides operations for manipulating the state node graph:
 * - Rewiring: Update prev/next pointers when deleting nodes
 * - Marking for removal: Set status to pendingRemoval and rewire
 * - Compaction: Physically remove nodes from the graph
 * - Navigation: Pointer-based traversal with skip-over-pending logic
 */

import type {
  NavigatorState,
  StateNode,
  StateNodeId,
  RewiringOperation,
  PendingNodeDeletion,
} from './stateNodeTypes';
import { getNodeById, getPrevNode, getNextNode } from './stateNodeBuilder';

/**
 * Mark a node for removal with immediate rewiring
 *
 * This implements the skip-back behavior:
 * 1. Set node status to 'pendingRemoval'
 * 2. Rewire neighbors to skip this node (A ← B → C becomes A ← C, B skipped)
 * 3. Return rewiring operations applied
 *
 * After marking, backward navigation from the next node will skip over this node.
 *
 * @param state - Current navigator state
 * @param nodeId - Node to mark for removal
 * @returns New navigator state with node marked and neighbors rewired
 */
export function markNodeForRemoval(
  state: NavigatorState,
  nodeId: StateNodeId
): { state: NavigatorState; rewiring: RewiringOperation[] } {
  const node = getNodeById(state, nodeId);

  if (!node) {
    console.warn('[markNodeForRemoval] Node not found:', nodeId);
    return { state, rewiring: [] };
  }

  if (node.status === 'pendingRemoval') {
    console.warn('[markNodeForRemoval] Node already marked for removal:', nodeId);
    return { state, rewiring: [] };
  }

  // Clone state for immutable update
  const newState = { ...state };
  const newById = { ...state.byId };
  const rewiring: RewiringOperation[] = [];

  // Mark node as pending removal
  newById[nodeId] = { ...node, status: 'pendingRemoval' };

  // Rewire neighbors to skip this node
  // A ← B → C becomes A ← C (B is skipped)

  // Update next node's prevId to skip this node
  if (node.nextId) {
    const nextNode = getNodeById(state, node.nextId);
    if (nextNode) {
      newById[node.nextId] = {
        ...nextNode,
        prevId: node.prevId, // Skip to B's previous node
      };

      rewiring.push({
        nodeId: node.nextId,
        field: 'prevId',
        newValue: node.prevId,
        previousValue: nodeId,
      });
    }
  }

  // Update previous node's nextId to skip this node
  if (node.prevId) {
    const prevNode = getNodeById(state, node.prevId);
    if (prevNode) {
      newById[node.prevId] = {
        ...prevNode,
        nextId: node.nextId, // Skip to B's next node
      };

      rewiring.push({
        nodeId: node.prevId,
        field: 'nextId',
        newValue: node.nextId,
        previousValue: nodeId,
      });
    }
  }

  newState.byId = newById;
  newState.historyVersion = state.historyVersion + 1;

  console.log('[markNodeForRemoval] Marked node for removal:', {
    nodeId,
    stateKey: node.stateKey,
    rewiring: rewiring.map(r => `${r.nodeId}.${r.field} = ${r.newValue}`),
  });

  return { state: newState, rewiring };
}

/**
 * Compact a node - physically remove from the graph
 *
 * This is phase 2 of deletion (after marking).
 * Removes the node from byId and order arrays.
 *
 * Important: Neighbors should already be rewired when this is called.
 * If not, navigation will break.
 *
 * @param state - Current navigator state
 * @param nodeId - Node to compact
 * @returns New navigator state with node removed
 */
export function compactNode(state: NavigatorState, nodeId: StateNodeId): NavigatorState {
  const node = getNodeById(state, nodeId);

  if (!node) {
    console.warn('[compactNode] Node not found:', nodeId);
    return state;
  }

  // Remove from byId
  const newById = { ...state.byId };
  delete newById[nodeId];

  // Remove from order
  const newOrder = state.order.filter(id => id !== nodeId);

  // Update scene registry if this was a scene boundary
  let newSceneRegistry = state.sceneRegistry;
  if (newSceneRegistry && newSceneRegistry.byId[node.sceneId]) {
    const sceneInfo = newSceneRegistry.byId[node.sceneId];

    // Check if this node was the first or last of its scene
    if (sceneInfo.firstNodeId === nodeId || sceneInfo.lastNodeId === nodeId) {
      const newSceneInfo = { ...sceneInfo };

      // Find new first/last node by traversing the remaining nodes
      const sceneNodes = newOrder.filter(id => newById[id]?.sceneId === node.sceneId);

      if (sceneNodes.length > 0) {
        newSceneInfo.firstNodeId = sceneNodes[0];
        newSceneInfo.lastNodeId = sceneNodes[sceneNodes.length - 1];
        newSceneInfo.nodeCount = sceneNodes.length;

        newSceneRegistry = {
          ...newSceneRegistry,
          byId: {
            ...newSceneRegistry.byId,
            [node.sceneId]: newSceneInfo,
          },
        };
      } else {
        // Scene is now empty - remove from registry
        const newSceneById = { ...newSceneRegistry.byId };
        delete newSceneById[node.sceneId];

        newSceneRegistry = {
          byId: newSceneById,
          order: newSceneRegistry.order.filter(id => id !== node.sceneId),
        };
      }
    }
  }

  // Handle current node deletion - move to next or previous active node
  let newCurrentId = state.currentId;
  if (state.currentId === nodeId) {
    // Current node is being deleted - find a new current
    const nextActive = findNextActiveNode(state, nodeId);
    const prevActive = findPrevActiveNode(state, nodeId);

    // Prefer next, fallback to prev, fallback to null
    newCurrentId = nextActive?.id || prevActive?.id || null;

    console.log('[compactNode] Current node deleted, moving to:', newCurrentId);
  }

  console.log('[compactNode] Compacted node:', {
    nodeId,
    stateKey: node.stateKey,
    sceneId: node.sceneId,
    remainingNodes: newOrder.length,
  });

  return {
    ...state,
    byId: newById,
    order: newOrder,
    currentId: newCurrentId,
    historyVersion: state.historyVersion + 1,
    sceneRegistry: newSceneRegistry,
  };
}

/**
 * Find the next active node (skipping pendingRemoval nodes)
 *
 * @param state - Current navigator state
 * @param fromNodeId - Starting node ID
 * @returns Next active node or null
 */
export function findNextActiveNode(state: NavigatorState, fromNodeId: StateNodeId): StateNode | null {
  let current = getNodeById(state, fromNodeId);

  while (current) {
    const next = getNextNode(state, current.id);
    if (!next) return null;

    if (next.status === 'active') {
      return next;
    }

    current = next;
  }

  return null;
}

/**
 * Find the previous active node (skipping pendingRemoval nodes)
 *
 * @param state - Current navigator state
 * @param fromNodeId - Starting node ID
 * @returns Previous active node or null
 */
export function findPrevActiveNode(state: NavigatorState, fromNodeId: StateNodeId): StateNode | null {
  let current = getNodeById(state, fromNodeId);

  while (current) {
    const prev = getPrevNode(state, current.id);
    if (!prev) return null;

    if (prev.status === 'active') {
      return prev;
    }

    current = prev;
  }

  return null;
}

/**
 * Navigate to next active node (skipping pendingRemoval and same-scene states)
 *
 * Logic:
 * 1. Find next active node via pointer traversal
 * 2. If same scene, keep going until different scene (cross-scene navigation)
 * 3. Return null if at tail
 *
 * @param state - Current navigator state
 * @param currentNodeId - Current node ID
 * @returns Next navigation target or null
 */
export function navigateNext(state: NavigatorState, currentNodeId: StateNodeId): StateNode | null {
  const current = getNodeById(state, currentNodeId);
  if (!current) return null;

  let candidate = findNextActiveNode(state, currentNodeId);

  // Skip states within the same scene (for cross-scene navigation)
  while (candidate && candidate.sceneId === current.sceneId) {
    candidate = findNextActiveNode(state, candidate.id);
  }

  return candidate;
}

/**
 * Navigate to previous active node (skipping pendingRemoval and same-scene states)
 *
 * Logic:
 * 1. Find previous active node via pointer traversal
 * 2. If same scene, keep going until different scene (cross-scene navigation)
 * 3. Return null if at head
 *
 * @param state - Current navigator state
 * @param currentNodeId - Current node ID
 * @returns Previous navigation target or null
 */
export function navigatePrev(state: NavigatorState, currentNodeId: StateNodeId): StateNode | null {
  const current = getNodeById(state, currentNodeId);
  if (!current) return null;

  let candidate = findPrevActiveNode(state, currentNodeId);

  // Skip states within the same scene (for cross-scene navigation)
  while (candidate && candidate.sceneId === current.sceneId) {
    candidate = findPrevActiveNode(state, candidate.id);
  }

  return candidate;
}

/**
 * Batch mark multiple nodes for removal (e.g., entire scene)
 *
 * @param state - Current navigator state
 * @param nodeIds - Array of node IDs to mark
 * @returns New navigator state with all nodes marked and rewired
 */
export function batchMarkForRemoval(
  state: NavigatorState,
  nodeIds: StateNodeId[]
): { state: NavigatorState; rewiring: RewiringOperation[] } {
  let currentState = state;
  const allRewiring: RewiringOperation[] = [];

  for (const nodeId of nodeIds) {
    const result = markNodeForRemoval(currentState, nodeId);
    currentState = result.state;
    allRewiring.push(...result.rewiring);
  }

  return { state: currentState, rewiring: allRewiring };
}

/**
 * Batch compact multiple nodes (e.g., entire scene after animation)
 *
 * @param state - Current navigator state
 * @param nodeIds - Array of node IDs to compact
 * @returns New navigator state with all nodes removed
 */
export function batchCompact(state: NavigatorState, nodeIds: StateNodeId[]): NavigatorState {
  let currentState = state;

  for (const nodeId of nodeIds) {
    currentState = compactNode(currentState, nodeId);
  }

  return currentState;
}

/**
 * Mark an entire scene for removal
 *
 * Uses scene registry for O(1) range identification.
 * Falls back to linear scan if registry not available.
 *
 * @param state - Current navigator state
 * @param sceneId - Scene ID to mark for removal
 * @returns New navigator state with scene marked
 */
export function markSceneForRemoval(
  state: NavigatorState,
  sceneId: string
): { state: NavigatorState; nodeIds: StateNodeId[] } {
  // Use scene registry if available
  if (state.sceneRegistry && state.sceneRegistry.byId[sceneId]) {
    const sceneInfo = state.sceneRegistry.byId[sceneId];

    // Collect all node IDs in the scene range
    const nodeIds: StateNodeId[] = [];
    let currentId: StateNodeId | null = sceneInfo.firstNodeId;

    while (currentId) {
      const node = getNodeById(state, currentId);
      if (!node) break;

      if (node.sceneId === sceneId) {
        nodeIds.push(currentId);
      }

      if (currentId === sceneInfo.lastNodeId) break;
      currentId = node.nextId;
    }

    const result = batchMarkForRemoval(state, nodeIds);
    return { state: result.state, nodeIds };
  }

  // Fallback: Linear scan
  const nodeIds = state.order.filter(id => {
    const node = getNodeById(state, id);
    return node?.sceneId === sceneId;
  });

  const result = batchMarkForRemoval(state, nodeIds);
  return { state: result.state, nodeIds };
}
