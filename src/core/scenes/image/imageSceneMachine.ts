/**
 * Image Scene Machine
 *
 * Manages the phases of an image scene: image_only → caption
 *
 * Flow:
 * - Start in image_only (just showing the image)
 * - First SCROLL_DOWN_STEP: transition to caption, notify parent
 * - Second SCROLL_DOWN_STEP (in caption): request parent to navigate to next node
 * - Any SCROLL_UP_STEP: request parent to navigate to previous node
 *
 * @module imageSceneMachine
 */

import { setup, assign, sendParent } from 'xstate';

export type ImageSceneContext = {
  phase?: 'image_only' | 'caption';
};

export type ImageSceneEvent =
  | { type: 'SCROLL_DOWN_STEP'; source?: string }
  | { type: 'SCROLL_UP_STEP'; source?: string };

/**
 * Image Scene State Machine
 *
 * Two phases:
 * 1. image_only - Just the image is visible
 * 2. caption - Image with caption overlay
 *
 * Note: This machine does NOT track nodeId - that's the parent's responsibility.
 * It only manages phase transitions and notifies the parent of changes.
 */
export const imageSceneMachine = setup({
  types: {
    context: {} as ImageSceneContext,
    events: {} as ImageSceneEvent,
    input: {} as { phase?: 'image_only' | 'caption' },
  },
}).createMachine({
  id: 'imageScene',
  initial: 'image_only',
  context: ({ input }) => ({
    phase: input.phase || 'image_only',
  }),
  entry: ({ context }) => {
    console.log('[ImageSceneMachine] Started with phase:', context.phase);
  },
  states: {
    /**
     * IMAGE_ONLY
     * Just showing the image without caption
     */
    image_only: {
      entry: () => console.log('[ImageSceneMachine] Entered image_only'),
      on: {
        SCROLL_DOWN_STEP: {
          target: 'caption',
          actions: [
            () => console.log('[ImageSceneMachine] First scroll - transitioning to caption'),
            sendParent({
              type: 'UPDATE_NODE_PHASE',
              phase: 'caption',
            }),
          ],
        },
        SCROLL_UP_STEP: {
          actions: sendParent({ type: 'REQUEST_NAV_PREV' }),
        },
      },
    },

    /**
     * CAPTION
     * Showing image with caption overlay
     */
    caption: {
      entry: () => console.log('[ImageSceneMachine] Entered caption'),
      on: {
        SCROLL_DOWN_STEP: {
          // Caption is shown, next scroll should navigate to next scene
          actions: [
            () => console.log('[ImageSceneMachine] Second scroll - requesting nav next'),
            sendParent({ type: 'REQUEST_NAV_NEXT' }),
          ],
        },
        SCROLL_UP_STEP: {
          actions: sendParent({ type: 'REQUEST_NAV_PREV' }),
        },
      },
    },
  },
});
