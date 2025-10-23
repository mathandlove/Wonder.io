/**
 * State Node Types - Core data structures for state-granular navigation
 *
 * This module defines the fundamental building blocks of the state-node navigation system:
 * - StateNode: Individual navigation unit (replaces scene-level navigation)
 * - NavigatorState: Complete navigation graph with pointer-based traversal
 * - SceneRegistry: Fast scene-range operations (O(1) scene deletion)
 *
 * Key Concepts:
 * 1. Each state (enter, speak, exit, dialogue:quest-showing) is a separate node
 * 2. Nodes are linked via prevId/nextId pointers (doubly-linked list)
 * 3. IDs are stable and never change (React keys use node.id)
 * 4. Deletion is two-phase: mark as pendingRemoval, then compact after animation
 */

import type { SceneState } from './types';

/**
 * Unique identifier for a state node
 * Generated using ulid() for stable, sortable IDs
 */
export type StateNodeId = string;

/**
 * Unique identifier for a scene (multiple state nodes can share the same sceneId)
 */
export type SceneId = string;

/**
 * StateNode - A single navigation unit representing one state in the story
 *
 * Each node represents a specific state within a scene (e.g., "enter", "speak", "exit",
 * or dialogue substates like "quest-showing", "input-recording").
 *
 * Navigation happens by traversing the linked list via prevId/nextId pointers.
 * Visual animations read from frozen snapshots while the graph can be mutated freely.
 */
export interface StateNode {
  /** Unique, stable ID for this state node (used as React key) */
  id: StateNodeId;

  /** Parent scene ID - multiple nodes can belong to the same scene */
  sceneId: SceneId;

  /**
   * Semantic key describing this state's purpose
   * Examples:
   * - "enter" - Character entrance state
   * - "speak" - Main dialogue/interaction state
   * - "exit" - Character exit state
   * - "dialogue:quest-showing" - Quest UI visible
   * - "dialogue:input-recording" - Recording user input
   * - "dialogue:answer-right" - Correct answer feedback
   * - "image:hidden" - Image before caption reveal
   * - "image:showing" - Image with caption visible
   */
  stateKey: string;

  /**
   * Complete scene state data (type, state, metadata)
   * This is the full SceneState object that was previously in NavigationItem
   */
  sceneState: SceneState;

  /**
   * Original scene data (stored for easy access)
   * This is the full Scene object from the story
   */
  scene: unknown; // Will be typed as Scene in implementation

  /**
   * Additional metadata for this state (optional)
   * Can include pose hints, timing info, visual effects, etc.
   */
  stateMeta?: {
    pose?: string | null;
    timing?: number;
    [key: string]: unknown;
  };

  /** Pointer to previous state node (null if this is the head) */
  prevId: StateNodeId | null;

  /** Pointer to next state node (null if this is the tail) */
  nextId: StateNodeId | null;

  /**
   * Node lifecycle status
   * - "active": Normal, navigable node
   * - "pendingRemoval": Marked for deletion, skipped in navigation, will be compacted after animation
   */
  status: 'active' | 'pendingRemoval';

  /**
   * Scroll lock flags (computed from sceneState, not stored permanently)
   * These control whether navigation is allowed in each direction
   */
  lockForward?: boolean;
  lockBackward?: boolean;
}

/**
 * SceneInfo - Metadata for fast scene-range operations
 *
 * Tracks the first and last state nodes of a scene, enabling O(1) scene deletion:
 * - Delete scene: Mark range [firstNodeId...lastNodeId] as pendingRemoval
 * - Rewire neighbors: prevScene.lastNode.nextId = nextScene.firstNode.id
 */
export interface SceneInfo {
  /** Scene identifier */
  id: SceneId;

  /** First state node of this scene */
  firstNodeId: StateNodeId;

  /** Last state node of this scene */
  lastNodeId: StateNodeId;

  /** Number of state nodes in this scene (for quick scene length checks) */
  nodeCount: number;
}

/**
 * SceneRegistry - Fast lookup for scene boundaries and range operations
 *
 * Optional but recommended for efficient scene-level operations:
 * - Insert/delete entire scenes without traversing the graph
 * - Query scene boundaries (first/last nodes)
 * - Update scene pointers when nodes are added/removed
 */
export interface SceneRegistry {
  /** Map of scene ID to scene info */
  byId: Record<SceneId, SceneInfo>;

  /** Ordered list of scene IDs (same order as they appear in the story) */
  order: SceneId[];
}

/**
 * NavigatorState - Complete navigation graph state
 *
 * This is the single source of truth for navigation. Replaces the flat
 * array of NavigationItems with a proper graph structure.
 *
 * Navigation is pointer-based:
 * - getCurrentNode() → byId[currentId]
 * - getPrevNode(id) → byId[byId[id].prevId]
 * - getNextNode(id) → byId[byId[id].nextId]
 *
 * The 'order' array is for debugging/iteration only - navigation should
 * use pointer traversal for correctness.
 */
export interface NavigatorState {
  /** Canonical store of all state nodes (both active and pendingRemoval) */
  byId: Record<StateNodeId, StateNode>;

  /**
   * Linear traversal order for iteration/debugging
   * Contains all node IDs in story order
   * Note: For navigation, use pointer traversal (prevId/nextId), not this array
   */
  order: StateNodeId[];

  /** Currently active state node ID (null if no navigation initialized) */
  currentId: StateNodeId | null;

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

  /** Scene registry for fast scene-range operations (optional) */
  sceneRegistry?: SceneRegistry;
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
  nodeId: StateNodeId;

  /** Scene ID (for logging/debugging) */
  sceneId: SceneId;

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
  nodeId: StateNodeId;

  /** Field to update ("prevId" or "nextId") */
  field: 'prevId' | 'nextId';

  /** New pointer value (null if becoming head/tail) */
  newValue: StateNodeId | null;

  /** Optional: Previous value (for undo/logging) */
  previousValue?: StateNodeId | null;
}
