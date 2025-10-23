/**
 * buildNavigationArray - Converts scenes into a flat navigation array
 *
 * Now builds via state-node graph for stable IDs and pointer-based navigation:
 * 1. Build state node graph using buildStateNodeGraph
 * 2. Convert state nodes to NavigationItems (for backward compatibility)
 * 3. Return flat array with stable nodeId keys
 *
 * Each NavigationItem represents one "scroll stop" in the story.
 */

import type { Scene } from '@core/types/scene';
import type { NavigationItem } from './types';
import { buildStateNodeGraph, getNodeById } from './stateNodeBuilder';

/**
 * Main builder function - converts scenes to navigation array
 * Filters out hidden scenes and expands remaining scenes into navigation items
 */
export function buildNavigationArray(scenes: Scene[]): NavigationItem[] {
  // Build state node graph
  const navigatorState = buildStateNodeGraph(scenes);

  // Convert state nodes to NavigationItems
  const navigationArray: NavigationItem[] = [];

  for (let i = 0; i < navigatorState.order.length; i++) {
    const nodeId = navigatorState.order[i];
    const node = getNodeById(navigatorState, nodeId);

    if (!node) {
      console.warn('⚠️ buildNavigationArray: Node not found in byId:', nodeId);
      continue;
    }

    // Convert StateNode to NavigationItem
    const navItem: NavigationItem = {
      nodeId: node.id,
      scene: node.scene as Scene, // Scene is stored in the node
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
