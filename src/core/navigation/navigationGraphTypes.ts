/**
 * Navigation Graph Types - Core data structures for node-based navigation
 *
 * This module defines the fundamental building blocks of the navigation system:
 * - Node: Individual navigation unit representing one state in the story
 * - NavigationGraph: Complete navigation graph with pointer-based traversal
 * - SceneRegistry: Fast scene-range operations (O(1) scene deletion)
 *
 * Key Concepts:
 * 1. Each state (enter, speak, exit, dialogue:quest-showing) is a separate node
 * 2. Nodes are linked via prevId/nextId pointers (doubly-linked list)
 * 3. IDs are stable and never change (React keys use node.id)
 * 4. Deletion is two-phase: mark as pendingRemoval, then compact after animation
 */

import type { Scene } from '@core/types/scene';

/**
 * Phase - Strict type representing all valid phase/state names
 *
 * This is the single source of truth for phase names. Use this type
 * everywhere to ensure type safety and prevent phase name mismatches.
 *
 * Image phases:
 * - 'image_only' - Just showing the image
 * - 'caption' - Showing image with caption overlay
 *
 * Dialogue phases:
 * - 'basic' - Default dialogue state
 * - 'input-basic' - Showing input option
 * - 'input-showInput' - Input UI visible
 * - 'input-recording' - User is recording
 * - 'input-processing' - Processing the recording
 * - 'ai-waiting' - Waiting for AI response
 * - 'record-answer' - Recording an answer to a question
 * - 'waiting-for-answer-finalize' - Answer recording finalizing
 * - 'answer-processing' - Processing answer recording
 * - 'answer-waiting' - Waiting for answer validation
 * - 'answer-right' - Answer was correct
 * - 'answer-wrong' - Answer was incorrect
 *
 * Quest phases:
 * - 'quest-showing' - Quest prompt is displayed (THE ONLY VALID QUEST PHASE NAME)
 * - 'quest-accepted' - User accepted the quest
 *
 * Special scene phases:
 * - 'success-dance' - Success celebration animation
 * - 'fail-dance' - Failure animation
 *
 * Other:
 * - 'static' - For scenes with no state variations (text, full, caption)
 * - 'input' - Generic input phase (legacy, prefer specific input-* phases)
 */
export type Phase =
  // Image phases
  | 'image_only'
  | 'caption'
  // Dialogue phases
  | 'basic'
  | 'input-basic'
  | 'input-showInput'
  | 'input-recording'
  | 'input-processing'
  | 'recording-submit'  // User reviewing transcript before submitting to AI
  | 'no-audio-recorded' // No audio was recorded (empty/silent recording)
  | 'no-microphone' // No microphone detected
  | 'waiting-for-finalize'  // Waiting for ask recording to finalize
  | 'ai-waiting'
  | 'record-answer'
  | 'waiting-for-answer-finalize'
  | 'answer-processing'
  | 'answer-submit'  // User reviewing answer transcript before submitting for validation
  | 'answer-waiting'
  | 'answer-right'
  | 'answer-wrong'
  // Clue-based input phases (when useClues=true)
  | 'askClue'      // Selecting a clue to ask about
  | 'answerClue'   // Recording answer about selected clue
  // Quest phases
  | 'quest-showing'  // ⚠️ THE ONLY VALID QUEST PHASE - use this everywhere!
  | 'quest-accepted'
  | 'quest-standalone' // Standalone quest node (no speech bubble)
  // Clue scene phases
  | 'active'    // Finding clues
  | 'complete'  // All clues found
  // Special scene phases
  | 'success-dance'
  | 'fail-dance'
  // Static/other
  | 'static'
  | 'input';


/**
 * Phase constants - Use these to avoid typos when working with phases
 *
 * @example
 * ```ts
 * import { PHASES } from '@core/navigation/navigationGraphTypes';
 *
 * // Instead of: if (phase === 'quest-showing')
 * // Use: if (phase === PHASES.QUEST_SHOWING)
 * ```
 */
export const PHASES = {
  // Image phases
  IMAGE_ONLY: 'image_only' as const,
  CAPTION: 'caption' as const,

  // Dialogue phases
  BASIC: 'basic' as const,
  INPUT_BASIC: 'input-basic' as const,
  INPUT_SHOW_INPUT: 'input-showInput' as const,
  INPUT_RECORDING: 'input-recording' as const,
  INPUT_PROCESSING: 'input-processing' as const,
  RECORDING_SUBMIT: 'recording-submit' as const,
  NO_AUDIO_RECORDED: 'no-audio-recorded' as const,
  NO_MICROPHONE: 'no-microphone' as const,
  AI_WAITING: 'ai-waiting' as const,
  RECORD_ANSWER: 'record-answer' as const,
  WAITING_FOR_ANSWER_FINALIZE: 'waiting-for-answer-finalize' as const,
  ANSWER_PROCESSING: 'answer-processing' as const,
  ANSWER_WAITING: 'answer-waiting' as const,
  ANSWER_RIGHT: 'answer-right' as const,
  ANSWER_WRONG: 'answer-wrong' as const,

  // Clue-based input phases
  ASK_CLUE: 'askClue' as const,
  ANSWER_CLUE: 'answerClue' as const,

  // Quest phases
  QUEST_SHOWING: 'quest-showing' as const,  // ⚠️ THE ONLY VALID QUEST PHASE
  QUEST_ACCEPTED: 'quest-accepted' as const,
  QUEST_STANDALONE: 'quest-standalone' as const, // Standalone quest node (no speech bubble)

  // Clue scene phases
  ACTIVE: 'active' as const,
  COMPLETE: 'complete' as const,

  // Special scene phases
  SUCCESS_DANCE: 'success-dance' as const,
  FAIL_DANCE: 'fail-dance' as const,

  // Static/other
  STATIC: 'static' as const,
  INPUT: 'input' as const,
} as const;

/**
 * Common phase step patterns for different scene types
 */
export const PHASE_STEPS = {
  /** Simple dialogue with no interaction: ["basic"] */
  BASIC_ONLY: ['basic'] as const,

  /** Dialogue with quest: ["basic", "quest-showing"] */
  WITH_QUEST: ['basic', 'quest-showing'] as const,

  /** Full dialogue flow with quest and input: ["basic", "quest-showing", "input"] */
  FULL_DIALOGUE: ['basic', 'quest-showing', 'input'] as const,

  /** Image scene with caption: ["image_only", "caption"] */
  IMAGE_WITH_CAPTION: ['image_only', 'caption'] as const,

  /** Image scene without caption: ["image_only"] */
  IMAGE_ONLY: ['image_only'] as const,
} as const;

/**
 * Unique identifier for a node
 * Generated using ulid() for stable, sortable IDs
 */
export type NodeId = string;


/**
 * Node - A single navigation unit representing one state in the story
 *
 * Each node represents a specific state within a scene (e.g., "enter", "speak", "exit",
 * or dialogue substates like "quest-showing", "input-recording").
 *
 * Navigation happens by traversing the linked list via prevId/nextId pointers.
 * Visual animations read from frozen snapshots while the graph can be mutated freely.
 */
/**
 * Node - A single navigation unit in the story
 *
 * Each node represents one "stop" the user can navigate to.
 * Nodes form a doubly-linked list via prevId/nextId pointers.
 */
export interface Node {
  /** Unique, stable ID for this node (used as React key) */
  id: NodeId;

  /**
   * The scene content for this node
   * Contains the visual/interaction data (image, dialogue, character, etc.)
   */
  scene: Scene;

  /**
   * Current phase of this node
   * Examples: 'image_only', 'caption', 'basic', 'quest-showing', 'input', etc.
   *
   * Invariant: phase === phaseSteps[phaseIndex]
   */
  phase: Phase;

  /**
   * Available phases for this node
   * The node transitions through these phases on scroll before moving to next node
   *
   * Examples:
   * - Simple dialogue: ["basic"]
   * - Dialogue with quest: ["basic", "quest-showing"]
   * - Dialogue with quest and input: ["basic", "quest-showing", "input"]
   * - Image with caption: ["image_only", "caption"]
   */
  phaseSteps: readonly Phase[];

  /**
   * Current position in phaseSteps array
   * Points to the current phase: phaseSteps[phaseIndex] === phase
   *
   * Range: 0 to phaseSteps.length - 1
   */
  phaseIndex: number;

  /** Pointer to previous node (null if this is the head) */
  prevId: NodeId | null;

  /** Pointer to next node (null if this is the tail) */
  nextId: NodeId | null;

  /**
   * Node lifecycle status
   * - "active": Normal, navigable node
   * - "pendingRemoval": Marked for deletion, skipped in navigation
   */
  status: 'active' | 'pendingRemoval';
}

/**
 * SceneInfo - Metadata for fast scene-range operations
 *
 * Tracks the first and last nodes of a scene, enabling O(1) scene deletion:
 * - Delete scene: Mark range [firstNodeId...lastNodeId] as pendingRemoval
 * - Rewire neighbors: prevScene.lastNode.nextId = nextScene.firstNode.id
 */



/**
 * NavigationHistoryEntry - Record of a single navigation event
 *
 * Tracks where the user navigated, when, and why
 */
export interface NavigationHistoryEntry {
  /** When this navigation occurred */
  timestamp: number;

  /** The node we navigated to */
  nodeId: NodeId;

  /** What triggered this navigation */
  trigger: 'forward' | 'backward' | 'force-forward' | 'force-backward' | 'initial' | 'scene-change';

  /** Human-readable description */
  description?: string;
}

/**
 * NodeLifecycleEvent - Record of node creation or deletion
 *
 * Tracks when nodes are added or removed from the graph
 */
export interface NodeLifecycleEvent {
  /** When this event occurred */
  timestamp: number;

  /** Type of event */
  type: 'created' | 'deleted' | 'marked-for-deletion';

  /** The affected node */
  nodeId: NodeId;

  /** Additional context */
  context?: string;
}

/**
 * NavigationGraph - Complete navigation graph structure
 *
 * This is the single source of truth for navigation.
 *
 * Navigation is pointer-based:
 * - getCurrentNode() → byId[currentId]
 * - getPrevNode(id) → byId[byId[id].prevId]
 * - getNextNode(id) → byId[byId[id].nextId]
 *
 * The 'order' array is for debugging/iteration only - navigation should
 * use pointer traversal for correctness.
 */
export interface NavigationGraph {
  /** Canonical store of all nodes (both active and pendingRemoval) */
  byId: Record<NodeId, Node>;

  /**
   * Linear traversal order for iteration/debugging
   * Contains all node IDs in story order
   * Note: For navigation, use pointer traversal (prevId/nextId), not this array
   */
  order: NodeId[];

  /** Currently active node ID (null if no navigation initialized) */
  currentId: NodeId | null;

  /**
   * Frozen snapshot of the previous node (before last navigation)
   * Preserved for exit animations even if the node gets deleted during skip-back
   * Use this to get previous node data for animation coordination
   */
  lastFrozenNode: FrozenNodeSnapshot | null;

  /**
   * Version counter for structural changes
   * Increment when:
   * - Nodes are added/removed
   * - Pointers are rewired
   * - Status changes (active ↔ pendingRemoval)
   *
   * Components can depend on this to trigger re-renders when the graph structure changes
   */
  historyVersion: number;

  /**
   * Navigation history - tracks where the user has been
   * Most recent entries are at the end of the array
   */
  navigationHistory?: NavigationHistoryEntry[];

  /**
   * Node lifecycle events - tracks node creation and deletion
   * Most recent events are at the end of the array
   */
  lifecycleEvents?: NodeLifecycleEvent[];
}

/**
 * PendingNodeDeletion - Scheduled node removal with compaction timer
 *
 * Implements two-phase deletion:
 * 1. Mark node as pendingRemoval (immediate - affects navigation)
 * 2. Compact node from graph (deferred - after animation completes)
 *
 * This ensures animations see stable snapshots while logical navigation
 * can skip over deleted nodes immediately.
 */
export interface PendingNodeDeletion {
  /** Node ID to delete */
  nodeId: NodeId;

  /** When the deletion was scheduled (performance.now()) */
  scheduledAt: number;

  /** Compaction timer ID (for cancellation if node is resurrected) */
  timerId: number;

  /** Expected compaction time = scheduledAt + transitionDuration + buffer */
  compactAt: number;
}

/**
 * RewiringOperation - Describes a graph pointer update
 *
 * Used to track and apply navigation graph rewiring when deleting nodes.
 * Example: Deleting node A (between B and C)
 * - Rewiring: { nodeId: C.id, field: "prevId", newValue: B.id }
 * - Result: B ← C (A is skipped)
 */
export interface RewiringOperation {
  /** Node to update */
  nodeId: NodeId;

  /** Field to update ("prevId" or "nextId") */
  field: 'prevId' | 'nextId';

  /** New pointer value (null if becoming head/tail) */
  newValue: NodeId | null;

  /** Optional: Previous value (for undo/logging) */
  previousValue?: NodeId | null;
}

/**
 * FrozenNodeSnapshot - Immutable snapshot of a node for animations
 *
 * This is a pure data view captured at transition start, containing only
 * what's needed for rendering. Unlike Node, it excludes navigation metadata:
 * - No index (ephemeral, changes with deletions)
 * - No locks (navigation logic, not visual data)
 * - No status (internal graph state)
 * - No pointers (graph structure, not visual data)
 *
 * Use this for:
 * - Character animation data extraction
 * - Transition snapshots
 * - Any system that needs stable scene data during graph mutations
 */
export interface FrozenNodeSnapshot {
  /** Stable node identifier (never changes) */
  nodeId: NodeId;

  /** Original scene data (for character extraction, background, etc.) */
  scene: Scene;
}
