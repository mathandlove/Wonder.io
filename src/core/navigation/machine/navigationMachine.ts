/**
 * Navigation State Machine
 *
 * This is the single source of truth for navigation flow logic.
 * It accepts domain events and emits action intents that become commands.
 *
 * States will be added incrementally as features are migrated to the new architecture.
 *
 * @module navigationMachine
 */

import { setup, assign, fromPromise } from 'xstate';
import type { NavigationEvent, NavigationContext, MachineGraph } from './types';
import { loadStory } from '@core/data/loadStory';
import { buildNavigationGraph } from '../navigationGraphBuilder';
import { useNavigationStore } from '../navigationStore';
import { setScenes } from '../navigationHelpers';

// Helper functions removed - navigationStore is now the single source of truth
// Navigation logic (next/prev) is handled by navigationStore.advance()

/**
 * Story loading service
 * Invoked during boot.loading_story state
 */
const loadStoryService = fromPromise(async ({ input }: { input: { storyId: string } }) => {
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
});

/**
 * Navigation State Machine
 *
 * This machine orchestrates the navigation flow without directly mutating the graph.
 * It receives domain events, makes decisions, and emits action intents.
 *
 * Start by adding states incrementally as you migrate features from the old architecture.
 */
export const navigationMachine = setup({
  types: {
    context: {} as NavigationContext,
    events: {} as NavigationEvent,
  },
  actors: {
    loadStory: loadStoryService,
  },
  actions: {
    // Assign storyId to context when LOAD_STORY_REQUESTED is received
    assignStoryId: assign({
      storyId: ({ event }) => {
        if (event.type === 'LOAD_STORY_REQUESTED') {
          return event.storyId;
        }
        return undefined;
      },
    }),

    // Apply graph from APPLY_GRAPH event
    // Note: Initial node is set via SET_ACTIVE_NODE action, not here
    applyGraph: assign({
      graph: ({ event }) => {
        if (event.type === 'APPLY_GRAPH') {
          return event.graph;
        }
        return { scenes: [] };
      },
    }),

    // Navigate to next node
    // Calls navigationStore.advance() directly (single source of truth)
    goNext: () => {
      useNavigationStore.getState().advance('forward');
    },

    // Navigate to previous node
    // Calls navigationStore.advance() directly (single source of truth)
    goPrev: () => {
      useNavigationStore.getState().advance('backward');
    },

    // Initialize navigationStore with loaded story data
    initializeStore: ({ event }) => {
      // This action is only called from onDone, so we know event has output
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doneEvent = event as any;

      if (!doneEvent.output?.fullStory) {
        console.error('[NavigationMachine] initializeStore: No story data in event', event);
        return;
      }

      console.log('[NavigationMachine] Initializing store with', doneEvent.output.fullStory.length, 'scenes');

      // Load scenes into store
      setScenes(doneEvent.output.fullStory);

      // Navigate to first node
      const store = useNavigationStore.getState();
      const firstNodeId = store.graph.order[0];
      if (firstNodeId) {
        console.log('[NavigationMachine] Navigating to first node:', firstNodeId.substring(0, 8));
        // Use forceAdvance to set initial position
        while (store.currentId !== firstNodeId) {
          store.forceAdvance('forward');
        }
      }
    },

    // Assign boot error to context
    assignBootError: assign({
      bootError: ({ event }) => {
        if (event.type === 'STORY_LOAD_FAILED') {
          return {
            message: event.error,
            timestamp: new Date().toISOString(),
          };
        }
        return null;
      },
    }),

    // Clear boot error
    clearBootError: assign({
      bootError: null,
    }),
  },
  guards: {
    // Check if current node is dialogue type
    // Uses convenience method to get scene type
    isDialogue: () => {
      const type = useNavigationStore.getState().getCurrentSceneType();
      return type === 'character' || type === 'character-flow';
    },
    // Check if current node is image type
    // Uses convenience method to get scene type
    isImage: () => {
      const type = useNavigationStore.getState().getCurrentSceneType();
      return type === 'image';
    },
  },
}).createMachine({
  id: 'navigation',
  initial: 'boot',
  context: {
    storyId: undefined,
    graph: { scenes: [] },
    bootError: null,
  },
  on: {
    // Note: Global event handlers go here if needed
  },
  states: {
    /**
     * BOOT
     * Initial phase - loads the story before navigation can begin
     */
    boot: {
      initial: 'waiting_for_story',
      entry: () => console.log('[NavigationMachine] Entered boot state'),
      states: {
        /**
         * WAITING_FOR_STORY
         * Wait for LOAD_STORY_REQUESTED event before starting the load
         */
        waiting_for_story: {
          entry: () => console.log('[NavigationMachine] Waiting for story load request...'),
          on: {
            LOAD_STORY_REQUESTED: {
              actions: ['assignStoryId', 'clearBootError'],
              target: 'loading_story',
            },
          },
        },

        /**
         * LOADING_STORY
         * Invokes the story loader service
         */
        loading_story: {
          invoke: {
            id: 'loadStory',
            src: 'loadStory',
            input: ({ context }) => ({ storyId: context.storyId || '' }),
            onDone: {
              // Transition to scene.navigating, then route to correct scene type
              target: '#navigation.scene.navigating',
              actions: [
                () => console.log('[NavigationMachine] Story loaded successfully!'),
                // Apply the minimal graph to machine context
                assign({
                  graph: ({ event }) => event.output.minimalGraph,
                }),
                // Initialize navigationStore with loaded scenes
                'initializeStore',
                () => console.log('[NavigationMachine] Transitioning to scene.navigating...'),
              ],
            },
            onError: {
              target: 'error',
              actions: assign({
                bootError: ({ event }) => ({
                  message: event.error instanceof Error ? event.error.message : String(event.error),
                  timestamp: new Date().toISOString(),
                }),
              }),
            },
          },
        },


        /**
         * ERROR
         * Story loading failed, wait for retry
         */
        error: {
          on: {
            LOAD_STORY_REQUESTED: {
              target: 'loading_story',
              actions: ['assignStoryId', 'clearBootError'],
            },
          },
        },
      },
    },

    /**
     * SCENE
     * XState-driven navigation router. Handles scroll events, triggers navigationStore updates,
     * and routes to the correct child scene type (dialogue, image, etc.) based on navigationStore.currentId.
     */
    scene: {
      initial: 'route',
      on: {
        // Global APPLY_GRAPH handler - can receive graph from boot or runtime
        APPLY_GRAPH: {
          actions: 'applyGraph',
          target: '.route',
        },
        // Handle navigation requests (kept for backwards compatibility)
        REQUEST_NAV_NEXT: {
          actions: 'goNext',
          target: '.navigating',
        },
        REQUEST_NAV_PREV: {
          actions: 'goPrev',
          target: '.navigating',
        },
      },
      states: {
        /**
         * NAVIGATING
         * Transient state - processes queued commands synchronously, then immediately routes
         * Since commands now execute synchronously, we can route immediately via 'always'
         */
        navigating: {
          on: {
            // Ignore scroll events while navigating
            SCROLL_DOWN_STEP: {},
            SCROLL_UP_STEP: {},
          },
          always: {
            // Commands execute synchronously now, so store is already updated - route immediately
            target: 'route',
          },
        },

        /**
         * ROUTE
         * Immediate routing state - checks navigationStore.currentId and branches to correct child
         * Ignores scroll events while routing to prevent race conditions
         */
        route: {
          on: {
            // Ignore scroll events while routing - they'll be handled by the child state
            SCROLL_DOWN_STEP: {},
            SCROLL_UP_STEP: {},
          },
          always: [
            {
              guard: 'isImage',
              target: 'image',
            },
            {
              guard: 'isDialogue',
              target: 'dialogue',
            },
            {
              target: 'unknown',
            },
          ],
        },

        /**
         * DIALOGUE scene
         * Handles dialogue flows with phase management (basic → quest → input)
         * Uses store.advance() which automatically handles phase transitions
         */
        dialogue: {
          on: {
            SCROLL_DOWN_STEP: {
              actions: [
                'goNext',
                () => console.log('[NavigationMachine] SCROLL_DOWN_STEP in dialogue → goNext'),
              ],
              target: '#navigation.scene.route',
            },
            SCROLL_UP_STEP: {
              actions: [
                'goPrev',
                () => console.log('[NavigationMachine] SCROLL_UP_STEP in dialogue → goPrev'),
              ],
              target: '#navigation.scene.route',
            },
          },
        },

        /**
         * IMAGE scene
         * Handles image display with caption phases (image_only → caption)
         * Uses store.advance() which automatically handles phase transitions
         */
        image: {
          on: {
            SCROLL_DOWN_STEP: {
              actions: [
                'goNext',
                () => console.log('[NavigationMachine] SCROLL_DOWN_STEP in image → goNext'),
              ],
              target: '#navigation.scene.route',
            },
            SCROLL_UP_STEP: {
              actions: [
                'goPrev',
                () => console.log('[NavigationMachine] SCROLL_UP_STEP in image → goPrev'),
              ],
              target: '#navigation.scene.route',
            },
          },
        },

        /**
         * UNKNOWN scene type (safety net)
         */
        unknown: {
          entry: () => {
            const node = useNavigationStore.getState().getCurrentNode();
            console.warn('[NavigationMachine] Unknown scene type:', node?.scene?.type);
          },
          on: {
            // Fallback: allow scrolling through unknown scenes
            SCROLL_DOWN_STEP: {
              actions: 'goNext',
              target: '#navigation.scene.route',
            },
            SCROLL_UP_STEP: {
              actions: 'goPrev',
              target: '#navigation.scene.route',
            },
          },
        },
      },
    },

    // Add more states here as you migrate features from the old architecture
  },
});

// echoActiveNodeIfChanged removed - no longer needed with XState routing
