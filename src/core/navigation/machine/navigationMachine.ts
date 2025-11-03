/**
 * Navigation State Machine
 *
 * This is the single source of truth for navigation flow logic.
 * It accepts domain events and emits action intents that become commands.
 *
 * States will be added incrementally as features are migrated to the new architecture.
 *
 * REFACTORED: Complex business logic moved to orchestrators and services
 * - AI logic → AIOrchestrator
 * - Recording logic → RecordPanelOrchestrator
 * - Story loading → loadStoryService
 * - Machine now handles ONLY state transitions and coordination
 *
 * @module navigationMachine
 */

import { setup, assign, fromPromise } from 'xstate';
import type { NavigationEvent, NavigationContext } from './types';
import { loadStoryService } from '@core/data/services/loadStoryService';
import { callAIService, setConversationMetadata, createAndInsertAIResponseScene } from '@core/ai/AIOrchestrator';
import { useNavigationStore } from '../navigationStore';
import { getCurrentNodeId, getCurrentNode, initializeStoreWithStory } from '../navigationHelpers';

/**
 * Navigation State Machine
 *
 * This machine orchestrates the navigation flow without directly mutating the graph.
 * It receives domain events, makes decisions, and emits action intents.
 *
 * Complex business logic lives in orchestrators and services, not in the machine.
 */
export const navigationMachine = setup({
  types: {
    context: {} as NavigationContext,
    events: {} as NavigationEvent,
  },
  actors: {
    // Story loading actor - pure async service
    loadStory: fromPromise(async ({ input }: { input: { storyId: string } }) => {
      return await loadStoryService(input);
    }),
    // AI call actor - pure async service
    callAI: fromPromise(async ({ input }: {
      input: { questionText: string; conversationId: string | undefined }
    }) => {
      return await callAIService(input);
    }),
  },
  actions: {
    // =============================================================================
    // Simple Context Updates
    // =============================================================================

    assignStoryId: assign({
      storyId: ({ event }) => {
        if (event.type === 'LOAD_STORY_REQUESTED') {
          return event.storyId;
        }
        return undefined;
      },
    }),

    applyGraph: assign({
      graph: ({ event }) => {
        if (event.type === 'APPLY_GRAPH') {
          return event.graph;
        }
        return { scenes: [] };
      },
    }),

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

    clearBootError: assign({
      bootError: null,
    }),

    // =============================================================================
    // Navigation Actions - Delegate to store
    // =============================================================================

    goNext: () => {
      useNavigationStore.getState().advance('forward');
    },

    goPrev: () => {
      useNavigationStore.getState().advance('backward');
    },

    // =============================================================================
    // Story Initialization - Delegate to helper
    // =============================================================================

    initializeStore: ({ event }) => {
      // This action is only called from onDone, so we know event has output
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doneEvent = event as any;

      if (!doneEvent.output?.fullStory) {
        console.error('[NavigationMachine] initializeStore: No story data in event', event);
        return;
      }

      console.log('[NavigationMachine] Initializing store with', doneEvent.output.fullStory.length, 'scenes');

      // Store conversation metadata for AI processing (module-level in AIOrchestrator)
      if (doneEvent.output.flowMetadata) {
        setConversationMetadata(doneEvent.output.flowMetadata);
      }

      // Initialize store with scenes (helper handles graph building and navigation)
      initializeStoreWithStory(doneEvent.output.fullStory);
    },

    // =============================================================================
    // Transcript Storage - Simple store update
    // =============================================================================

    storeTranscriptInScene: ({ event }) => {
      if (event.type !== 'RECORDING_PROCESSED') return;

      const { transcript } = event;

      if (!transcript || !transcript.trim()) {
        console.warn('[NavigationMachine] Received empty transcript, skipping store');
        return;
      }

      console.log('[NavigationMachine] 📝 Storing transcript in scene:', transcript.substring(0, 50));

      // Update current scene with transcript
      useNavigationStore.getState().updateCurrentSceneProperties({
        text: transcript,        // For display
        questionText: transcript // For AI input
      });

      console.log('[NavigationMachine] ✅ Transcript stored successfully');
    },

    // =============================================================================
    // AI Response Scene Creation - Delegate to AIOrchestrator
    // =============================================================================

    createAIResponseScene: ({ event }) => {
      // Extract response data from event (handles both actor completion and legacy events)
      let responseText: string | undefined;
      let conversationId: string | undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ('output' in event && (event as any).output) {
        // Actor completion (onDone)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const output = (event as any).output;
        responseText = output.responseText;
        conversationId = output.conversationId;
      } else if (event.type === 'RECEIVED_AI_RESPONSE') {
        // Legacy event (ChatFlowOrchestrator)
        responseText = event.responseText;
        conversationId = event.conversationId;
      }

      if (!responseText) {
        console.warn('[NavigationMachine] No response text in event, skipping scene creation');
        return;
      }

      const currentNodeId = getCurrentNodeId();
      if (!currentNodeId) {
        console.error('[NavigationMachine] No current node, cannot create AI response scene');
        return;
      }

      // Delegate everything to AIOrchestrator
      createAndInsertAIResponseScene({
        responseText,
        conversationId,
        currentNodeId,
      });
    },
  },
  guards: {
    // Check if current node is in input phase
    isInput: () => {
      const currentPhase = useNavigationStore.getState().getCurrentPhase();
      return currentPhase === 'input' || currentPhase === 'input-showInput';
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
              target: '#navigation.scene.navigating',
              actions: [
                () => console.log('[NavigationMachine] Story loaded successfully!'),
                assign({
                  graph: ({ event }) => event.output.minimalGraph,
                }),
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
     * XState-driven navigation router
     */
    scene: {
      initial: 'route',
      on: {
        APPLY_GRAPH: {
          actions: 'applyGraph',
          target: '.route',
        },
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
         * Transient state - routes immediately after navigation completes
         */
        navigating: {
          on: {
            SCROLL_DOWN_STEP: {},
            SCROLL_UP_STEP: {},
          },
          always: {
            target: 'route',
          },
        },

        /**
         * ROUTE
         * Immediate routing state - checks phase and branches to correct child
         */
        route: {
          entry: () => {
            const phase = useNavigationStore.getState().getCurrentPhase();
            console.log('[NavigationMachine] 🔀 Routing... current phase:', phase);
          },
          on: {
            SCROLL_DOWN_STEP: {},
            SCROLL_UP_STEP: {},
          },
          always: [
            {
              guard: 'isInput',
              target: 'dialogueInput',
            },
            {
              target: 'unknown',
            },
          ],
        },

        /**
         * DIALOGUE INPUT scene
         * When in input phase, block scroll navigation and wait for recording to start
         */
        dialogueInput: {
          entry: () => console.log('[NavigationMachine] 🎯 Entered dialogueInput state'),
          on: {
            // Block scroll down - do nothing when in input phase
            SCROLL_DOWN_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ SCROLL_DOWN blocked in dialogueInput'),
            },
            SCROLL_UP_STEP: {
              actions: [
                () => console.log('[NavigationMachine] ⬆️  SCROLL_UP_STEP in dialogueInput → calling goPrev'),
                'goPrev',
              ],
              target: '#navigation.scene.route',
            },
            // RECORDING_STARTED event comes from RecordPanelOrchestrator AFTER it completes the complex flow
            // Orchestrator handles: recording start, scene creation, insertion, navigation, phase update
            // Machine just transitions state to track that we're recording
            RECORDING_STARTED: {
              actions: () => console.log('[NavigationMachine] 🎙️  Recording started by orchestrator'),
              target: 'askRecording',
            },
            // Handle recording failure
            RECORDING_FAILED: {
              actions: ({ event }) => console.error('[NavigationMachine] ❌ Recording failed:', event.error),
              // Stay in dialogueInput to allow retry
            },
          },
        },

        /**
         * ASK RECORDING state
         * User is actively recording their question
         * Waits for RECORDING_STOPPED event
         */
        askRecording: {
          entry: () => console.log('[NavigationMachine] 🎙️  Entered askRecording state - user is recording'),
          on: {
            // Block all navigation while recording
            SCROLL_DOWN_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ SCROLL blocked during recording'),
            },
            SCROLL_UP_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ SCROLL blocked during recording'),
            },
            // When user stops recording, move to processing
            RECORDING_STOPPED: {
              actions: () => console.log('[NavigationMachine] 🛑 Recording stopped → processing'),
              target: 'askProcessing',
            },
          },
        },

        /**
         * ASK PROCESSING state
         * Recording is being transcribed by backend
         * Waits for RECORDING_PROCESSED event with transcript
         */
        askProcessing: {
          entry: [
            () => console.log('[NavigationMachine] ⚙️  Entered askProcessing state - transcribing audio'),
            () => useNavigationStore.getState().updateCurrentPhase('input-processing'),
          ],
          on: {
            // Block navigation while processing
            SCROLL_DOWN_STEP: {},
            SCROLL_UP_STEP: {},
            // When transcript is ready, store it and move to AI waiting
            RECORDING_PROCESSED: {
              actions: [
                'storeTranscriptInScene',
                () => console.log('[NavigationMachine] ✅ Transcript stored → waiting for AI')
              ],
              target: 'askWaitingForAI',
            },
          },
        },

        /**
         * ASK WAITING FOR AI state
         * Transcript is ready, invoking AI service to generate response
         */
        askWaitingForAI: {
          entry: [
            () => console.log('[NavigationMachine] 🤖 Entered askWaitingForAI - invoking AI service'),
            () => useNavigationStore.getState().updateCurrentPhase('ai-waiting'),
          ],
          invoke: {
            id: 'callAI',
            src: 'callAI',
            input: () => {
              // Extract questionText and conversationId from current scene
              const scene = getCurrentNode()?.scene;
              const questionText = (scene as { questionText?: string })?.questionText;
              const conversationId = (scene as { conversationId?: string })?.conversationId;

              console.log('[NavigationMachine] 📥 Preparing AI input:', {
                questionText: questionText?.substring(0, 50),
                conversationId,
                hasQuestionText: !!questionText,
                hasConversationId: !!conversationId
              });

              return {
                questionText: questionText || '',
                conversationId
              };
            },
            onDone: {
              target: '#navigation.scene.route',
              actions: [
                'createAIResponseScene',
                () => console.log('[NavigationMachine] ✅ AI service completed successfully')
              ]
            },
            onError: {
              target: 'dialogueInput',
              actions: [
                ({ event }) => console.error('[NavigationMachine] ❌ AI service failed:', event.error),
                () => useNavigationStore.getState().updateCurrentPhase('input')
              ]
            }
          },
          on: {
            // Block navigation while AI is processing
            SCROLL_DOWN_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ Scroll blocked while AI processing')
            },
            SCROLL_UP_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ Scroll blocked while AI processing')
            },
            // Legacy event handler for backward compatibility with ChatFlowOrchestrator
            RECEIVED_AI_RESPONSE: {
              target: '#navigation.scene.route',
              actions: [
                'createAIResponseScene',
                () => console.log('[NavigationMachine] ✅ Received AI response via legacy event')
              ]
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
  },
});
