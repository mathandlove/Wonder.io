/**
 * ClueImage Scene Machine
 *
 * Manages state transitions for interactive clue-finding scenes
 *
 * States:
 * - active: Finding clues (scroll locked)
 * - complete: All clues found (scroll unlocked, can continue)
 *
 * Flow:
 * - Start in 'active' state with scroll locked
 * - When all clues found: transition to 'complete'
 * - In 'complete': SCROLL_DOWN navigates to next scene
 * - SCROLL_UP always blocked (can't go back from clue scene until complete)
 *
 * @module clueImageSceneMachine
 */

import { setup, sendParent } from 'xstate';
import { useNavigationStore } from '@core/navigation/navigationStore';

export type ClueImageSceneContext = {
  totalClues: number;
  foundClues: number;
};

export type ClueImageSceneEvent =
  | { type: 'SCROLL_DOWN_STEP'; source?: string }
  | { type: 'SCROLL_UP_STEP'; source?: string }
  | { type: 'CLUE_FOUND'; clueLabel: string }
  | { type: 'ALL_CLUES_FOUND' }
  | { type: 'CONTINUE' };

/**
 * ClueImage Scene State Machine
 *
 * States:
 * - active: Searching for clues (scroll locked)
 * - complete: All clues found (scroll enabled)
 *
 * The machine blocks all scroll events in 'active' state.
 * Once all clues are found, it transitions to 'complete' and allows forward navigation.
 */
export const clueImageSceneMachine = setup({
  types: {
    context: {} as ClueImageSceneContext,
    events: {} as ClueImageSceneEvent,
    input: {} as {
      totalClues: number;
      foundClues?: number;
    },
  },
  guards: {
    allCluesFound: ({ context }) => context.foundClues >= context.totalClues,
  },
}).createMachine({
  id: 'clueImageScene',
  initial: 'active',
  context: ({ input }) => ({
    totalClues: input.totalClues,
    foundClues: input.foundClues || 0,
  }),
  entry: ({ context }) => {
    console.log('[ClueImageSceneMachine] Started', {
      totalClues: context.totalClues,
      foundClues: context.foundClues,
    });
  },
  states: {
    /**
     * ACTIVE - Finding clues
     * Scroll is locked until all clues are found
     */
    active: {
      entry: () => {
        console.log('[ClueImageSceneMachine] 🔒 Entered active state - scroll locked');
      },
      on: {
        // Block all scroll events
        SCROLL_DOWN_STEP: {
          actions: () => {
            console.log('[ClueImageSceneMachine] ⛔ SCROLL_DOWN blocked - find all clues first');
          },
        },
        SCROLL_UP_STEP: {
          actions: () => {
            console.log('[ClueImageSceneMachine] ⛔ SCROLL_UP blocked - find all clues first');
          },
        },
        // Track clue discovery
        CLUE_FOUND: {
          actions: ({ context, event }) => {
            console.log('[ClueImageSceneMachine] 🔍 Clue found:', event.clueLabel,
              `(${context.foundClues + 1}/${context.totalClues})`);
          },
        },
        // Transition to complete when all clues found
        ALL_CLUES_FOUND: {
          target: 'complete',
          guard: 'allCluesFound',
        },
      },
    },

    /**
     * COMPLETE - All clues found
     * Scroll is unlocked, can navigate forward
     */
    complete: {
      entry: () => {
        console.log('[ClueImageSceneMachine] 🔓 Entered complete state - scroll unlocked');

        // Update navigation store to mark scene as complete
        // This allows backward navigation to show the colored image
        const store = useNavigationStore.getState();
        const currentNode = store.getCurrentNode();

        if (currentNode) {
          // Update scene properties to indicate completion
          store.updateCurrentSceneProperties({
            phase: 'complete',
          });

          console.log('[ClueImageSceneMachine] ✅ Scene marked as complete');
        }
      },
      on: {
        // Allow forward navigation
        SCROLL_DOWN_STEP: {
          actions: [
            () => {
              console.log('[ClueImageSceneMachine] ➡️ SCROLL_DOWN - navigating to next scene');
            },
            // Request navigation to next node
            sendParent({ type: 'REQUEST_NAV_NEXT' }),
          ],
        },
        CONTINUE: {
          actions: [
            () => {
              console.log('[ClueImageSceneMachine] ➡️ CONTINUE - navigating to next scene');
            },
            // Request navigation to next node
            sendParent({ type: 'REQUEST_NAV_NEXT' }),
          ],
        },
        // Block backward navigation
        SCROLL_UP_STEP: {
          actions: () => {
            console.log('[ClueImageSceneMachine] ⛔ SCROLL_UP blocked - use Continue button to proceed');
          },
        },
      },
    },
  },
});
