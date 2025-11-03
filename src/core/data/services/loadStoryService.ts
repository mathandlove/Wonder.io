/**
 * Story Loading Service
 *
 * Pure service function for loading and processing story data.
 * Used by XState machine during boot sequence.
 *
 * Responsibilities:
 * - Load story JSON from URL
 * - Build navigation graphs (full and minimal)
 * - Extract conversation metadata
 * - Return structured data for machine context
 */

import { loadStory } from '@core/data/loadStory';
import { buildNavigationGraph } from '@core/navigation/navigationGraphBuilder';
import type { Scene } from '@core/types/scene';
import type { MachineGraph } from '@core/navigation/machine/types';
import type { ConversationMetadataMap } from '@core/data/loadStory';

/**
 * Input for story loading service
 */
export interface LoadStoryInput {
  storyId: string;
}

/**
 * Output from story loading service
 */
export interface LoadStoryOutput {
  fullStory: Scene[];
  minimalGraph: MachineGraph;
  initialNodeId: string;
  flowMetadata: ConversationMetadataMap;
}

/**
 * Load story data and build navigation graphs
 *
 * This is invoked by XState machine during boot.loading_story state
 *
 * @param input - Story ID to load
 * @returns Story data, graphs, and metadata
 */
export async function loadStoryService(input: LoadStoryInput): Promise<LoadStoryOutput> {
  const url = `/stories/${input.storyId}.bundle/story.json`;
  const { story, flowMetadata } = await loadStory(url);

  // Build full navigation graph to get actual node IDs (ULIDs)
  // We need to use the SAME IDs that navigationStore will use
  const fullGraph = buildNavigationGraph(story.scenes);

  // Build minimal graph for XState routing using actual node IDs from the full graph
  const minimalGraph: MachineGraph = {
    scenes: fullGraph.order.map(nodeId => {
      const node = fullGraph.byId[nodeId];
      return {
        id: nodeId, // Use the actual ULID from the graph
        type: node.scene?.type || 'unknown',
        meta: ('meta' in node.scene && node.scene.meta) ? node.scene.meta as Record<string, unknown> : {},
      };
    }),
  };

  // Use first node ID from the built graph (not sceneId)
  const initialNodeId = fullGraph.order[0] || '';

  return {
    fullStory: story.scenes,
    minimalGraph,
    initialNodeId,
    flowMetadata,
  };
}
