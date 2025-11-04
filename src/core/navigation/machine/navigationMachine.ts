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
    // Answer Storage - Simple store update for answer validation
    // =============================================================================

    storeAnswerInScene: ({ event }) => {
      if (event.type !== 'RECORDING_PROCESSED') return;

      const { transcript } = event;

      if (!transcript || !transcript.trim()) {
        console.warn('[NavigationMachine] Received empty answer transcript, skipping store');
        return;
      }

      console.log('[NavigationMachine] 📝 Storing answer in scene:', transcript.substring(0, 50));

      // Update current scene with answer text
      useNavigationStore.getState().updateCurrentSceneProperties({
        answerText: transcript // For validation
      });

      console.log('[NavigationMachine] ✅ Answer stored successfully');
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

      // Delegate everything to AIOrchestrator (SYNCHRONOUS)
      // This completes immediately - scene is created, inserted, and navigated to
      createAndInsertAIResponseScene({
        responseText,
        conversationId,
        currentNodeId,
      });

      console.log('[NavigationMachine] Scene creation completed synchronously');
    },
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
          entry: () => console.log('[NavigationMachine] 🎯 Entered questShowing state - navigation blocked'),
          on: {
            // Block scroll down - quest must be interacted with
            SCROLL_DOWN_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ SCROLL_DOWN blocked during quest display'),
            },
            // Block scroll up - quest must be interacted with
            SCROLL_UP_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ SCROLL_UP blocked during quest display'),
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
          entry: () => console.log('[NavigationMachine] 🎯 Entered dialogueBasic state'),
          on: {
            SCROLL_DOWN_STEP: {
              actions: [
                () => console.log('[NavigationMachine] ⬇️  SCROLL_DOWN_STEP in dialogueBasic → calling goNext'),
                'goNext',
              ],
              target: '#navigation.scene.route',
            },
            SCROLL_UP_STEP: {
              actions: [
                () => console.log('[NavigationMachine] ⬆️  SCROLL_UP_STEP in dialogueBasic → calling goPrev'),
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
              actions: () => console.log('[NavigationMachine] 🎙️  Ask recording started by orchestrator'),
              target: 'askRecording',
            },
            // ANSWER_RECORDING_STARTED event comes from RecordPanelOrchestrator AFTER phase update
            // Orchestrator handles: recording start, phase update to 'record-answer'
            // Machine transitions to route, which will route to answerRecording based on phase
            ANSWER_RECORDING_STARTED: {
              actions: () => console.log('[NavigationMachine] 🎙️  Answer recording started → routing'),
              target: '#navigation.scene.route',
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
              target: '#navigation.scene.navigating',
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
         * ANSWER RECORDING state
         * User is actively recording their answer to a quest
         * Waits for RECORDING_STOPPED event
         */
        answerRecording: {
          entry: () => console.log('[NavigationMachine] 🎙️  Entered answerRecording state - user recording answer'),
          on: {
            // Block all navigation while recording
            SCROLL_DOWN_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ SCROLL blocked during answer recording'),
            },
            SCROLL_UP_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ SCROLL blocked during answer recording'),
            },
            // When user stops recording, move to processing
            RECORDING_STOPPED: {
              actions: () => console.log('[NavigationMachine] 🛑 Answer recording stopped → processing'),
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
            () => console.log('[NavigationMachine] ⚙️  Entered answerProcessing state - transcribing answer'),
            () => useNavigationStore.getState().updateCurrentPhase('answer-processing'),
          ],
          on: {
            // Block navigation while processing
            SCROLL_DOWN_STEP: {},
            SCROLL_UP_STEP: {},
            // When transcript is ready, store it and move to validation
            RECORDING_PROCESSED: {
              actions: [
                'storeAnswerInScene',
                () => console.log('[NavigationMachine] ✅ Answer transcript stored → validating')
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
            () => console.log('[NavigationMachine] 🤖 Entered answerValidating - invoking validation service'),
            () => useNavigationStore.getState().updateCurrentPhase('answer-waiting'),
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

              console.log('[NavigationMachine] 📥 Preparing validation input:', {
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
                // If answer is correct, transition to answerRight
                guard: ({ event }) => event.output.isCorrect,
                target: 'answerRight',
                actions: () => console.log('[NavigationMachine] ✅ Answer CORRECT → answerRight')
              },
              {
                // If answer is wrong, START FEEDBACK GENERATION IMMEDIATELY (fire-and-forget)
                // This gives us maximum time (animation duration + setup) for AI to respond
                target: 'answerWrong',
                actions: [
                  () => {
                    console.log('[NavigationMachine] ❌ Answer INCORRECT → starting feedback generation');

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

                    console.log('[NavigationMachine] 🚀 Feedback generation started in background');

                    // Get the pending feedback promise and await it asynchronously
                    // When feedback is ready, emit FEEDBACK_RECEIVED event
                    const feedbackPromise = getPendingFeedbackPromise();

                    if (feedbackPromise && questionNodeId) {
                      import('@core/navigation/events/navigationBus').then(({ emit }) => {
                        // Await the feedback with a timeout that we can cancel
                        let timeoutId: NodeJS.Timeout;
                        const timeoutPromise = new Promise<null>((resolve) => {
                          timeoutId = setTimeout(() => {
                            console.warn('[NavigationMachine] ⏱️ Feedback timeout (10s) - using fallback');
                            resolve(null);
                          }, 10000);
                        });

                        Promise.race([feedbackPromise, timeoutPromise])
                          .then(feedback => {
                            // Clear the timeout to prevent it from firing after race completes
                            clearTimeout(timeoutId);

                            if (feedback) {
                              console.log('[NavigationMachine] 📨 Emitting FEEDBACK_RECEIVED event for node:', questionNodeId);
                              emit({
                                type: 'FEEDBACK_RECEIVED',
                                feedbackText: feedback,
                                questionNodeId: questionNodeId
                              });
                            } else {
                              console.warn('[NavigationMachine] ⚠️ Feedback timeout - sending fallback');
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
                            console.error('[NavigationMachine] Error waiting for feedback:', err);

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
                ({ event }) => console.error('[NavigationMachine] ❌ Validation error:', event.error),
                () => console.log('[NavigationMachine] Treating validation error as incorrect answer')
              ]
            }
          },
          on: {
            // Block navigation while validating
            SCROLL_DOWN_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ Scroll blocked while validating answer')
            },
            SCROLL_UP_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ Scroll blocked while validating answer')
            },
          },
        },

        /**
         * ANSWER RIGHT state
         * User answered correctly - show success animation
         * RecordPanelOrchestrator will handle success-dance scene insertion and navigation
         */
        answerRight: {
          entry: [
            () => console.log('[NavigationMachine] 🎉 Entered answerRight - success animation'),
            () => useNavigationStore.getState().updateCurrentPhase('answer-right'),
          ],
          on: {
            // Block navigation during success animation
            // RecordPanelOrchestrator will handle scene transitions
            SCROLL_DOWN_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ SCROLL blocked during success animation'),
            },
            SCROLL_UP_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ SCROLL blocked during success animation'),
            },
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
            () => console.log('[NavigationMachine] 😞 Entered answerWrong - fail animation'),
            () => {
              // Update current scene (question scene) to answer-wrong phase for animation
              useNavigationStore.getState().updateCurrentPhase('answer-wrong');

              // Note: When we navigate to fail-dance scene, we'll reset this question scene to 'basic'
              // This happens in the RecordPanelOrchestrator after fail-dance scene insertion
            },
            'resetAnswerWrongFlags', // Reset flags on entry
          ],
          on: {
            // Block navigation during fail animation
            SCROLL_DOWN_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ SCROLL blocked during fail animation'),
            },
            SCROLL_UP_STEP: {
              actions: () => console.log('[NavigationMachine] ⛔ SCROLL blocked during fail animation'),
            },
            // When fail-dance animation completes, mark video as complete
            VIDEO_COMPLETE: {
              actions: [
                ({ event }) => {
                  if (event.videoType === 'fail-dance') {
                    console.log('[NavigationMachine] 🎬 Fail-dance video complete');
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
                  console.log('[NavigationMachine] 💬 Feedback received:', event.feedbackText.substring(0, 100) + '...');

                  // Get the question node to extract scene context
                  const questionNodeId = event.questionNodeId;
                  if (!questionNodeId) {
                    console.error('[NavigationMachine] No questionNodeId provided with feedback');
                    return;
                  }

                  const store = useNavigationStore.getState();
                  const questionNode = store.graph.byId[questionNodeId];
                  if (!questionNode?.scene) {
                    console.error('[NavigationMachine] Question node not found:', questionNodeId);
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

                  console.log('[NavigationMachine] Creating feedback scene with text:', event.feedbackText.substring(0, 50));

                  // Get current node (should be fail-dance scene)
                  const currentNodeId = store.currentId;
                  if (!currentNodeId) {
                    console.error('[NavigationMachine] No current node ID');
                    return;
                  }

                  // Insert feedback scene after current fail-dance scene
                  insertSceneNodes(currentNodeId, feedbackScene);

                  console.log('[NavigationMachine] ✅ Feedback scene created');
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
                console.log('[NavigationMachine] ✅ Both conditions met - navigating to feedback scene');

                const store = useNavigationStore.getState();

                // Get the current fail-dance node ID before navigating away
                const failDanceNodeId = store.currentId;

                // Navigate forward to the feedback scene that was inserted
                console.log('[NavigationMachine] ➡️  Advancing to feedback scene');
                store.advance('forward');

                // Delete the fail-dance scene now that we've navigated past it
                // This keeps the graph clean - fail-dance is just a temporary animation
                if (failDanceNodeId) {
                  console.log('[NavigationMachine] 🗑️  Deleting fail-dance scene:', failDanceNodeId);
                  deleteNode(failDanceNodeId);
                }
              }
            ],
            target: '#navigation.scene.navigating',
          },
        },

        /**
         * UNKNOWN phase (safety net)
         * Fallback for phases that don't have explicit states
         */
        unknown: {
          entry: () => {
            const node = useNavigationStore.getState().getCurrentNode();
            const phase = useNavigationStore.getState().getCurrentPhase();
            console.warn('[NavigationMachine] Unknown phase:', phase, '(scene type:', node?.scene?.type + ')');
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
