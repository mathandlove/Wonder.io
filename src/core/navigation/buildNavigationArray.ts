/**
 * buildNavigationArray - Converts scenes into a flat navigation array
 *
 * Now builds via navigation graph for stable IDs and pointer-based navigation:
 * 1. Build navigation graph using buildNavigationGraph
 * 2. Convert nodes to NavigationItems (for backward compatibility)
 * 3. Return flat array with stable nodeId keys
 *
 * Each NavigationItem represents one "scroll stop" in the story.
 */

import type { Scene } from '@core/types/scene';
import type { Node } from './navigationGraphTypes';
import { buildNavigationGraph, getNodeById } from './navigationGraphBuilder';

/**
 * Main builder function - converts scenes to navigation array
 * Filters out hidden scenes and expands remaining scenes into navigation items
 */
export function buildNavigationArray(scenes: Scene[]): Node[] {
  // Build navigation graph
  const navigationGraph = buildNavigationGraph(scenes);

  // Convert nodes to array
  const navigationArray: Node[] = [];

  for (let i = 0; i < navigationGraph.order.length; i++) {
    const nodeId = navigationGraph.order[i];
    const node = getNodeById(navigationGraph, nodeId);

    if (!node) {
      console.warn('⚠️ buildNavigationArray: Node not found in byId:', nodeId);
      continue;
    }

    navigationArray.push(node);
  }

  return navigationArray;
}
