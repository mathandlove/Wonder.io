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

import { setup, assign, fromPromise, sendTo } from 'xstate';
import type { NavigationEvent, NavigationContext, NavigationAction, MachineGraphNode, MachineGraph } from './types';
import { loadStory } from '@core/data/loadStory';
import { imageSceneMachine } from '@core/scenes/image/imageSceneMachine';
import { buildNavigationGraph } from '../navigationGraphBuilder';
import { useNavigationStore } from '../navigationStore';

/**
 * Helper: Get current node from context
 */
function getNode(context: NavigationContext): MachineGraphNode | undefined {
  if (!context.activeNodeId) return undefined;
  return context.graph.scenes.find(s => s.id === context.activeNodeId);
}

/**
 * Helper: Get next node ID
 */
function getNextId(context: NavigationContext): string | undefined {
  const currentId = context.activeNodeId;
  if (!currentId) return undefined;

  // Use edges if available
  if (context.graph.edges?.[currentId]?.next) {
    return context.graph.edges[currentId].next;
  }

  // Otherwise use array index
  const currentIndex = context.graph.scenes.findIndex(s => s.id === currentId);
  if (currentIndex === -1 || currentIndex >= context.graph.scenes.length - 1) {
    return undefined; // At end
  }

  return context.graph.scenes[currentIndex + 1]?.id;
}

/**
 * Helper: Get previous node ID
 */
function getPrevId(context: NavigationContext): string | undefined {
  const currentId = context.activeNodeId;
  if (!currentId) return undefined;

  // Use edges if available
  if (context.graph.edges?.[currentId]?.prev) {
    return context.graph.edges[currentId].prev;
  }

  // Otherwise use array index
  const currentIndex = context.graph.scenes.findIndex(s => s.id === currentId);
  if (currentIndex <= 0) {
    return undefined; // At start
  }

  return context.graph.scenes[currentIndex - 1]?.id;
}

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
    imageSceneMachine,
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

    // Apply graph and initial node from APPLY_GRAPH event
    applyGraph: assign({
      graph: ({ event }) => {
        if (event.type === 'APPLY_GRAPH') {
          return event.graph;
        }
        return { scenes: [] };
      },
      activeNodeId: ({ event }) => {
        if (event.type === 'APPLY_GRAPH') {
          return event.initialNodeId;
        }
        return undefined;
      },
    }),

    // Navigate to next node
    goNext: assign({
      activeNodeId: ({ context }) => {
        const nextId = getNextId(context);
        if (nextId) {
          console.log('[NavigationMachine] goNext:', context.activeNodeId, '→', nextId);
          return nextId;
        }
        console.log('[NavigationMachine] goNext: at end, staying at', context.activeNodeId);
        return context.activeNodeId; // Stay at current if at end
      },
    }),

    // Navigate to previous node
    goPrev: assign({
      activeNodeId: ({ context }) => {
        const prevId = getPrevId(context);
        if (prevId) {
          console.log('[NavigationMachine] goPrev:', context.activeNodeId, '→', prevId);
          return prevId;
        }
        console.log('[NavigationMachine] goPrev: at start, staying at', context.activeNodeId);
        return context.activeNodeId; // Stay at current if at start
      },
    }),

    // Emit actions by adding them to context.pendingActions
    emitBootActions: assign({
      pendingActions: ({ context, event }) => {
        if (event.type !== 'STORY_LOADED') {
          return context.pendingActions || [];
        }

        const actions: NavigationAction[] = [
          {
            type: 'APPLY_GRAPH',
            graph: event.graph,
          },
          {
            type: 'SET_ACTIVE_NODE',
            nodeId: event.initialNodeId,
          },
          {
            type: 'RESET_TEMP_NODES',
          },
        ];

        console.log('[NavigationMachine] Emitted', actions.length, 'boot actions');
        return [...(context.pendingActions || []), ...actions];
      },
    }),

    // Clear pendingActions after they've been processed
    clearPendingActions: assign({
      pendingActions: [],
    }),

    // Emit phase update action when child machine changes phase
    emitPhaseUpdate: assign({
      pendingActions: ({ context, event }) => {
        if (event.type !== 'UPDATE_NODE_PHASE') {
          return context.pendingActions || [];
        }

        // Use navigationStore's currentId as the source of truth
        // The child machine's nodeId might not match the actual store node ID
        const store = useNavigationStore.getState();
        const actualNodeId = store.currentId;

        if (!actualNodeId) {
          console.warn('[NavigationMachine] Cannot emit UPDATE_NODE_PHASE - no current node in store');
          return context.pendingActions || [];
        }

        const action: NavigationAction = {
          type: 'UPDATE_NODE_PHASE',
          nodeId: actualNodeId,
          phase: event.phase,
        };

        console.log('[NavigationMachine] Emitting UPDATE_NODE_PHASE action for node:', actualNodeId.substring(0, 8), 'phase:', event.phase);
        return [...(context.pendingActions || []), action];
      },
    }),

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
    isDialogue: ({ context }) => {
      const node = getNode(context);
      return node?.type === 'dialogue';
    },
    // Check if current node is image type
    isImage: ({ context }) => {
      const node = getNode(context);
      return node?.type === 'image';
    },
  },
}).createMachine({
  id: 'navigation',
  initial: 'boot',
  context: {
    storyId: undefined,
    graph: { scenes: [] },
    activeNodeId: undefined,
    bootError: null,
    pendingActions: [],
  },
  on: {
    // Global handler for ACTIONS_FLUSHED - clears pendingActions from any state
    ACTIONS_FLUSHED: {
      actions: 'clearPendingActions',
    },
    // Note: ACTIVE_NODE_CHANGED is NOT handled globally.
    // It's handled by individual scene states to enable proper routing.
    // The child states (dialogue, image, unknown) transition back to scene.waiting,
    // which then routes to the correct scene type based on the node payload.
  },
  states: {
    /**
     * BOOT
     * Initial phase - loads the story before navigation can begin
     */
    boot: {
      initial: 'waiting_for_story',
      states: {
        /**
         * WAITING_FOR_STORY
         * Wait for LOAD_STORY_REQUESTED event before starting the load
         */
        waiting_for_story: {
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
              // Transition to scene.route - it will receive APPLY_GRAPH via raise
              target: '#navigation.scene.route',
              actions: [
                // Apply the minimal graph to machine context
                assign({
                  graph: ({ event }) => event.output.minimalGraph,
                  activeNodeId: ({ event }) => event.output.initialNodeId,
                }),
                // Queue actions to apply the full graph to navigationStore
                assign({
                  pendingActions: ({ context, event }) => {
                    const actions: NavigationAction[] = [
                      {
                        type: 'APPLY_GRAPH',
                        graph: { scenes: event.output.fullStory, flowMetadata: event.output.flowMetadata },
                      },
                      {
                        type: 'SET_ACTIVE_NODE',
                        nodeId: event.output.initialNodeId,
                      },
                      {
                        type: 'RESET_TEMP_NODES',
                      },
                    ];

                    console.log('[NavigationMachine] Boot complete, queuing', actions.length, 'store actions');
                    return [...(context.pendingActions || []), ...actions];
                  },
                }),
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
     * DIALOGUE
     * Main dialogue flow states
     */
    dialogue: {
      initial: 'input',
      states: {
        /**
         * INPUT
         * Waiting for user input (recording or interaction)
         */
        input: {
          on: {
            // Add event transitions here as features are migrated
          },
        },
      },
    },

    /**
     * SCENE
     * XState-driven navigation router. Handles scroll events, updates activeNodeId,
     * and routes to the correct child scene type (dialogue, image, etc.).
     */
    scene: {
      initial: 'route',
      on: {
        // Global APPLY_GRAPH handler - can receive graph from boot or runtime
        APPLY_GRAPH: {
          actions: 'applyGraph',
          target: '.route',
        },
        // Handle navigation requests from children
        // Note: SCROLL_* events are NOT handled here - they go to child machines first
        // Children send REQUEST_NAV_* when they're ready to navigate
        REQUEST_NAV_NEXT: {
          actions: 'goNext',
          target: '.route',
        },
        REQUEST_NAV_PREV: {
          actions: 'goPrev',
          target: '.route',
        },
        // Handle phase updates from child machines
        UPDATE_NODE_PHASE: {
          actions: 'emitPhaseUpdate',
        },
      },
      states: {
        /**
         * ROUTE
         * Immediate routing state - checks context.activeNodeId and branches to correct child
         */
        route: {
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
         * Handles dialogue flows - will invoke dialogue child machine later
         */
        dialogue: {
          // TODO: Invoke dialogue child machine here
          // invoke: {
          //   src: 'dialogueSceneMachine',
          //   input: ({ context }) => ({ nodeId: context.activeNodeId, ... }),
          // },
          on: {
            // Temporary: Until we have dialogueSceneMachine, handle scrolls directly
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

        /**
         * IMAGE scene
         * Handles image display with caption phases
         * Invokes the image child machine that manages image_only → caption transitions
         * Phase is read from navigationStore and updated via UPDATE_NODE_PHASE commands
         */
        image: {
          entry: ({ context }) => {
            console.log('[NavigationMachine] Entering scene.image for node:', context.activeNodeId);
          },
          invoke: {
            id: 'imageSceneMachine',
            src: 'imageSceneMachine',
            input: () => {
              // Read phase from navigationStore (source of truth)
              const store = useNavigationStore.getState();
              const currentNodeId = store.currentId;
              const node = currentNodeId ? store.graph.byId[currentNodeId] : null;
              const phase = (node?.phase as 'image_only' | 'caption') || 'image_only';

              console.log('[NavigationMachine] Invoking imageSceneMachine with phase from store:', phase, 'for node:', currentNodeId?.substring(0, 8));
              return { phase };
            },
            onError: (error) => {
              console.error('[NavigationMachine] imageSceneMachine error:', error);
            },
          },
          on: {
            // Forward scroll events to the child machine using sendTo
            SCROLL_DOWN_STEP: {
              actions: [
                sendTo('imageSceneMachine', ({ event }) => event),
                () => console.log('[NavigationMachine] Forwarded SCROLL_DOWN_STEP to imageSceneMachine'),
              ],
            },
            SCROLL_UP_STEP: {
              actions: [
                sendTo('imageSceneMachine', ({ event }) => event),
                () => console.log('[NavigationMachine] Forwarded SCROLL_UP_STEP to imageSceneMachine'),
              ],
            },
          },
        },

        /**
         * UNKNOWN scene type (safety net)
         */
        unknown: {
          entry: ({ context }) => {
            console.warn('[NavigationMachine] Unknown scene type for node:', context.activeNodeId);
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
