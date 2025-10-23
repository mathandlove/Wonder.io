/**
 * Navigation types for the scene/state navigation system
 *
 * This system treats scenes and their states as a flat navigation array.
 * Each item in the array represents a "navigation stop" that the user can scroll to.
 *
 * Key concept: Scrolling between states of the same scene does NOT trigger
 * a scroll animation - only UI overlays change. Scrolling between different
 * scenes DOES trigger scroll animation.
 */

import type { Scene } from '@core/types/scene';
import type { ImageState, DialogueState } from '@core/dialogue/types';
import type { CharacterSnapshot } from './transitionTypes';

/**
 * Scene state - describes what state a particular scene is in
 * Different scene types have different possible states
 *
 * Dialogue states can optionally carry data:
 * - questionText: Persists Ask recording transcript across waiting-for-finalize and ai-waiting states
 * - answerText: Persists Answer recording transcript across answer states (record-answer, answer-waiting, answer-right/wrong)
 * - allowAnimate: Controls whether character entrance animations should play (default: true, set false when deleting scenes)
 */
export type SceneState =
  | { type: 'image'; state: ImageState }
  | { type: 'dialogue'; state: DialogueState; questionText?: string; answerText?: string; allowAnimate?: boolean }
  | { type: 'static' }  // For text, full, caption - scenes with no state variations
  | { type: 'quest'; state: 'idle' | 'active' | 'completed' | 'failed' };

/**
 * Node - represents one "stop" in the navigation array
 * This is the fundamental unit of navigation - each scroll action moves
 * from one Node to the next
 *
 * IMPORTANT: Use nodeId as React key (not index) for stable reconciliation
 */
export interface Node {
  // Stable unique identifier for this state node (use as React key)
  nodeId: string;

  // The scene this navigation item belongs to
  scene: Scene;

  // Unique identifier for this scene (used to detect scene changes)
  sceneId: string;


  // Current state of this scene
  sceneState: SceneState;




  // Node status (for state-node deletion system)
  status?: 'active' | 'pendingRemoval';
}
