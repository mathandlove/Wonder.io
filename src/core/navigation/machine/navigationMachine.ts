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
import { loadStory, type ConversationMetadataMap } from '@core/data/loadStory';
import { buildNavigationGraph } from '../navigationGraphBuilder';
import { useNavigationStore } from '../navigationStore';
import { setScenes, getCurrentNodeId, getCurrentNode, insertSceneNodes, advanceNavigation, updateCurrentPhase } from '../navigationHelpers';
import { Recording } from '@core/recording/RecordingAPI';
import { createRecordingScene, createAIResponseScene as createAIResponseSceneFactory } from '../sceneFactoryFunctions';
import { callAI, type ConversationMessage } from '@features/ai/aiService';

// Helper functions removed - navigationStore is now the single source of truth
// Navigation logic (next/prev) is handled by navigationStore.advance()

/**
 * Module-level storage for conversation metadata
 * This is populated when a story is loaded and accessed during AI processing
 * Using module-level storage because XState machine can't access React context
 */
let currentConversationMetadata: ConversationMetadataMap = {};

/**
 * Get conversation metadata for a specific conversationId
 * Used by AI processing to get character descriptions
 */
export function getConversationMetadata(conversationId: string | undefined) {
  if (!conversationId) return undefined;
  return currentConversationMetadata[conversationId];
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
 * AI Call Service
 * Invoked during askWaitingForAI state to process user's question
 *
 * This service:
 * 1. Extracts conversationId from input
 * 2. Looks up characterDescription from conversation metadata
 * 3. Retrieves conversation history (TODO: implement history storage)
 * 4. Calls AI backend with context
 * 5. Returns AI response or throws error
 */
const callAIService = fromPromise(async ({ input }: {
  input: {
    questionText: string;
    conversationId: string | undefined;
  }
}) => {
  console.log('[NavigationMachine] 🤖 AI Service called with:', {
    questionText: input.questionText?.substring(0, 50),
    conversationId: input.conversationId
  });

  // Validate input
  if (!input.questionText?.trim()) {
    throw new Error('Question text is required for AI processing');
  }

  if (!input.conversationId) {
    throw new Error('ConversationId is required for AI processing');
  }

  // Get conversation metadata (character description)
  const metadata = getConversationMetadata(input.conversationId);

  if (!metadata) {
    throw new Error(`No conversation metadata found for conversationId: ${input.conversationId}`);
  }

  if (!metadata.characterDescription) {
    throw new Error(`No character description in metadata for conversationId: ${input.conversationId}`);
  }

  console.log('[NavigationMachine] ✅ Found character description:',
    metadata.characterDescription.substring(0, 50) + '...');

  // TODO: Get conversation history from AIMemoryStore
  // For now, start with empty history
  const conversationHistory: ConversationMessage[] = [];

  // Call AI service
  const response = await callAI({
    questionText: input.questionText,
    characterDescription: metadata.characterDescription,
    conversationHistory
  });

  // Check if AI call succeeded
  if (!response.success) {
    throw new Error(response.error || 'AI call failed without error message');
  }

  console.log('[NavigationMachine] 💬 AI response received:',
    response.text.substring(0, 50) + '...');

  // Return response with conversationId for scene creation
  return {
    responseText: response.text,
    conversationId: input.conversationId
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
    callAI: callAIService,
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

      // Store conversation metadata for AI processing
      if (doneEvent.output.flowMetadata) {
        currentConversationMetadata = doneEvent.output.flowMetadata;
        console.log('[NavigationMachine] Stored conversation metadata:', Object.keys(currentConversationMetadata));
      }

      // Load scenes into store
      setScenes(doneEvent.output.fullStory);

      // Navigate to first node
      const store = useNavigationStore.getState();
      const firstNodeId = store.graph.order[0];
      if (firstNodeId) {
        console.log('[NavigationMachine] Navigating to first node:', firstNodeId.substring(0, 8));
        // Set initial position directly - no frozen node needed for very first load
        useNavigationStore.setState({
          currentId: firstNodeId,
          lastFrozenNode: null, // No previous node on initial load
          graph: {
            ...store.graph,
            currentId: firstNodeId,
          }
        });
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

    // Handle Ask button click - start recording flow
    // This action is called when user clicks Ask button in input phase
    // It creates a new recording scene and navigates to it
    handleAskButtonClicked: async () => {
      try {
        // Generate unique recording ID
        const recordingId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // STEP 1: START RECORDING IMMEDIATELY (critical for responsiveness)
        await Recording.start().catch((err) => {
          console.error('[NavigationMachine] Failed to start recording:', err);
          throw err; // Re-throw to prevent state updates on failure
        });

        // STEP 2: Update current node phase from input to basic
        updateCurrentPhase('basic');

        // STEP 3: Get current scene context for inheritance
        const currentNode = getCurrentNode();
        const currentNodeId = getCurrentNodeId();
        const scene = currentNode?.scene;

        // Extract scene properties to inherit
        const currentBackground = scene && 'background' in scene ? scene.background : undefined;
        const leftCharacter = scene && 'left-character' in scene ? (scene as { 'left-character'?: string })['left-character'] : 'leo';
        const rightCharacter = scene && 'right-character' in scene ? (scene as { 'right-character'?: string })['right-character'] : 'bakerMom';
        const conversationId = scene && 'conversationId' in scene ? (scene as { conversationId?: string }).conversationId : undefined;

        // STEP 4: Create recording scene using pure factory function (with conversationId inheritance)
        const newScene = createRecordingScene(
          recordingId,
          conversationId, // Pass conversationId so recording scene has AI context
          currentBackground,
          leftCharacter,
          rightCharacter
        );

        // STEP 5: Insert scene into graph
        console.log('[NavigationMachine] Inserting recording scene after node:', currentNodeId);
        const newNodeId = insertSceneNodes(currentNodeId, newScene);

        // STEP 6: Navigate forward to the new recording scene
        console.log('[NavigationMachine] Navigating to recording scene');
        advanceNavigation('forward');

        // STEP 7: Transition new scene to input-recording phase
        // This must happen AFTER navigation so the new node is current
        console.log('[NavigationMachine] Transitioning to input-recording phase');
        useNavigationStore.getState().updateNodePhase(newNodeId, 'input-recording');

        console.log('[NavigationMachine] Ask button flow completed successfully');
      } catch (error) {
        console.error('[NavigationMachine] Ask button flow failed:', error);
        // Silent error handling - recording failed to start
      }
    },

    // Store transcript in scene when RECORDING_PROCESSED event arrives
    // This replaces the direct store mutation from RecordPanelOrchestrator
    // XState now controls all state mutations (unidirectional data flow)
    storeTranscriptInScene: ({ event }) => {
      if (event.type !== 'RECORDING_PROCESSED') return;

      const { transcript } = event;

      if (!transcript || !transcript.trim()) {
        console.warn('[NavigationMachine] Received empty transcript, skipping store');
        return;
      }

      console.log('[NavigationMachine] 📝 Storing transcript in scene:', transcript.substring(0, 50));

      // Update current scene with transcript
      // This makes the transcript available for:
      // 1. Display in the UI (scene.text)
      // 2. AI processing (scene.questionText)
      useNavigationStore.getState().updateCurrentSceneProperties({
        text: transcript,        // For display
        questionText: transcript // For AI input
      });

      console.log('[NavigationMachine] ✅ Transcript stored successfully');
    },

    // Process AI request - extract transcript and trigger AI processing
    // Called when entering askWaitingForAI state
    processAIRequest: async () => {
      try {
        const currentNode = getCurrentNode();
        if (!currentNode) {
          console.error('[NavigationMachine] No current node for AI processing');
          return;
        }

        // Extract transcript from scene
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scene = currentNode.scene as any;
        const questionText = scene?.questionText;

        if (!questionText || !questionText.trim()) {
          console.error('[NavigationMachine] No question text available for AI processing');
          return;
        }

        console.log('[NavigationMachine] 🤖 Processing AI request with transcript:', questionText.substring(0, 50));

        // Note: The actual AI call is handled by ChatFlowOrchestratorComponent
        // which watches for the 'ai-waiting' phase we set in this state's entry
        // The AI response will come back via RECEIVED_AI_RESPONSE event
        // TODO: Refactor to directly call AI module here instead of relying on React component
        console.log('[NavigationMachine] ✅ AI processing delegated to ChatFlowOrchestratorComponent');
      } catch (error) {
        console.error('[NavigationMachine] Failed to process AI request:', error);
      }
    },

    // Create AI response scene and navigate to it
    // Called when AI actor completes (onDone) or RECEIVED_AI_RESPONSE event arrives (legacy)
    createAIResponseScene: ({ event }) => {
      // Handle both actor completion and legacy event
      let responseText: string;
      let conversationId: string | undefined;

      // Check if this is an actor completion event (onDone callback)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ('output' in event && (event as any).output) {
        // Actor completion - extract from output
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const output = (event as any).output;
        responseText = output.responseText;
        conversationId = output.conversationId;
        console.log('[NavigationMachine] 📦 AI actor completed, using output:', {
          responseText: responseText?.substring(0, 50),
          conversationId
        });
      } else if (event.type === 'RECEIVED_AI_RESPONSE') {
        // Legacy event path (still used by ChatFlowOrchestrator)
        responseText = event.responseText;
        conversationId = event.conversationId;
        console.log('[NavigationMachine] 📨 Using legacy RECEIVED_AI_RESPONSE event');
      } else {
        console.warn('[NavigationMachine] createAIResponseScene called with unexpected event type:', event.type);
        return;
      }

      try {
        // Get current scene context for inheritance
        const currentNode = getCurrentNode();
        const currentNodeId = getCurrentNodeId();
        const scene = currentNode?.scene;

        // Extract scene properties to inherit
        const currentBackground = scene && 'background' in scene ? scene.background : undefined;
        const leftCharacter = scene && 'left-character' in scene ? (scene as { 'left-character'?: string })['left-character'] : 'leo';
        const rightCharacter = scene && 'right-character' in scene ? (scene as { 'right-character'?: string })['right-character'] : 'bakerMom';

        // Create AI response scene
        const aiResponseScene = createAIResponseSceneFactory(
          responseText,
          conversationId,
          currentBackground,
          leftCharacter,
          rightCharacter
        );

        console.log('[NavigationMachine] Creating AI response scene with text:', responseText.substring(0, 50));

        // Update current node phase to 'basic' (collapse input UI)
        updateCurrentPhase('basic');

        // Insert the AI response scene after current node
        insertSceneNodes(currentNodeId, aiResponseScene);

        // Navigate forward to the new AI response scene
        advanceNavigation('forward');

        console.log('[NavigationMachine] AI response scene created and navigated');
      } catch (error) {
        console.error('[NavigationMachine] Failed to create AI response scene:', error);
      }
    },
  },
  guards: {
    // Check if current node is in input phase (either legacy 'input' or new 'input-showInput')
    // This is the phase where the Ask button is shown and recording can start
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
          entry: () => {
            const phase = useNavigationStore.getState().getCurrentPhase();
            console.log('[NavigationMachine] 🔀 Routing... current phase:', phase);
          },
          on: {
            // Ignore scroll events while routing - they'll be handled by the child state
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
         * DIALOGUE scene
         * Handles dialogue flows with phase management (basic → quest-showing → input)
         * Uses store.advance() which automatically handles phase transitions
         */
      

        /**
         * DIALOGUE INPUT scene
         * When in input phase, block scroll navigation and wait for Ask button click
         */
        dialogueInput: {
          entry: () => console.log('[NavigationMachine] 🎯 Entered dialogueInput state'),
          on: {
            // Block scroll down - do nothing when in input phase
            SCROLL_DOWN_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ SCROLL_DOWN blocked in dialogueInput (this is intentional)'),
              // Empty action - intentionally blocks navigation
            },
            SCROLL_UP_STEP: {
              actions: [
                () => console.log('[NavigationMachine] ⬆️  SCROLL_UP_STEP in dialogueInput → calling goPrev'),
                'goPrev',
              ],
              target: '#navigation.scene.route',
            },
            // Handle Ask button click - start recording and create scene
            ASK_BUTTON_CLICKED: {
              actions: [
                'handleAskButtonClicked',
                () => console.log('[NavigationMachine] 🎤 ASK_BUTTON_CLICKED → starting recording flow'),
              ],
              target: 'askRecording',
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
            () => updateCurrentPhase('input-processing'), // Update phase so transcript sync can detect it
          ],
          on: {
            // Block navigation while processing
            SCROLL_DOWN_STEP: {},
            SCROLL_UP_STEP: {},
            // When transcript is ready, store it and move to AI waiting
            RECORDING_PROCESSED: {
              actions: [
                'storeTranscriptInScene', // Store transcript in scene (XState controls mutation)
                () => console.log('[NavigationMachine] ✅ Transcript stored → waiting for AI')
              ],
              target: 'askWaitingForAI',
            },
          },
        },

        /**
         * ASK WAITING FOR AI state
         * Transcript is ready, invoking AI service to generate response
         *
         * This state invokes the callAI actor which:
         * 1. Extracts questionText and conversationId from current scene
         * 2. Looks up characterDescription from metadata
         * 3. Calls AI backend
         * 4. Returns response or throws error
         *
         * On success: Creates AI response scene and navigates
         * On error: Returns to input state for retry
         */
        askWaitingForAI: {
          entry: [
            () => console.log('[NavigationMachine] 🤖 Entered askWaitingForAI - invoking AI service'),
            () => updateCurrentPhase('ai-waiting'), // Update phase for UI consistency
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
              target: 'dialogueInput', // Return to input state on error
              actions: [
                ({ event }) => console.error('[NavigationMachine] ❌ AI service failed:', event.error),
                () => updateCurrentPhase('input') // Reset to input phase for retry
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
