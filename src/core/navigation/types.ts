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

/**
 * Scene state - describes what state a particular scene is in
 * Different scene types have different possible states
 */
export type SceneState =
  | { type: 'image'; state: ImageState }
  | { type: 'dialogue'; state: DialogueState }
  | { type: 'static' }  // For text, full, caption - scenes with no state variations
  | { type: 'quest'; state: 'idle' | 'active' | 'completed' | 'failed' };

/**
 * Navigation item - represents one "stop" in the navigation array
 * This is the fundamental unit of navigation - each scroll action moves
 * from one NavigationItem to the next
 */
export interface NavigationItem {
  // The scene this navigation item belongs to
  scene: Scene;

  // Unique identifier for this scene (used to detect scene changes)
  sceneId: string;

  // Current state of this scene
  sceneState: SceneState;

  // Scroll locking (optional - can be computed from state)
  lockForward?: boolean;
  lockBackward?: boolean;

  // Metadata
  index: number;  // Position in the navigation array
}

/**
 * Helper type to check if two navigation items are the same scene
 */
export function isSameScene(a: NavigationItem, b: NavigationItem): boolean {
  return a.sceneId === b.sceneId;
}

/**
 * Helper to determine if navigation should trigger scroll animation
 */
export function shouldScroll(from: NavigationItem, to: NavigationItem): boolean {
  return !isSameScene(from, to);
}
