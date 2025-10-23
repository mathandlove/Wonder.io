/**
 * navigatorStateToArray - Convert NavigatorState to NavigationItem[]
 *
 * Converts the state-node graph to a flat array for backward compatibility.
 * IMPORTANT: Uses existing node IDs from the graph - does NOT regenerate.
 *
 * This ensures NavigationItem.nodeId matches the IDs in NavigatorState.byId.
 */

import type { NavigatorState } from './stateNodeTypes';
import type { NavigationItem } from './types';
import type { Scene } from '@core/types/scene';

/**
 * Convert NavigatorState to NavigationItem array
 *
 * @param state - Navigator state with linked graph
 * @returns Flat array of navigation items (for backward compatibility)
 */
export function navigatorStateToArray(state: NavigatorState): NavigationItem[] {
  const navigationArray: NavigationItem[] = [];

  // Iterate through order array (maintains proper sequence)
  for (let i = 0; i < state.order.length; i++) {
    const nodeId = state.order[i];
    const node = state.byId[nodeId];

    if (!node) {
      console.warn('[navigatorStateToArray] Node not found in byId:', nodeId);
      continue;
    }

    // Convert StateNode to NavigationItem
    const navItem: NavigationItem = {
      nodeId: node.id, // CRITICAL: Use existing node ID from graph
      scene: node.scene as Scene,
      sceneId: node.sceneId,
      stateKey: node.stateKey,
      sceneState: node.sceneState,
      lockForward: node.lockForward,
      lockBackward: node.lockBackward,
      index: i,
      status: node.status,
    };

    navigationArray.push(navItem);
  }

  return navigationArray;
}
