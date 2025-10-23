/**
 * Central Type Definitions for Wonder.io 2.0
 *
 * This file consolidates all major types used throughout the application.
 * Import from this file for all type needs to maintain consistency.
 *
 * Organization:
 * - Scene Types: Definitions for all scene variants
 * - Navigation Types: Graph structure and navigation state
 * - Dialogue Types: Chat, recording, and interaction states
 * - Character Types: Panel and animation types
 * - Background Types: Background rendering types
 * - AI Types: AI module and memory types
 * - Utility Types: Helper types and enums
 */

// ============================================================================
// SCENE TYPES
// ============================================================================

/**
 * Character scene with dialogue and interaction capabilities
 * Can include quest and input states via States array
 */
export type CharacterScene = {
  type: "character";
  sceneId?: string;
  text: string; // Empty string during recording, filled when transcript arrives
  speaker?: "left" | "right";
  background?: string;
  "left-character"?: string | null;
  "right-character"?: string | null;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  States?: string[]; // Array of feature states: "quest", "input"
  recordingId?: string; // Links to active recording session
  isRecording?: boolean; // Visual flag during recording
  flowId?: string; // Reference to flow metadata (characterDescription, successAnswer)
  meta?: {
    panelLeft?: PanelMeta;
    panelRight?: PanelMeta;
  };
};

/**
 * Image scene with optional caption
 */
export type ImageScene = {
  type: "image";
  sceneId?: string;
  image: string;
  text?: string; // Caption text (legacy property name)
  caption?: string; // Alternative caption property
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  meta?: {
    panelLeft?: PanelMeta;
    panelRight?: PanelMeta;
  };
};

/**
 * Character flow scene (flattened into CharacterScene during processing)
 */
export type CharacterFlowScene = {
  type: "character-flow";
  sceneId?: string;
  background?: string;
  "left-character"?: string | null;
  "right-character"?: string | null;
  hidden?: boolean;
  flow: Array<{
    side?: "left" | "right";
    text?: string;
    quest?: string;
    input?: string;
    type?: "input" | "quest";
    CharacterDescription?: string; // AI chat context
    successAnswer?: string; // Expected answer for quest
    States?: string[];
  }>;
};

/**
 * Full-screen text scene
 */
export type FullScene = {
  type: "full";
  sceneId?: string;
  text: string;
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  meta?: {
    panelLeft?: PanelMeta;
    panelRight?: PanelMeta;
  };
};

/**
 * Text scene with optional character
 */
export type TextScene = {
  type: "text";
  sceneId?: string;
  text: string;
  character?: string;
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
};

/**
 * Fail animation scene (wrong answer feedback)
 */
export type FailDanceScene = {
  type: "fail-dance";
  sceneId?: string;
  background?: string;
  character: string; // Regular character name
  angryCharacter: string; // Angry version character name
  side?: "left" | "right";
  "left-character"?: string;
  "right-character"?: string | null;
  duration?: number; // Animation duration in ms (default: 3500)
  answerText?: string; // Wrong answer to display
  questionText?: string; // Quest text to display
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  meta?: {
    panelLeft?: PanelMeta;
    panelRight?: PanelMeta;
  };
};

/**
 * Success animation scene (correct answer feedback)
 */
export type SuccessDanceScene = {
  type: "success-dance";
  sceneId?: string;
  background?: string;
  character: string; // Regular character name
  happyCharacter: string; // Happy/celebrating character name
  side?: "left" | "right";
  "left-character"?: string;
  "right-character"?: string | null;
  duration?: number; // Animation duration in ms (default: 3500)
  answerText?: string; // Correct answer to display
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  meta?: {
    panelLeft?: PanelMeta;
    panelRight?: PanelMeta;
  };
};

/**
 * Union type of all scene variants
 */
export type Scene =
  | CharacterScene
  | ImageScene
  | CharacterFlowScene
  | FullScene
  | TextScene
  | FailDanceScene
  | SuccessDanceScene;

/**
 * Story container
 */
export type Story = {
  scenes: Scene[];
};

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

/**
 * Unique identifier for a node
 */
export type NodeId = string;

/**
 * Unique identifier for a scene
 */
export type SceneId = string;

/**
 * Scene state - describes what state a particular scene is in
 */
export type SceneState =
  | { type: 'image'; state: ImageState }
  | { type: 'dialogue'; state: DialogueState; questionText?: string; answerText?: string; allowAnimate?: boolean }
  | { type: 'static' }
  | { type: 'quest'; state: 'idle' | 'active' | 'completed' | 'failed' };

/**
 * Navigation node - represents one stop in the navigation graph
 */
export interface Node {
  /** Unique, stable ID for this node (used as React key) */
  id: NodeId;
  /** Parent scene ID */
  sceneId: SceneId;
  /** Semantic state key (e.g., "enter", "speak", "dialogue:quest-showing") */
  stateKey: string;
  /** Complete scene state data */
  sceneState: SceneState;
  /** Original scene data */
  scene: Scene;
  /** Additional metadata */
  stateMeta?: {
    pose?: string | null;
    timing?: number;
    [key: string]: unknown;
  };
  /** Pointer to previous node */
  prevId: NodeId | null;
  /** Pointer to next node */
  nextId: NodeId | null;
  /** Node lifecycle status */
  status: 'active' | 'pendingRemoval';
  /** Scroll lock flags */
  lockForward?: boolean;
  lockBackward?: boolean;
}

/**
 * Scene boundary information for fast scene operations
 */
export interface SceneInfo {
  id: SceneId;
  firstNodeId: NodeId;
  lastNodeId: NodeId;
  nodeCount: number;
}

/**
 * Registry for fast scene lookups
 */
export interface SceneRegistry {
  byId: Record<SceneId, SceneInfo>;
  order: SceneId[];
}

/**
 * Complete navigation graph structure
 */
export interface NavigationGraph {
  /** All nodes indexed by ID */
  byId: Record<NodeId, Node>;
  /** Linear traversal order */
  order: NodeId[];
  /** Currently active node */
  currentId: NodeId | null;
  /** Last frozen snapshot for animations */
  lastFrozenNode: FrozenNodeSnapshot | null;
  /** Version counter for structural changes */
  historyVersion: number;
  /** Optional scene registry */
  sceneRegistry?: SceneRegistry;
}

/**
 * Frozen snapshot of a node for stable animations
 */
export interface FrozenNodeSnapshot {
  nodeId: NodeId;
  sceneId: SceneId;
  stateKey: string;
  sceneState: SceneState;
  scene: Scene;
}

/**
 * Pending node deletion with compaction timer
 */
export interface PendingNodeDeletion {
  nodeId: NodeId;
  sceneId: SceneId;
  scheduledAt: number;
  timerId: number;
  compactAt: number;
}

/**
 * Graph pointer update operation
 */
export interface RewiringOperation {
  nodeId: NodeId;
  field: 'prevId' | 'nextId';
  newValue: NodeId | null;
  previousValue?: NodeId | null;
}

// ============================================================================
// DIALOGUE & INTERACTION TYPES
// ============================================================================

/**
 * Image caption states
 */
export type ImageState =
  | 'hidden'
  | 'showing';

/**
 * Dialogue scene interaction states
 */
export type DialogueState =
  | 'basic'
  | 'pre-feature'
  | 'input-ready'
  | 'input-recording'
  | 'input-processing'
  | 'waiting-for-finalize'
  | 'ai-waiting'
  | 'quest-basic'
  | 'quest-showing'
  | 'quest-accepted'
  | 'input-basic'
  | 'input-showInput'
  | 'show-hint'
  | 'record-answer'
  | 'answer-processing'
  | 'waiting-for-answer-finalize'
  | 'answer-waiting'
  | 'answer-right'
  | 'answer-wrong';

/**
 * Message delivery status in chat
 */
export type DeliveryStatus =
  | 'draft'
  | 'recording'
  | 'pending'
  | 'sent'
  | 'converting'
  | 'converted'
  | 'error';

/**
 * Message sender type
 */
export type Sender = 'player' | 'npc';

/**
 * Chat message
 */
export type Message = {
  id: string;
  sceneId: string;
  sender: Sender;
  text: string;
  status: DeliveryStatus;
  isInterim?: boolean;
  ts: string;
};

/**
 * Conversation turn for scene conversion
 */
export type ConversationTurn = {
  playerMessageId: string;
  npcMessageId: string;
  sceneId: string;
};

// ============================================================================
// CHARACTER & PANEL TYPES
// ============================================================================

/**
 * Panel side identifier
 */
export type PanelSide = 'left' | 'right';

/**
 * Panel metadata for character positioning
 */
export interface PanelMeta {
  character: string;
  previousCharacter?: string;
  nextCharacter?: string;
  newCharacter?: boolean;
  aboutToSwap?: boolean;
}

/**
 * Lightweight panel state
 */
export interface PanelStateLite {
  visible: boolean;
  character?: string | null;
  pose?: string | null;
  speaking?: boolean;
}

/**
 * Panel range for batched rendering
 */
export interface PanelRange {
  startIndex: number;
  endIndex: number;
  left?: PanelStateLite;
  right?: PanelStateLite;
}

// ============================================================================
// BACKGROUND TYPES
// ============================================================================

/**
 * Minimal scene properties for background logic
 */
export interface SceneContent {
  type: string;
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
}

/**
 * Background range definition
 */
export interface BackgroundRange {
  startIndex: number;
  endIndex: number;
  background: string;
  isImage: boolean;
}

// ============================================================================
// AI & MEMORY TYPES
// ============================================================================

/**
 * AI conversation message
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

/**
 * Conversation history per flow
 */
export interface ConversationHistory {
  flowId: string;
  messages: ConversationMessage[];
  characterDescription?: string;
}

/**
 * AI module input
 */
export interface AIInput {
  text: string;
  conversationHistory?: ConversationMessage[];
  context?: {
    characterDescription?: string;
  };
}

/**
 * AI module response
 */
export interface AIResponse {
  text: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// RECORDING TYPES
// ============================================================================

/**
 * Recording state
 */
export interface RecordingState {
  isRecording: boolean;
  audioLevel: number;
  transcript: string;
  isFinal: boolean;
}

// ============================================================================
// FLOW METADATA TYPES
// ============================================================================

/**
 * Metadata for a story flow
 */
export interface FlowMetadata {
  characterDescription?: string;
  successAnswer?: string;
  [key: string]: unknown;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

import { ulid } from "ulid";

export const newId = () => ulid();
export const nowIso = () => new Date().toISOString();
