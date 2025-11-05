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
import { callAIService, setConversationMetadata, createAndInsertAIResponseScene, validateAnswerService, getConversationMetadata, startFeedbackGeneration, getPendingFeedbackPromise, clearPendingFeedback } from '@core/ai/AIOrchestrator';
import { useNavigationStore } from '../navigationStore';
import { getCurrentNodeId, getCurrentNode, initializeStoreWithStory, insertSceneNodes, deleteNode } from '../navigationHelpers';
import { createAIResponseScene as createAIResponseSceneFactory } from '../sceneFactoryFunctions';
import { createDebugger } from '../../../utils/createDebug';

const debug = createDebugger('navigation:machine');

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
    // Answer validation actor - validates user's answer
    validateAnswer: fromPromise(async ({ input }: {
      input: { answerText: string; questionText?: string; successAnswer: string; conversationId?: string }
    }) => {
      return await validateAnswerService(input);
    }),
    // Success-dance creation actor - creates and inserts success-dance scene
    createSuccessDance: fromPromise(async ({ input }: {
      input: { answerRightNodeId: string }
    }) => {
      const { answerRightNodeId } = input;
      const store = useNavigationStore.getState();
      const answerRightNode = store.graph.byId[answerRightNodeId];

      if (!answerRightNode) {
        throw new Error(`Answer-right node not found: ${answerRightNodeId}`);
      }

      const scene = answerRightNode.scene;

      // Extract scene context for success-dance
      let character = 'bakerMom';
      let leftCharacter: string | undefined;
      let rightCharacter: string | undefined;
      let background: string | undefined;

      // Type guard for scenes with character properties
      type SceneWithCharacters = typeof scene & {
        'left-character'?: string;
        'right-character'?: string;
      };

      if ('left-character' in scene || 'right-character' in scene) {
        const charScene = scene as SceneWithCharacters;
        leftCharacter = charScene['left-character'];
        rightCharacter = charScene['right-character'];

        if (rightCharacter) {
          character = rightCharacter;
        } else if (leftCharacter) {
          character = leftCharacter;
        }
      }

      if ('background' in scene) {
        background = (scene as { background?: string }).background;
      }

      // Get answer text
      const answerText = (scene as { answerText?: string }).answerText || '';

      debug.log('🎨 Creating success-dance scene', {
        answerRightNodeId,
        character,
        leftCharacter,
        rightCharacter,
        background,
        answerText: answerText.substring(0, 50)
      });

      // Import scene factory
      const { createSuccessDanceScene } = await import('@core/navigation/sceneFactoryFunctions');

      // Create success-dance scene
      const successDanceScene = createSuccessDanceScene(
        character,
        answerText,
        background,
        leftCharacter,
        rightCharacter
      );

      // Insert scene after answer-right node
      const successDanceNodeId = insertSceneNodes(answerRightNodeId, successDanceScene);

      if (!successDanceNodeId) {
        throw new Error('Failed to insert success-dance scene');
      }

      debug.log('✅ Success-dance scene created and inserted', {
        successDanceNodeId,
        answerRightNodeId
      });

      return {
        successDanceNodeId,
        answerRightNodeId,
      };
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
    // Answer Wrong Flow - Track completion conditions
    // =============================================================================

    setFailVideoComplete: assign({
      failVideoComplete: true,
    }),

    setFeedbackReceived: assign({
      feedbackReceived: true,
    }),

    resetAnswerWrongFlags: assign({
      failVideoComplete: false,
      feedbackReceived: false,
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
        debug.error('initializeStore: No story data in event', event);
        return;
      }

      debug.log('Initializing store with', doneEvent.output.fullStory.length, 'scenes');

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
        debug.log('Received empty transcript, skipping store');
        return;
      }

      debug.log('📝 Storing transcript in scene:', transcript.substring(0, 50));

      // Update current scene with transcript
      useNavigationStore.getState().updateCurrentSceneProperties({
        text: transcript,        // For display
        questionText: transcript // For AI input
      });

      debug.log('✅ Transcript stored successfully');
    },

    // =============================================================================
    // Answer Storage - Simple store update for answer validation
    // =============================================================================

    storeAnswerInScene: ({ event }) => {
      if (event.type !== 'RECORDING_PROCESSED') return;

      const { transcript } = event;

      if (!transcript || !transcript.trim()) {
        debug.log('Received empty answer transcript, skipping store');
        return;
      }

      debug.log('📝 Storing answer in scene:', transcript.substring(0, 50));

      // Update current scene with answer text
      useNavigationStore.getState().updateCurrentSceneProperties({
        answerText: transcript // For validation
      });

      debug.log('✅ Answer stored successfully');
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
        debug.log('No response text in event, skipping scene creation');
        return;
      }

      const currentNodeId = getCurrentNodeId();
      if (!currentNodeId) {
        debug.error('No current node, cannot create AI response scene');
        return;
      }

      // Delegate everything to AIOrchestrator (SYNCHRONOUS)
      // This completes immediately - scene is created, inserted, and navigated to
      createAndInsertAIResponseScene({
        responseText,
        conversationId,
        currentNodeId,
      });

      debug.log('Scene creation completed synchronously');
    },

    // =============================================================================
    // Success-Dance Cleanup Actions
    // =============================================================================

    captureSuccessDanceNodeId: assign({
      successDanceNodeId: () => {
        const nodeId = useNavigationStore.getState().currentId;
        debug.log('📍 Captured success-dance node ID for cleanup:', nodeId);
        return nodeId || undefined;
      }
    }),

    navigateForwardFromSuccessDance: () => {
      debug.log('➡️  Navigating forward from success-dance');
      useNavigationStore.getState().advance('forward');

      const newNodeId = useNavigationStore.getState().currentId;
      debug.log('📍 New current node after navigation:', newNodeId);
    },

    deleteSuccessDanceNode: ({ context }) => {
      if (!context.successDanceNodeId) {
        debug.error('❌ No success-dance node ID to delete');
        return;
      }

      debug.log('🗑️  Deleting success-dance node:', context.successDanceNodeId);
      deleteNode(context.successDanceNodeId);
    },

    clearSuccessDanceNodeId: assign({
      successDanceNodeId: undefined
    }),
  },
  guards: {
    // Check if current node is in input phase
    isInput: () => {
      const currentPhase = useNavigationStore.getState().getCurrentPhase();
      return currentPhase === 'input' || currentPhase === 'input-showInput';
    },
    // Check if current node is in basic phase (regular character dialogue)
    isBasic: () => {
      const currentPhase = useNavigationStore.getState().getCurrentPhase();
      return currentPhase === 'basic';
    },
    // Check if current node is in an image phase (image_only or caption)
    isImagePhase: () => {
      const currentPhase = useNavigationStore.getState().getCurrentPhase();
      return currentPhase === 'image_only' || currentPhase === 'caption';
    },
    // Check if current node is showing a quest
    isQuestShowing: () => {
      const currentPhase = useNavigationStore.getState().getCurrentPhase();
      return currentPhase === 'quest-showing';
    },
    // Check if current node is recording an answer
    isRecordAnswer: () => {
      const currentPhase = useNavigationStore.getState().getCurrentPhase();
      return currentPhase === 'record-answer';
    },
    // Check if current node is processing answer transcript
    isAnswerProcessing: () => {
      const currentPhase = useNavigationStore.getState().getCurrentPhase();
      return currentPhase === 'answer-processing';
    },
    // Check if current node is waiting for answer validation
    isAnswerWaiting: () => {
      const currentPhase = useNavigationStore.getState().getCurrentPhase();
      return currentPhase === 'answer-waiting';
    },
    // Check if current node is showing answer-right animation
    isAnswerRight: () => {
      const currentPhase = useNavigationStore.getState().getCurrentPhase();
      return currentPhase === 'answer-right';
    },
    // Check if current node is showing answer-wrong animation
    isAnswerWrong: () => {
      const currentPhase = useNavigationStore.getState().getCurrentPhase();
      return currentPhase === 'answer-wrong';
    },
    // Check if both fail video and feedback are ready (for answer-wrong transition)
    bothFailConditionsMet: ({ context }) => {
      return context.failVideoComplete === true && context.feedbackReceived === true;
    },

    // Success-dance navigation guards
    canNavigateFromSuccessDance: () => {
      const store = useNavigationStore.getState();
      const currentNode = store.graph.byId[store.currentId || ''];

      // Must be on success-dance scene
      if (!currentNode || currentNode.scene?.type !== 'success-dance') {
        debug.log('⚠️ Guard failed: not on success-dance scene');
        return false;
      }

      // Must have a next node
      if (!currentNode.nextId) {
        debug.log('⚠️ Guard failed: no next node after success-dance');
        return false;
      }

      // Next node must be active
      const nextNode = store.graph.byId[currentNode.nextId];
      if (!nextNode || nextNode.status !== 'active') {
        debug.log('⚠️ Guard failed: next node not active');
        return false;
      }

      debug.log('✅ Guard passed: can navigate from success-dance');
      return true;
    },

    navigationSucceeded: ({ context }) => {
      const store = useNavigationStore.getState();
      const succeeded = store.currentId !== context.successDanceNodeId;

      if (succeeded) {
        debug.log('✅ Navigation succeeded - moved away from success-dance');
      } else {
        debug.error('❌ Navigation failed - still on success-dance node');
      }

      return succeeded;
    },
  },
}).createMachine({
  id: 'navigation',
  initial: 'boot',
  context: {
    storyId: undefined,
    graph: { scenes: [] },
    bootError: null,
    failVideoComplete: false,
    feedbackReceived: false,
    successDanceNodeId: undefined,
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
      entry: () => debug.log('Entered boot state'),
      states: {
        /**
         * WAITING_FOR_STORY
         * Wait for LOAD_STORY_REQUESTED event before starting the load
         */
        waiting_for_story: {
          entry: () => debug.log('Waiting for story load request...'),
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
                () => debug.log('Story loaded successfully!'),
                assign({
                  graph: ({ event }) => event.output.minimalGraph,
                }),
                'initializeStore',
                () => debug.log('Transitioning to scene.navigating...'),
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
            debug.log('🔀 Routing... current phase:', phase);
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
              guard: 'isQuestShowing',
              target: 'questShowing',
            },
            {
              guard: 'isRecordAnswer',
              target: 'answerRecording',
            },
            {
              guard: 'isAnswerProcessing',
              target: 'answerProcessing',
            },
            {
              guard: 'isAnswerWaiting',
              target: 'answerValidating',
            },
            {
              guard: 'isAnswerRight',
              target: 'answerRight',
            },
            {
              guard: 'isAnswerWrong',
              target: 'answerWrong',
            },
            {
              guard: 'isBasic',
              target: 'dialogueBasic',
            },
            {
              guard: 'isImagePhase',
              target: 'defaultBehavior',
            },
            {
              target: 'unknown',
            },
          ],
        },

        /**
         * QUEST SHOWING state
         * Quest is being displayed to the user - block all navigation
         * User must interact with quest UI to proceed
         */
        questShowing: {
          entry: () => debug.log('🎯 Entered questShowing state - navigation blocked'),
          on: {
            // Block scroll down - quest must be interacted with
            SCROLL_DOWN_STEP: {
              actions: () => debug.log('⛔ SCROLL_DOWN blocked during quest display'),
            },
            // Block scroll up - quest must be interacted with
            SCROLL_UP_STEP: {
              actions: () => debug.log('⛔ SCROLL_UP blocked during quest display'),
            },
            // When quest is accepted/started, transition to input phase
            REQUEST_NAV_NEXT: {
              actions: 'goNext',
              target: '#navigation.scene.route',
            },
          },
        },

        /**
         * DIALOGUE BASIC scene
         * Standard character dialogue with basic phase - allows normal scrolling
         */
        dialogueBasic: {
          entry: () => debug.log('🎯 Entered dialogueBasic state'),
          on: {
            SCROLL_DOWN_STEP: {
              actions: [
                () => debug.log('⬇️  SCROLL_DOWN_STEP in dialogueBasic → calling goNext'),
                'goNext',
              ],
              target: '#navigation.scene.route',
            },
            SCROLL_UP_STEP: {
              actions: [
                () => debug.log('⬆️  SCROLL_UP_STEP in dialogueBasic → calling goPrev'),
                'goPrev',
              ],
              target: '#navigation.scene.route',
            },
          },
        },

        /**
         * DIALOGUE INPUT scene
         * When in input phase, block scroll navigation and wait for recording to start
         */
        dialogueInput: {
          entry: () => debug.log('🎯 Entered dialogueInput state'),
          on: {
            // Block scroll down - do nothing when in input phase
            SCROLL_DOWN_STEP: {
              actions: () => debug.log('⛔ SCROLL_DOWN blocked in dialogueInput'),
            },
            SCROLL_UP_STEP: {
              actions: [
                () => debug.log('⬆️  SCROLL_UP_STEP in dialogueInput → calling goPrev'),
                'goPrev',
              ],
              target: '#navigation.scene.route',
            },
            // RECORDING_STARTED event comes from RecordPanelOrchestrator AFTER it completes the complex flow
            // Orchestrator handles: recording start, scene creation, insertion, navigation, phase update
            // Machine just transitions state to track that we're recording
            RECORDING_STARTED: {
              actions: () => debug.log('🎙️  Ask recording started by orchestrator'),
              target: 'askRecording',
            },
            // ANSWER_RECORDING_STARTED event comes from RecordPanelOrchestrator AFTER phase update
            // Orchestrator handles: recording start, phase update to 'record-answer'
            // Machine transitions to route, which will route to answerRecording based on phase
            ANSWER_RECORDING_STARTED: {
              actions: () => debug.log('🎙️  Answer recording started → routing'),
              target: '#navigation.scene.route',
            },
            // Handle recording failure
            RECORDING_FAILED: {
              actions: ({ event }) => debug.error('❌ Recording failed:', event.error),
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
          entry: () => debug.log('🎙️  Entered askRecording state - user is recording'),
          on: {
            // Block all navigation while recording
            SCROLL_DOWN_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked during recording'),
            },
            SCROLL_UP_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked during recording'),
            },
            // When user stops recording, move to processing
            RECORDING_STOPPED: {
              actions: () => debug.log('🛑 Recording stopped → processing'),
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
            () => debug.log('⚙️  Entered askProcessing state - transcribing audio'),
            () => {
              const nodeId = getCurrentNodeId();
              if (nodeId) useNavigationStore.getState().updateNodePhase(nodeId, 'input-processing');
            },
          ],
          on: {
            // Block navigation while processing
            SCROLL_DOWN_STEP: {},
            SCROLL_UP_STEP: {},
            // When transcript is ready, store it and move to AI waiting
            RECORDING_PROCESSED: {
              actions: [
                'storeTranscriptInScene',
                () => debug.log('✅ Transcript stored → waiting for AI')
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
            () => debug.log('🤖 Entered askWaitingForAI - invoking AI service'),
            () => {
              const nodeId = getCurrentNodeId();
              if (nodeId) useNavigationStore.getState().updateNodePhase(nodeId, 'ai-waiting');
            },
          ],
          invoke: {
            id: 'callAI',
            src: 'callAI',
            input: () => {
              // Extract questionText and conversationId from current scene
              const scene = getCurrentNode()?.scene;
              const questionText = (scene as { questionText?: string })?.questionText;
              const conversationId = (scene as { conversationId?: string })?.conversationId;

              debug.log('📥 Preparing AI input:', {
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
              target: '#navigation.scene.navigating',
              actions: [
                'createAIResponseScene',
                () => debug.log('✅ AI service completed successfully')
              ]
            },
            onError: {
              target: 'dialogueInput',
              actions: [
                ({ event }) => debug.error('❌ AI service failed:', event.error),
                () => {
                  const nodeId = getCurrentNodeId();
                  if (nodeId) useNavigationStore.getState().updateNodePhase(nodeId, 'input');
                }
              ]
            }
          },
          on: {
            // Block navigation while AI is processing
            SCROLL_DOWN_STEP: {
              actions: () => debug.log('⛔ Scroll blocked while AI processing')
            },
            SCROLL_UP_STEP: {
              actions: () => debug.log('⛔ Scroll blocked while AI processing')
            },
            // Legacy event handler for backward compatibility with ChatFlowOrchestrator
            RECEIVED_AI_RESPONSE: {
              target: '#navigation.scene.route',
              actions: [
                'createAIResponseScene',
                () => debug.log('✅ Received AI response via legacy event')
              ]
            },
          },
        },

        /**
         * ANSWER RECORDING state
         * User is actively recording their answer to a quest
         * Waits for RECORDING_STOPPED event
         */
        answerRecording: {
          entry: () => debug.log('🎙️  Entered answerRecording state - user recording answer'),
          on: {
            // Block all navigation while recording
            SCROLL_DOWN_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked during answer recording'),
            },
            SCROLL_UP_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked during answer recording'),
            },
            // When user stops recording, move to processing
            RECORDING_STOPPED: {
              actions: () => debug.log('🛑 Answer recording stopped → processing'),
              target: 'answerProcessing',
            },
          },
        },

        /**
         * ANSWER PROCESSING state
         * Recording is being transcribed by backend
         * Waits for RECORDING_PROCESSED event with transcript
         */
        answerProcessing: {
          entry: [
            () => debug.log('⚙️  Entered answerProcessing state - transcribing answer'),
            () => {
              const nodeId = getCurrentNodeId();
              if (nodeId) useNavigationStore.getState().updateNodePhase(nodeId, 'answer-processing');
            },
          ],
          on: {
            // Block navigation while processing
            SCROLL_DOWN_STEP: {},
            SCROLL_UP_STEP: {},
            // When transcript is ready, store it and move to validation
            RECORDING_PROCESSED: {
              actions: [
                'storeAnswerInScene',
                () => debug.log('✅ Answer transcript stored → validating')
              ],
              target: 'answerValidating',
            },
          },
        },

        /**
         * ANSWER VALIDATING state
         * Transcript is ready, invoking AI validation service to check answer
         */
        answerValidating: {
          entry: [
            () => debug.log('🤖 Entered answerValidating - invoking validation service'),
            () => {
              const nodeId = getCurrentNodeId();
              if (nodeId) useNavigationStore.getState().updateNodePhase(nodeId, 'answer-waiting');
            },
          ],
          invoke: {
            id: 'validateAnswer',
            src: 'validateAnswer',
            input: () => {
              // Extract answer data from current scene
              const scene = getCurrentNode()?.scene;
              const answerText = (scene as { answerText?: string })?.answerText;
              const questionText = (scene as { questionText?: string })?.questionText;
              const conversationId = (scene as { conversationId?: string })?.conversationId;

              // Get success answer from metadata
              const metadata = getConversationMetadata(conversationId);
              const successAnswer = metadata?.successAnswer || '';

              debug.log('📥 Preparing validation input:', {
                answerText: answerText?.substring(0, 50),
                successAnswer,
                conversationId,
                hasAnswer: !!answerText,
                hasSuccessAnswer: !!successAnswer
              });

              return {
                answerText: answerText || '',
                questionText,
                successAnswer,
                conversationId
              };
            },
            onDone: [
              {
                // If answer is correct, transition to creating success-dance
                guard: ({ event }) => event.output.isCorrect,
                target: 'creatingSuccessDance',
                actions: () => debug.log('✅ Answer CORRECT → creating success-dance')
              },
              {
                // If answer is wrong, START FEEDBACK GENERATION IMMEDIATELY (fire-and-forget)
                // This gives us maximum time (animation duration + setup) for AI to respond
                target: 'answerWrong',
                actions: [
                  () => {
                    debug.log('❌ Answer INCORRECT → starting feedback generation');

                    // Get current scene data to extract answer/question information
                    const scene = getCurrentNode()?.scene;
                    const questionNodeId = getCurrentNodeId(); // This is the question node (where validation happens)
                    const answerText = (scene as { answerText?: string })?.answerText || '';
                    const questionText = (scene as { questionText?: string })?.questionText;
                    const conversationId = (scene as { conversationId?: string })?.conversationId;
                    const metadata = getConversationMetadata(conversationId);
                    const successAnswer = metadata?.successAnswer || '';

                    // Fire-and-forget: Start feedback generation NOW (don't wait for it)
                    // By the time fail-dance animation completes (~4.7s), feedback will likely be ready
                    startFeedbackGeneration({
                      studentAnswer: answerText,
                      correctAnswer: successAnswer,
                      questionText,
                      conversationId
                    });

                    debug.log('🚀 Feedback generation started in background');

                    // Get the pending feedback promise and await it asynchronously
                    // When feedback is ready, emit FEEDBACK_RECEIVED event
                    const feedbackPromise = getPendingFeedbackPromise();

                    if (feedbackPromise && questionNodeId) {
                      import('@core/navigation/events/navigationBus').then(({ emit }) => {
                        // Await the feedback with a timeout that we can cancel
                        let timeoutId: NodeJS.Timeout;
                        const timeoutPromise = new Promise<null>((resolve) => {
                          timeoutId = setTimeout(() => {
                            debug.log('⏱️ Feedback timeout (10s) - using fallback');
                            resolve(null);
                          }, 10000);
                        });

                        Promise.race([feedbackPromise, timeoutPromise])
                          .then(feedback => {
                            // Clear the timeout to prevent it from firing after race completes
                            clearTimeout(timeoutId);

                            if (feedback) {
                              debug.log('📨 Emitting FEEDBACK_RECEIVED event for node:', questionNodeId);
                              emit({
                                type: 'FEEDBACK_RECEIVED',
                                feedbackText: feedback,
                                questionNodeId: questionNodeId
                              });
                            } else {
                              debug.log('⚠️ Feedback timeout - sending fallback');
                              emit({
                                type: 'FEEDBACK_RECEIVED',
                                feedbackText: "Try thinking about what the correct answer might be.",
                                questionNodeId: questionNodeId
                              });
                            }
                            // Clear the pending feedback after emitting event
                            clearPendingFeedback();
                          })
                          .catch(err => {
                            debug.error('Error waiting for feedback:', err);

                            // Clear the timeout in error case too
                            clearTimeout(timeoutId);

                            emit({
                              type: 'FEEDBACK_RECEIVED',
                              feedbackText: "Try thinking about what the correct answer might be.",
                              questionNodeId: questionNodeId
                            });
                            clearPendingFeedback();
                          });
                      });
                    }
                  }
                ]
              }
            ],
            onError: {
              // On validation error, treat as wrong answer
              target: 'answerWrong',
              actions: [
                ({ event }) => debug.error('❌ Validation error:', event.error),
                () => debug.log('Treating validation error as incorrect answer')
              ]
            }
          },
          on: {
            // Block navigation while validating
            SCROLL_DOWN_STEP: {
              actions: () => debug.log('⛔ Scroll blocked while validating answer')
            },
            SCROLL_UP_STEP: {
              actions: () => debug.log('⛔ Scroll blocked while validating answer')
            },
          },
        },

        /**
         * CREATING SUCCESS DANCE state
         * Answer was correct - create success-dance scene and navigate to it
         */
        creatingSuccessDance: {
          entry: () => debug.log('🎨 Creating success-dance scene...'),
          invoke: {
            id: 'createSuccessDance',
            src: 'createSuccessDance',
            input: () => {
              const answerRightNodeId = getCurrentNodeId();
              if (!answerRightNodeId) {
                throw new Error('No current node ID for success-dance creation');
              }
              return { answerRightNodeId };
            },
            onDone: {
              target: 'successDanceCreated',
              actions: [
                ({ event }) => {
                  debug.log('✅ Success-dance scene created', event.output);

                  const { answerRightNodeId, successDanceNodeId } = event.output;

                  // Update answer-right node to basic phase (cleanup for potential retry)
                  useNavigationStore.getState().updateNodePhase(answerRightNodeId, 'basic');

                  // Navigate to success-dance scene
                  useNavigationStore.getState().advance('forward');

                  debug.log('📍 Navigated to success-dance scene:', successDanceNodeId);
                }
              ]
            },
            onError: {
              target: 'answerRight',
              actions: ({ event }) => {
                debug.error('❌ Failed to create success-dance:', event.error);
                // Fallback: Just show answer-right animation without success-dance
              }
            }
          },
          on: {
            // Block navigation while creating success-dance
            SCROLL_DOWN_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked while creating success-dance')
            },
            SCROLL_UP_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked while creating success-dance')
            },
          }
        },

        /**
         * SUCCESS DANCE CREATED state
         * Success-dance scene has been created and we've navigated to it
         * Wait for jiggle animation to complete (VIDEO_COMPLETE event)
         */
        successDanceCreated: {
          entry: ['captureSuccessDanceNodeId', () => debug.log('🎊 Success-dance active - waiting for jiggle animation')],
          on: {
            // Block navigation during success-dance animation
            SCROLL_DOWN_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked during success-dance')
            },
            SCROLL_UP_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked during success-dance')
            },
            // When jiggle animation completes, check if we can navigate
            VIDEO_COMPLETE: [
              {
                // Can navigate: Go through cleanup flow
                guard: ({ event }) => event.videoType === 'success-dance',
                target: 'navigatingFromSuccessDance'
              }
            ]
          }
        },

        /**
         * NAVIGATING FROM SUCCESS DANCE state
         * Attempting to navigate forward from success-dance scene
         */
        navigatingFromSuccessDance: {
          entry: 'navigateForwardFromSuccessDance',
          always: [
            {
              // Navigation succeeded - proceed to deletion
              guard: 'navigationSucceeded',
              target: 'deletingSuccessDance'
            },
            {
              // Navigation failed - stay on success-dance
              target: 'successDanceNavigationFailed'
            }
          ]
        },

        /**
         * DELETING SUCCESS DANCE state
         * Navigation succeeded - now delete the success-dance scene
         */
        deletingSuccessDance: {
          entry: ['deleteSuccessDanceNode', () => debug.log('🎉 Success-dance cleanup complete')],
          always: {
            target: '#navigation.scene.navigating',
            actions: 'clearSuccessDanceNodeId'
          }
        },

        /**
         * SUCCESS DANCE NAVIGATION FAILED state
         * Could not navigate away from success-dance (e.g., last node or next node inactive)
         * Stay on success-dance scene - user can manually scroll or wait for new content
         */
        successDanceNavigationFailed: {
          entry: () => debug.log('⚠️ Cannot navigate from success-dance - staying here'),
          on: {
            SCROLL_DOWN_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked - no next scene available')
            },
            SCROLL_UP_STEP: {
              actions: ['goPrev', 'clearSuccessDanceNodeId'],
              target: '#navigation.scene.navigating'
            }
          }
        },

        /**
         * ANSWER RIGHT state (DEPRECATED - kept for fallback)
         * User answered correctly - show success animation
         * This state is now only used as a fallback if success-dance creation fails
         */
        answerRight: {
          entry: [
            () => debug.log('🎉 Entered answerRight (fallback) - no success-dance'),
            () => {
              const nodeId = getCurrentNodeId();
              if (nodeId) useNavigationStore.getState().updateNodePhase(nodeId, 'answer-right');
            },
          ],
          on: {
            // Block navigation during success animation
            SCROLL_DOWN_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked during success animation'),
            },
            SCROLL_UP_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked during success animation'),
            },
            // When success-dance animation completes, navigate forward and delete success-dance
            VIDEO_COMPLETE: [
              {
                // Only transition to navigating if we successfully navigated away from success-dance
                guard: ({ event }) => {
                  if (event.videoType !== 'success-dance') return false;

                  const store = useNavigationStore.getState();
                  const successDanceNodeId = store.currentId;
                  if (!successDanceNodeId) return false;

                  const successDanceNode = store.graph.byId[successDanceNodeId];
                  if (!successDanceNode?.nextId) return false;

                  const nextNode = store.graph.byId[successDanceNode.nextId];
                  return nextNode && nextNode.status === 'active';
                },
                actions: [
                  ({ event }) => {
                    if (event.videoType === 'success-dance') {
                      debug.log('🎬 Success-dance video complete - cleaning up');

                      const store = useNavigationStore.getState();
                      const successDanceNodeId = store.currentId;

                      if (!successDanceNodeId) {
                        debug.log('No current node ID for success-dance cleanup');
                        return;
                      }

                      const successDanceNode = store.graph.byId[successDanceNodeId];

                      // Verify we're actually still on success-dance before attempting navigation
                      // (Guard ran earlier, state might have changed)
                      if (successDanceNode?.scene?.type !== 'success-dance') {
                        debug.log('⚠️ No longer on success-dance scene (already navigated?), skipping cleanup');
                        return;
                      }

                      debug.log('➡️  Attempting to advance from success-dance:', {
                        successDanceNodeId,
                        sceneType: successDanceNode?.scene?.type,
                        currentPhase: successDanceNode?.phase,
                        phaseIndex: successDanceNode?.phaseIndex,
                        phaseSteps: successDanceNode?.phaseSteps,
                        nextId: successDanceNode?.nextId,
                        prevId: successDanceNode?.prevId,
                        nextNodeExists: successDanceNode?.nextId ? !!store.graph.byId[successDanceNode.nextId] : false,
                        nextNodeStatus: successDanceNode?.nextId ? store.graph.byId[successDanceNode.nextId]?.status : null,
                      });

                      // Attempt navigation (guard already verified next node exists and is active)
                      store.advance('forward');

                      // VERIFY: Ensure we actually moved away from success-dance before deletion
                      const newCurrentId = store.currentId;
                      if (newCurrentId === successDanceNodeId) {
                        debug.error('❌ FAILED to navigate away from success-dance before deletion!', {
                          successDanceNodeId,
                          currentId: newCurrentId,
                          stillOnSuccessDance: store.graph.byId[newCurrentId]?.scene?.type === 'success-dance',
                          nextNode: successDanceNode?.nextId ? store.graph.byId[successDanceNode.nextId] : null
                        });
                        return; // Don't delete if we couldn't navigate away - prevents currentId reassignment
                      }

                      debug.log('✅ Verified navigation away from success-dance - safe to delete:', {
                        oldCurrentId: successDanceNodeId,
                        newCurrentId: newCurrentId,
                        newCurrentNode: store.graph.byId[newCurrentId || '']?.scene?.type
                      });

                      // Now delete the success-dance scene
                      // Since currentId has moved forward, deletion won't affect current position
                      debug.log('🗑️  Deleting success-dance scene:', successDanceNodeId);
                      deleteNode(successDanceNodeId);
                    }
                  },
                ],
                target: '#navigation.scene.navigating',
              },
              {
                // Fallback: If we can't navigate (no next node), stay in answerRight state
                // This keeps the success-dance visible until user manually scrolls or new content appears
                guard: ({ event }) => event.videoType === 'success-dance',
                actions: ({ event }) => {
                  debug.log('⚠️ Success-dance complete but cannot navigate forward - staying on success-dance', {
                    videoType: event.videoType
                  });
                },
                // No target - stay in current state (answerRight)
              },
            ],
          },
        },

        /**
         * ANSWER WRONG state
         * User answered incorrectly - show fail animation
         * RecordPanelOrchestrator will handle fail-dance scene insertion
         * Machine waits for BOTH video completion AND feedback before allowing retry
         */
        answerWrong: {
          entry: [
            () => debug.log('😞 Entered answerWrong - fail animation'),
            () => {
              // Update current scene (question scene) to answer-wrong phase for animation
              const nodeId = getCurrentNodeId();
              if (nodeId) useNavigationStore.getState().updateNodePhase(nodeId, 'answer-wrong');

              // Note: When we navigate to fail-dance scene, we'll reset this question scene to 'basic'
              // This happens in the RecordPanelOrchestrator after fail-dance scene insertion
            },
            'resetAnswerWrongFlags', // Reset flags on entry
          ],
          on: {
            // Block navigation during fail animation
            SCROLL_DOWN_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked during fail animation'),
            },
            SCROLL_UP_STEP: {
              actions: () => debug.log('⛔ SCROLL blocked during fail animation'),
            },
            // When fail-dance animation completes, mark video as complete
            VIDEO_COMPLETE: {
              actions: [
                ({ event }) => {
                  if (event.videoType === 'fail-dance') {
                    debug.log('🎬 Fail-dance video complete');
                  }
                },
                'setFailVideoComplete',
              ],
              // Check if both conditions are met after setting video complete
              target: '#navigation.scene.answerWrong', // Stay in same state (will check always transition)
            },
            // When feedback is received, create a new scene with the feedback text
            FEEDBACK_RECEIVED: {
              actions: [
                ({ event }) => {
                  debug.log('💬 Feedback received:', event.feedbackText.substring(0, 100) + '...');

                  // Get the question node to extract scene context
                  const questionNodeId = event.questionNodeId;
                  if (!questionNodeId) {
                    debug.error('No questionNodeId provided with feedback');
                    return;
                  }

                  const store = useNavigationStore.getState();
                  const questionNode = store.graph.byId[questionNodeId];
                  if (!questionNode?.scene) {
                    debug.error('Question node not found:', questionNodeId);
                    return;
                  }

                  // Extract scene properties for inheritance
                  const scene = questionNode.scene;
                  const conversationId = (scene as { conversationId?: string })?.conversationId;
                  const currentBackground = 'background' in scene ? scene.background : undefined;
                  const leftCharacter = 'left-character' in scene ? (scene as { 'left-character'?: string })['left-character'] : 'leo';
                  const rightCharacter = 'right-character' in scene ? (scene as { 'right-character'?: string })['right-character'] : 'bakerMom';

                  // Create feedback scene using the same factory as AI responses
                  const feedbackScene = createAIResponseSceneFactory(
                    event.feedbackText,
                    conversationId,
                    currentBackground,
                    leftCharacter,
                    rightCharacter
                  );

                  debug.log('Creating feedback scene with text:', event.feedbackText.substring(0, 50));

                  // Get current node (should be fail-dance scene)
                  const currentNodeId = store.currentId;
                  if (!currentNodeId) {
                    debug.error('No current node ID');
                    return;
                  }

                  // Insert feedback scene after current fail-dance scene
                  insertSceneNodes(currentNodeId, feedbackScene);

                  debug.log('✅ Feedback scene created');
                },
                'setFeedbackReceived',
              ],
              // Check if both conditions are met after setting feedback received
              target: '#navigation.scene.answerWrong', // Stay in same state (will check always transition)
            },
          },
          // Always check if both conditions are met - if so, navigate forward to feedback scene and delete fail-dance
          always: {
            guard: 'bothFailConditionsMet',
            actions: [
              () => {
                debug.log('✅ Both conditions met - navigating to feedback scene');

                const store = useNavigationStore.getState();

                // Get the current fail-dance node ID before navigating away
                const failDanceNodeId = store.currentId;

                // Navigate forward to the feedback scene that was inserted
                debug.log('➡️  Advancing to feedback scene');
                store.advance('forward');

                // Delete the fail-dance scene now that we've navigated past it
                // This keeps the graph clean - fail-dance is just a temporary animation
                if (failDanceNodeId) {
                  debug.log('🗑️  Deleting fail-dance scene:', failDanceNodeId);
                  deleteNode(failDanceNodeId);
                }
              }
            ],
            target: '#navigation.scene.navigating',
          },
        },

        /**
         * DEFAULT BEHAVIOR
         * For valid phases that just need standard scroll-through behavior
         * (e.g., image_only, caption, text scenes)
         * No special logic needed - just allow navigation
         */
        defaultBehavior: {
          on: {
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
         * UNKNOWN phase (safety net)
         * Fallback for truly unexpected phases that shouldn't exist
         */
        unknown: {
          entry: () => {
            const node = useNavigationStore.getState().getCurrentNode();
            const phase = useNavigationStore.getState().getCurrentPhase();
            debug.log('Unknown phase:', phase, '(scene type:', node?.scene?.type + ')');
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
