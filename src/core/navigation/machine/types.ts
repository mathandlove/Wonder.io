/**
 * Navigation Machine Type Contracts
 *
 * This file defines the complete type system for the navigation state machine.
 * These types form the contract between:
 * - Domain events (UI, media, AI) → Machine
 * - Machine → Action intents
 * - Action intents → Commands
 * - Commands → Graph mutations
 *
 * @module machine/types
 */

import type { Phase } from '@core/navigation/navigationGraphTypes';

// ============================================================================
// DOMAIN EVENTS (Input to Machine)
// ============================================================================

/**
 * TRANSCRIPT_READY
 * Emitted when: Speech-to-text completes for Ask or Answer recording
 * Payload: The finalized transcript text and which type (question/answer)
 */
export type TranscriptReadyEvent = {
  type: 'TRANSCRIPT_READY';
  nodeId: string;
  transcript: string;
  recordingType: 'question' | 'answer';
};

/**
 * AI_DONE
 * Emitted when: AI service returns a response to user's question
 * Payload: The AI-generated response text and metadata
 */
export type AiDoneEvent = {
  type: 'AI_DONE';
  nodeId: string;
  response: string;
  metadata?: {
    model?: string;
    tokens?: number;
  };
};

/**
 * ANSWER_VALIDATED
 * Emitted when: Answer validation service determines correctness
 * Payload: Whether answer is correct and optional feedback text
 */
export type AnswerValidatedEvent = {
  type: 'ANSWER_VALIDATED';
  nodeId: string;
  isCorrect: boolean;
  feedback?: string;
};

/**
 * VIDEO_COMPLETE
 * Emitted when: Video/animation playback finishes (e.g., success/fail dance, answer-right stamp, wrong stamp)
 * Payload: Which video/animation completed
 */
export type VideoCompleteEvent = {
  type: 'VIDEO_COMPLETE';
  nodeId: string;
  videoType: 'success-dance' | 'fail-dance' | 'celebration' | 'answer-right' | 'answer-wrong';
};

/**
 * DANCE_DONE
 * Emitted when: Fail-dance (angry dance) animation completes
 */
export type DanceDoneEvent = {
  type: 'DANCE_DONE';
};

/**
 * TIMEOUT
 * Emitted when: A time-bounded operation exceeds its deadline
 * Payload: Which operation timed out
 */
export type TimeoutEvent = {
  type: 'TIMEOUT';
  nodeId: string;
  operation: 'ai-waiting' | 'answer-waiting' | 'video-playback';
};

/**
 * USER_NAVIGATE
 * Emitted when: User explicitly requests navigation (scroll, button click)
 * Payload: Direction and optional target node
 */
export type UserNavigateEvent = {
  type: 'USER_NAVIGATE';
  nodeId: string;
  direction: 'forward' | 'back';
  targetNodeId?: string;
};

/**
 * INTERNAL_ERROR
 * Emitted when: An unexpected error occurs in any subsystem
 * Payload: Error details for logging and recovery
 */
export type InternalErrorEvent = {
  type: 'INTERNAL_ERROR';
  nodeId: string;
  error: Error;
  context: string; // Where the error occurred
};

/**
 * RECORDING_STARTED
 * Emitted when: Recording has been successfully started and scene created
 * Payload: Recording ID and node ID (emitted by orchestrator after complex flow)
 */
export type RecordingStartedEvent = {
  type: 'RECORDING_STARTED';
  recordingId: string;
  nodeId: string;
};

/**
 * RECORDING_FAILED
 * Emitted when: Recording failed to start or scene creation failed
 * Payload: Error message
 */
export type RecordingFailedEvent = {
  type: 'RECORDING_FAILED';
  error: string;
};

/**
 * ASK_BUTTON_CLICKED
 * Emitted when: User clicks the Ask button in input phase
 * Purpose: Trigger recording start and phase transition
 */
export type AskButtonClickedEvent = {
  type: 'ASK_BUTTON_CLICKED';
};

/**
 * ANSWER_BUTTON_CLICKED
 * Emitted when: User clicks the Answer button
 * Purpose: Trigger answer recording start and phase transition
 */
export type AnswerButtonClickedEvent = {
  type: 'ANSWER_BUTTON_CLICKED';
};

/**
 * RECORDING_STOPPED
 * Emitted when: User stops recording
 * Payload: Recording type
 */
export type RecordingStoppedEvent = {
  type: 'RECORDING_STOPPED';
  nodeId: string;
  recordingType: 'question' | 'answer';
};

/**
 * RECORDING_TRANSCRIBED
 * Emitted when: Recording has been transcribed and text is ready
 * Payload: Transcript text and recording ID
 */
export type RecordingTranscribedEvent = {
  type: 'RECORDING_TRANSCRIBED';
  transcript: string;
  recordingId: string;
};

/**
 * RECEIVED_AI_RESPONSE
 * Emitted when: AI has finished generating a response
 * Payload: AI response text and conversation context
 */
export type ReceivedAIResponseEvent = {
  type: 'RECEIVED_AI_RESPONSE';
  responseText: string;
  conversationId?: string;
};

/**
 * FEEDBACK_RECEIVED
 * Emitted when: AI feedback for wrong answer has been generated and is ready to display
 * Payload: Feedback text to show to user
 */
export type FeedbackReceivedEvent = {
  type: 'FEEDBACK_RECEIVED';
  feedbackText: string;
  questionNodeId: string;
};

/**
 * ANSWER_RECORDING_STARTED
 * @deprecated Use ANSWER_BUTTON_CLICKED instead (follows new state machine pattern)
 * Legacy event from orchestrator pattern - no longer emitted
 */
export type AnswerRecordingStartedEvent = {
  type: 'ANSWER_RECORDING_STARTED';
  recordingId: string;
  nodeId: string;
};

/**
 * LOAD_STORY_REQUESTED
 * Emitted when: App/router requests a story to be loaded before navigation can start
 * Payload: Story identifier to load
 */
export type LoadStoryRequestedEvent = {
  type: 'LOAD_STORY_REQUESTED';
  storyId: string;
};

/**
 * APPLY_GRAPH
 * Emitted when: Boot completes and wants to initialize the machine with the loaded graph
 * Payload: Minimal graph and initial node ID
 */
export type ApplyGraphEvent = {
  type: 'APPLY_GRAPH';
  graph: MachineGraph;
  initialNodeId: string;
};

/**
 * STORY_LOADED
 * Emitted when: LoadStory service resolves successfully
 * Payload: The loaded graph snapshot and initial node id
 */
export type StoryLoadedEvent = {
  type: 'STORY_LOADED';
  storyId: string;
  graph: unknown;
  initialNodeId: string;
};

/**
 * STORY_LOAD_FAILED
 * Emitted when: LoadStory service rejects
 * Payload: Error details for logging/retry
 */
export type StoryLoadFailedEvent = {
  type: 'STORY_LOAD_FAILED';
  storyId: string;
  error: string;
};

/**
 * ACTIONS_FLUSHED
 * Emitted when: Interpreter has processed all pendingActions
 * Purpose: Clears the pendingActions array in context
 */
export type ActionsFlushedEvent = {
  type: 'ACTIONS_FLUSHED';
};

/**
 * SCROLL_DOWN_STEP
 * Emitted when: User performs a down scroll gesture
 * Purpose: Request navigation to next node or next phase within current scene
 */
export type ScrollDownStepEvent = {
  type: 'SCROLL_DOWN_STEP';
  source?: string; // 'wheel' | 'touch' | 'keyboard'
};

/**
 * SCROLL_UP_STEP
 * Emitted when: User performs an up scroll gesture
 * Purpose: Request navigation to previous node
 */
export type ScrollUpStepEvent = {
  type: 'SCROLL_UP_STEP';
  source?: string; // 'wheel' | 'touch' | 'keyboard'
};

/**
 * REQUEST_NAV_NEXT
 * Emitted when: Child scene requests navigation to next node
 * Purpose: Sent by child machines when they've completed their internal flow
 */
export type RequestNavNextEvent = {
  type: 'REQUEST_NAV_NEXT';
};

/**
 * REQUEST_NAV_PREV
 * Emitted when: Child scene requests navigation to previous node
 * Purpose: Sent by child machines when user navigates backward
 */
export type RequestNavPrevEvent = {
  type: 'REQUEST_NAV_PREV';
};

/**
 * UPDATE_NODE_PHASE
 * Emitted when: Child scene machine transitions phase (e.g., image_only → caption)
 * Purpose: Notify parent to persist phase change to navigationStore
 * Note: nodeId is NOT included - parent determines which node to update
 */
export type UpdateNodePhaseEvent = {
  type: 'UPDATE_NODE_PHASE';
  phase: Phase;
};

export type deleteCurrentNodeandNavNext = {
  type: 'DELETE_CURRENT_NODE_AND_NAV_NEXT';
};

/**
 * CONTINUE
 * Emitted when: User clicks Continue button in clue scene after finding all clues
 * Purpose: Request navigation to next scene
 */
export type ContinueEvent = {
  type: 'CONTINUE';
};

/**
 * ALL_CLUES_FOUND
 * Emitted when: User clicks the 4th clue in a clue scene
 * Purpose: Signal that all clues have been found and phase should be updated to 'complete'
 */
export type AllCluesFoundEvent = {
  type: 'ALL_CLUES_FOUND';
};

/**
 * CLUE_SELECTED
 * Emitted when: User selects a clue to ask about (in askClue phase when useClues=true)
 * Payload: The label of the selected clue
 */
export type ClueSelectedEvent = {
  type: 'CLUE_SELECTED';
  clueLabel: string;
  clueDescription: string;
};

/**
 * START_RECORDING
 * Emitted when: Machine determines recording should start (after ASK_BUTTON_CLICKED when useClues=false)
 * Purpose: Trigger orchestrator to handle recording start flow
 */
export type StartRecordingEvent = {
  type: 'START_RECORDING';
};

/**
 * RECORDING_ACTIVE
 * Emitted when: Microphone has actually started recording (STT status becomes 'recording')
 * Purpose: Signal that recording is truly active, safe to create scene and allow stop
 */
export type RecordingActiveEvent = {
  type: 'RECORDING_ACTIVE';
};

/**
 * SUBMIT_RECORDING
 * Emitted when: User confirms their question transcript in recording-submit phase
 * Purpose: Proceed to AI processing
 */
export type SubmitRecordingEvent = {
  type: 'SUBMIT_RECORDING';
};

/**
 * CANCEL_RECORDING
 * Emitted when: User cancels their question transcript in recording-submit phase
 * Purpose: Delete current node and go back to re-record
 */
export type CancelRecordingEvent = {
  type: 'CANCEL_RECORDING';
};

/**
 * SUBMIT_ANSWER
 * Emitted when: User confirms their answer transcript in answer-submit phase
 * Purpose: Proceed to answer validation
 */
export type SubmitAnswerEvent = {
  type: 'SUBMIT_ANSWER';
};

/**
 * CANCEL_ANSWER
 * Emitted when: User cancels their answer transcript in answer-submit phase
 * Purpose: Go back to quest-showing to re-record
 */
export type CancelAnswerEvent = {
  type: 'CANCEL_ANSWER';
};

/**
 * NO_AUDIO_RECORDED
 * Emitted when: Recording completed but no audio was captured (empty/silent recording)
 * Payload: Recording type (question or answer)
 * Purpose: Show error message asking user to allow microphone access
 */
export type NoAudioRecordedEvent = {
  type: 'NO_AUDIO_RECORDED';
  recordingType: 'question' | 'answer';
};

/**
 * RETRY_RECORDING
 * Emitted when: User clicks retry after no audio recorded
 * Purpose: Go back to input state to try recording again
 */
export type RetryRecordingEvent = {
  type: 'RETRY_RECORDING';
};

/**
 * Union of all domain events the machine can receive
 */
export type NavigationEvent =
  | TranscriptReadyEvent
  | AiDoneEvent
  | AnswerValidatedEvent
  | VideoCompleteEvent
  | DanceDoneEvent
  | TimeoutEvent
  | UserNavigateEvent
  | InternalErrorEvent
  | RecordingStartedEvent
  | RecordingFailedEvent
  | RecordingStoppedEvent
  | RecordingTranscribedEvent
  | ReceivedAIResponseEvent
  | FeedbackReceivedEvent
  | AskButtonClickedEvent
  | AnswerButtonClickedEvent
  | AnswerRecordingStartedEvent
  | LoadStoryRequestedEvent
  | ApplyGraphEvent
  | StoryLoadedEvent
  | StoryLoadFailedEvent
  | ActionsFlushedEvent
  | ScrollDownStepEvent
  | ScrollUpStepEvent
  | RequestNavNextEvent
  | RequestNavPrevEvent
  | UpdateNodePhaseEvent
  | deleteCurrentNodeandNavNext
  | ContinueEvent
  | AllCluesFoundEvent
  | ClueSelectedEvent
  | StartRecordingEvent
  | RecordingActiveEvent
  | SubmitRecordingEvent
  | CancelRecordingEvent
  | SubmitAnswerEvent
  | CancelAnswerEvent
  | NoAudioRecordedEvent
  | RetryRecordingEvent

// Note: SCENE_PHASE_CHANGED removed - phase lives in child machine state,
// not as a parent event. Phase is persisted via meta when needed.

// ============================================================================
// MACHINE CONTEXT
// ============================================================================

/**
 * Minimal graph shape held by the machine for routing
 */
export type MachineGraphNode = {
  id: string;
  type: string;
  meta?: Record<string, unknown>;
};

export type MachineGraph = {
  scenes: MachineGraphNode[];
  edges?: Record<string, { next?: string; prev?: string }>;
};

/**
 * Machine Context
 *
 * The machine holds a minimal graph for routing decisions only.
 * The full graph with all state lives in navigationStore.
 *
 * Note: activeNodeId is NOT stored here - navigationStore.currentId is the single source of truth.
 * Guards and actions read directly from navigationStore when needed.
 */
export type NavigationContext = {
  /** Story identifier currently loaded or loading */
  storyId?: string;
  /** Minimal graph for routing (just id, type, meta) */
  graph: MachineGraph;
  /** Last boot error, if any */
  bootError?: { message: string; timestamp: string } | null;
  /** Track if fail-dance video has completed (for answer-wrong flow) */
  failVideoComplete?: boolean;
  /** Track if AI feedback has been received (for answer-wrong flow) */
  feedbackReceived?: boolean;
  /** Track success-dance node ID for cleanup (for answer-right flow) */
  successDanceNodeId?: string;
  /** Flag to unlock answer button (set to true after user asks a question or via debug mode) */
  unlockAnswerButton: boolean;
  /** Track which conversation the answer button was unlocked for */
  unlockedConversationId?: string;
  /** Character image for fail-dance scenes (e.g., "angrybutterbuns.png") */
  wrongCharacter?: string;
  /** Track if we've requested microphone permission after first navigation */
  micPermissionRequested?: boolean;
};

// Note: Phase is NOT tracked in parent context - it lives in:
// 1. Child machine state (source of truth while scene is active)
// 2. graph.scenes[].meta.phase (persisted for restoration)

// ============================================================================
// ACTION INTENTS (Output from Machine)
// ============================================================================

/**
 * TO_SUCCESS_DANCE
 * Intent: Navigate to or insert a success celebration scene
 */
export type ToSuccessDanceAction = {
  type: 'TO_SUCCESS_DANCE';
  sourceNodeId: string;
};

/**
 * TO_FAIL_DANCE
 * Intent: Navigate to or insert a failure feedback scene
 */
export type ToFailDanceAction = {
  type: 'TO_FAIL_DANCE';
  sourceNodeId: string;
};

/**
 * NAV_FORWARD
 * Intent: Navigate to the next node in the graph
 */
export type NavForwardAction = {
  type: 'NAV_FORWARD';
  fromNodeId: string;
};

/**
 * NAV_BACK
 * Intent: Navigate to the previous node in the graph
 */
export type NavBackAction = {
  type: 'NAV_BACK';
  fromNodeId: string;
};

/**
 * INSERT_RESPONSE_SCENE
 * Intent: Insert a new scene with AI response after current node
 * This is used when AI returns a response that needs a new dialogue scene
 */
export type InsertResponseSceneAction = {
  type: 'INSERT_RESPONSE_SCENE';
  afterNodeId: string;
  responseText: string;
};

/**
 * CLEANUP_TEMP_NODES
 * Intent: Remove temporary/transient nodes that are no longer needed
 * Example: Remove success-dance scene after animation completes
 */
export type CleanupTempNodesAction = {
  type: 'CLEANUP_TEMP_NODES';
  nodeIds: string[];
};

/**
 * LOG_ERROR
 * Intent: Log error to development tools
 */
export type LogErrorAction = {
  type: 'LOG_ERROR';
  error: Error;
  context: string;
};

/**
 * APPLY_GRAPH
 * Intent: Replace the in-memory graph snapshot with the freshly loaded story
 */
export type ApplyGraphAction = {
  type: 'APPLY_GRAPH';
  graph: unknown;
};

/**
 * SET_ACTIVE_NODE
 * Intent: Set the active node pointer after boot
 */
export type SetActiveNodeAction = {
  type: 'SET_ACTIVE_NODE';
  nodeId: string;
};

/**
 * RESET_TEMP_NODES
 * Intent: Clear any tracked temporary nodes left from previous sessions
 */
export type ResetTempNodesAction = {
  type: 'RESET_TEMP_NODES';
};

/**
 * UPDATE_NODE_PHASE
 * Intent: Update the phase of a specific node in the navigation graph
 * Example: When imageSceneMachine transitions from 'image_only' to 'caption'
 */
export type UpdateNodePhaseAction = {
  type: 'UPDATE_NODE_PHASE';
  nodeId: string;
  phase: Phase;
};

/**
 * Union of all action intents the machine can emit
 */
export type NavigationAction =
  | ToSuccessDanceAction
  | ToFailDanceAction
  | NavForwardAction
  | NavBackAction
  | InsertResponseSceneAction
  | CleanupTempNodesAction
  | LogErrorAction
  | ApplyGraphAction
  | SetActiveNodeAction
  | ResetTempNodesAction
  | UpdateNodePhaseAction;

// ============================================================================
// COMMANDS (Graph Mutation Operations)
// ============================================================================

/**
 * INSERT_AFTER
 * Command: Insert a new node after the specified node
 * Payload: Node data without prev/next pointers (queue will set them)
 */
export type InsertAfterCommand = {
  type: 'INSERT_AFTER';
  afterNodeId: string;
  newNode: {
    nodeId: string;
    sceneId: string;
    sceneKind: string;
    sceneState: unknown; // Will be properly typed when integrated with Node type
    metadata?: Record<string, unknown>;
  };
};

/**
 * NAVIGATE_TO
 * Command: Change the active node pointer
 * Payload: Target node ID
 */
export type NavigateToCommand = {
  type: 'NAVIGATE_TO';
  targetNodeId: string;
};

/**
 * DELETE_NODE
 * Command: Remove a node from the graph
 * Payload: Node ID to delete
 */
export type DeleteNodeCommand = {
  type: 'DELETE_NODE';
  nodeId: string;
};

/**
 * ADVANCE
 * Command: Advance navigation in a direction (respecting locks)
 * Payload: Direction to advance
 */
export type AdvanceCommand = {
  type: 'ADVANCE';
  direction: 'forward' | 'backward';
};

/**
 * UPDATE_NODE_PHASE
 * Command: Update the phase field of a specific node
 * Payload: Node ID and new phase value
 */
export type UpdateNodePhaseCommand = {
  type: 'UPDATE_NODE_PHASE';
  nodeId: string;
  phase: Phase;
};

/**
 * Union of all commands that mutate the graph
 */
export type NavigationCommand =
  | InsertAfterCommand
  | NavigateToCommand
  | DeleteNodeCommand
  | AdvanceCommand
  | UpdateNodePhaseCommand;

// ============================================================================
// MACHINE STATE SCHEMA
// ============================================================================

/**
 * Machine State Value
 *
 * Hierarchical state structure for the navigation machine.
 * Format: "parent.child" where parent is the major phase and child is the specific step.
 */
export type NavigationStateValue =
  // Boot phase states
  | { boot: 'waiting_for_story' }
  | { boot: 'loading_story' }
  | { boot: 'ready' }
  | { boot: 'error' }
  // Dialogue flow states
  | { dialogue: 'input' }
  | { dialogue: 'ai_waiting' }
  | { dialogue: 'answer_waiting' }
  | { dialogue: 'answer_right' }
  | { dialogue: 'answer_wrong' }
  // Feedback flow states
  | { feedback: 'success_dance' }
  | { feedback: 'fail_dance' }
  // Error states
  | { error: 'recoverable' }
  | { error: 'fatal' };

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Re-export key types for convenient importing
  NavigationEvent as Event,
  NavigationAction as Action,
  NavigationCommand as Command,
  NavigationContext as Context,
  NavigationStateValue as StateValue,
};
