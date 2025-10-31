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

import { setup, sendParent } from 'xstate';


export type QuestSceneEvent =
  | { type: 'SCROLL_DOWN_STEP'; source?: string }
  | { type: 'SCROLL_UP_STEP'; source?: string }
  | { type: 'ACCEPT_PRESSED' };

/**
 * Quest Scene State Machine
 *
 * Three states:
 * 1. Showing Quest - Quest is displayed, scrolling is disabled, back and forth
 * 2. Accepted - Player has accepted the quest, the user automatically scrolls forward and the quest Scene is removed from NodeStorage.

 */
export const questSceneMachine = setup({
  types: {
    events: {} as QuestSceneEvent,
  },
}).createMachine({
  id: 'questScene',
  initial: 'routing',
  context: () => ({

  }),
  entry: ({ context }) => {
  },
  states: {

   

    /**
     * IMAGE_ONLY
     * Just showing the image without caption
     */
    show_quest: {
      entry: () => console.log('[QuestSceneMachine] Entered show_quesst'),
      on: {
        SCROLL_DOWN_STEP: {
          actions: [
            () => console.log('[QuestSceneMachine] Scroll down blocked.'),
          ],
        },
        SCROLL_UP_STEP: {
          actions: [
            () => console.log('[QuestSceneMachine] Scroll up blocked.'),
          ],
        },
        ACCEPT_PRESSED: {
          actions: [
            () => console.log('[QuestSceneMachine] Accept Pressed.'),
            sendParent({
              type: 'DELETE_CURRENT_NODE_AND_NAV_NEXT',
            }),
          ],
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
