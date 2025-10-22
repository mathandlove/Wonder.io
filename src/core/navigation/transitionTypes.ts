/**
 * Transition Management Types
 *
 * Defines the types for the centralized transition manager that decouples
 * animation state (what's visually transitioning) from navigation state
 * (the logical scene graph).
 *
 * Key Concept:
 * - Visual layer reads from frozen TransitionSnapshot
 * - Logical layer (navigationArray) can mutate freely
 * - The two layers sync through the transition manager
 */

/**
 * Character data snapshot for a single panel
 * Frozen at the moment of transition start
 */
export interface CharacterPanelData {
  character: string;           // e.g., "gingerbread", "NOCHARACTER"
  previousCharacter: string;   // Character from previous nav item
  nextCharacter: string;       // Character from next nav item
  pose: string | null;         // Character pose (if any)
}

/**
 * Complete character state for both panels at a point in time
 */
export interface CharacterSnapshot {
  left: CharacterPanelData;
  right: CharacterPanelData;
  speaker: 'left' | 'right' | null; // Which panel is speaking
  sceneId: string;                   // Scene ID this snapshot represents
  navigationIndex: number;           // Navigation index this snapshot represents
  transitionId?: string;             // Unique ID for the transition that created this snapshot
}

/**
 * A frozen snapshot of a transition between two navigation items
 * This is the single source of truth for animations during the transition
 */
export interface TransitionSnapshot {
  id: string;                        // Unique transition ID (ulid)
  fromIndex: number;                 // Navigation index we're transitioning from
  toIndex: number;                   // Navigation index we're transitioning to
  fromSceneId: string;              // Scene ID we're leaving
  toSceneId: string;                // Scene ID we're entering
  fromCharacters: CharacterSnapshot; // Frozen character data from 'from' scene
  toCharacters: CharacterSnapshot;   // Frozen character data from 'to' scene
  startedAt: number;                // performance.now() when transition began
  durationMs: number;               // Expected duration (default 2000ms)
  direction: 'forward' | 'backward'; // Navigation direction
}

/**
 * Rewiring information for navigation graph updates
 * Describes how to update prevId/nextId pointers when deleting a scene
 */
export interface RewiringInfo {
  targetIndex: number;              // Index that should skip the deleted scene
  newPrevSceneId: string | null;   // New prevId for the target (null if deleting head)
  newNextSceneId: string | null;   // New nextId for the previous scene (null if deleting tail)
}

/**
 * A scene scheduled for deletion with deferred compaction
 * Allows animations to complete before the scene is removed
 */
export interface PendingDeletion {
  navigationIndex: number;          // Index to delete
  sceneId: string;                 // Scene ID being deleted
  scheduledAt: number;             // When deletion was scheduled (performance.now())
  timerId: number;                 // setTimeout ID for cancellation
  rewiring: RewiringInfo;          // How to rewire navigation when deleting
}

/**
 * Transition lifecycle event types
 */
export type TransitionEventType =
  | 'transition-begin'     // Fired when beginTransition is called
  | 'transition-complete'  // Fired when transition finishes
  | 'transition-cancel';   // Fired when transition is interrupted

/**
 * Listener for transition events
 */
export type TransitionEventListener = (snapshot: TransitionSnapshot) => void;
