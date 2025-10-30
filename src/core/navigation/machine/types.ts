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
 * Emitted when: Video/animation playback finishes (e.g., success/fail dance)
 * Payload: Which video/animation completed
 */
export type VideoCompleteEvent = {
  type: 'VIDEO_COMPLETE';
  nodeId: string;
  videoType: 'success-dance' | 'fail-dance' | 'celebration';
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
 * Emitted when: User begins recording (Ask or Answer)
 * Payload: Recording type
 */
export type RecordingStartedEvent = {
  type: 'RECORDING_STARTED';
  nodeId: string;
  recordingType: 'question' | 'answer';
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
  phase: string;
};

/**
 * NODE_CHANGED
 * Emitted when: navigationStore.currentId changes (after ADVANCE or NAVIGATE_TO commands)
 * Purpose: Trigger machine to re-route to the correct scene type for the new node
 */
export type NodeChangedEvent = {
  type: 'NODE_CHANGED';
  nodeId: string;
};

/**
 * Union of all domain events the machine can receive
 */
export type NavigationEvent =
  | TranscriptReadyEvent
  | AiDoneEvent
  | AnswerValidatedEvent
  | VideoCompleteEvent
  | TimeoutEvent
  | UserNavigateEvent
  | InternalErrorEvent
  | RecordingStartedEvent
  | RecordingStoppedEvent
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
  | NodeChangedEvent;

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
 * SET_STATE
 * Intent: Update the dialogue state of the current node
 * Example: Move from 'input-recording' to 'input-processing'
 */
export type SetStateAction = {
  type: 'SET_STATE';
  nodeId: string;
  dialogueState: string; // DialogueState from types.ts
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
  phase: string;
};

/**
 * Union of all action intents the machine can emit
 */
export type NavigationAction =
  | ToSuccessDanceAction
  | ToFailDanceAction
  | SetStateAction
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
    sceneState: any; // Will be properly typed when integrated with Node type
    metadata?: Record<string, any>;
  };
};

/**
 * REPLACE_NODE
 * Command: Replace an existing node's data
 * Payload: Node ID and new data to merge
 */
export type ReplaceNodeCommand = {
  type: 'REPLACE_NODE';
  nodeId: string;
  updates: {
    sceneState?: any; // Will be properly typed when integrated
    metadata?: Record<string, any>;
  };
};

/**
 * SET_NODE_STATE
 * Command: Update only the scene state of a node
 * Payload: Node ID and new dialogue state
 */
export type SetNodeStateCommand = {
  type: 'SET_NODE_STATE';
  nodeId: string;
  newState: any; // Will be properly typed when integrated with SceneState
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
  phase: string;
};

/**
 * Union of all commands that mutate the graph
 */
export type NavigationCommand =
  | InsertAfterCommand
  | ReplaceNodeCommand
  | SetNodeStateCommand
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
