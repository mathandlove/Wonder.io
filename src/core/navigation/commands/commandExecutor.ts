/**
 * Command Executor - Graph Mutator Interface
 *
 * This is the ONLY place in the codebase (outside the queue itself) that is allowed
 * to call graph mutators from the navigation store.
 *
 * The queue calls this function with each command, and this function translates
 * the command into the appropriate store mutation.
 *
 * @module commandExecutor
 */

import type { NavigationCommand } from '../machine/types';
import { useNavigationStore } from '../navigationStore';
import { setScenes } from '../navigationHelpers';
import type { Scene } from '@core/types/scene';

/**
 * Execute a navigation command by calling the appropriate graph mutator
 *
 * This is called by the navigation queue for each command.
 * Each command type maps to one or more store mutations.
 * Executes synchronously to ensure state updates complete immediately.
 *
 * @param command - The command to execute
 */
export function executeCommand(command: NavigationCommand): void {
  const store = useNavigationStore.getState();

  switch (command.type) {
    case 'INSERT_AFTER': {
      console.log('[CommandExecutor] INSERT_AFTER:', command.afterNodeId, '→', command.newNode.nodeId);

      // Create a minimal scene from the node data
      const scene: Scene = {
        type: command.newNode.sceneKind as Scene['type'],
        sceneId: command.newNode.sceneId,
        ...command.newNode.metadata,
      };

      store.insertSceneNodes(command.afterNodeId, scene);
      break;
    }

    case 'NAVIGATE_TO': {
      console.log('[CommandExecutor] NAVIGATE_TO:', command.targetNodeId);

      // Find the target node
      const targetNode = store.graph.byId[command.targetNodeId];
      if (!targetNode) {
        console.warn('[CommandExecutor] Cannot navigate - node not found:', command.targetNodeId);
        break;
      }

      // Calculate the direction based on order
      const currentIndex = store.graph.order.indexOf(store.currentId || '');
      const targetIndex = store.graph.order.indexOf(command.targetNodeId);

      if (currentIndex === -1 || targetIndex === -1) {
        console.warn('[CommandExecutor] Cannot determine navigation direction');
        break;
      }

      const direction = targetIndex > currentIndex ? 'forward' : 'backward';

      // Use advance to navigate to the target
      // We may need multiple advances if the target is far away
      const steps = Math.abs(targetIndex - currentIndex);
      for (let i = 0; i < steps; i++) {
        store.advance(direction);
      }
      break;
    }

    case 'DELETE_NODE': {
      console.log('[CommandExecutor] DELETE_NODE:', command.nodeId);
      store.deleteNode(command.nodeId);
      break;
    }

    case 'ADVANCE': {
      console.log('[CommandExecutor] ADVANCE:', command.direction);
      // Use the store's advance() method which respects locks
      store.advance(command.direction);
      break;
    }

    case 'UPDATE_NODE_PHASE': {
      console.log('[CommandExecutor] UPDATE_NODE_PHASE:', command.nodeId.substring(0, 8), '→', command.phase);
      store.updateNodePhase(command.nodeId, command.phase);
      break;
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = command;
      console.warn('[CommandExecutor] Unknown command type:', _exhaustive);
    }
  }
}

/**
 * Execute the APPLY_GRAPH side effect
 *
 * This is a special command that doesn't fit the normal command pattern
 * because it replaces the entire graph rather than mutating it incrementally.
 *
 * @param graph - The graph data to apply (contains scenes and flowMetadata)
 */
export function applyGraph(graph: { scenes?: Scene[]; [key: string]: unknown }): { firstNodeId: string | null } {
  console.log('[CommandExecutor] APPLY_GRAPH - Received graph:', graph);
  console.log('[CommandExecutor] APPLY_GRAPH - Loading', graph.scenes?.length || 0, 'scenes');

  if (!graph.scenes || !Array.isArray(graph.scenes)) {
    console.error('[CommandExecutor] Invalid graph data - missing scenes array');
    console.error('[CommandExecutor] Graph structure:', Object.keys(graph));
    return { firstNodeId: null };
  }

  // Use setScenes to initialize the navigation graph
  console.log('[CommandExecutor] Calling setScenes with', graph.scenes.length, 'scenes');
  setScenes(graph.scenes);

  // Verify the graph was populated and get the first node ID
  const store = useNavigationStore.getState();
  console.log('[CommandExecutor] After setScenes - graph has', store.graph.order.length, 'nodes');

  const firstNodeId = store.graph.order[0] || null;
  console.log('[CommandExecutor] First node ID:', firstNodeId);

  // TODO: Also apply flowMetadata to the FlowMetadataStore
  // This will be done when we wire up that integration
  if (graph.flowMetadata) {
    console.log('[CommandExecutor] TODO: Apply flowMetadata to store');
  }

  return { firstNodeId };
}

/**
 * Execute the RESET_TEMP_NODES side effect
 *
 * Clears any temporary node tracking from the context.
 * For now, this is a no-op since temp node tracking isn't implemented yet.
 */
export function resetTempNodes(): void {
  console.log('[CommandExecutor] RESET_TEMP_NODES - clearing temporary nodes');
  // TODO: Clear temp node tracking when that feature is implemented
  // This might involve calling deleteNode for nodes marked as temporary
}
