/**
 * Graph Operations - Pure graph manipulation utilities
 *
 * This module centralizes all pure helper functions for the navigation graph.
 * These functions are framework-agnostic and can be used in both React and non-React contexts.
 *
 * All functions here are pure:
 * - No React state, no refs, no console side-effects (except warnings)
 * - Accept plain objects, return plain objects
 * - Deterministic and testable
 */

// Re-export from existing modules
export {
  expandSceneToNodes,
  getNodeById,
  getPrevNode,
  getNextNode,
  getCurrentNode,
  getFirstNodeOfScene,
  getLastNodeOfScene,
  buildNavigationGraph,
} from '../navigationGraphBuilder';

export {
  markNodeForRemoval,
  compactNode,
  findNextActiveNode,
  findPrevActiveNode,
  navigateNext,
  navigatePrev,
  batchMarkForRemoval,
  batchCompact,
  markSceneForRemoval,
} from '../navigationGraphOperations';

// Lock logic removed - now managed by XState machines
