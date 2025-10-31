/**
 * Dialogue Scene Machine
 *
 * Manages phase transitions for dialogue scenes using phaseSteps
 *
 * Flow:
 * - Reads phaseSteps from node (e.g., ["basic"], ["basic", "quest"], ["basic", "quest", "input"])
 * - SCROLL_DOWN: advances to next phase if available, else requests nav to next node
 * - SCROLL_UP: goes back to previous phase if available, else requests nav to previous node
 *
 * This mirrors imageSceneMachine's pattern - single node, multiple phases.
 *
 * @module dialogueSceneMachine
 */

import { setup, sendParent } from 'xstate';
import { useNavigationStore } from '@core/navigation/navigationStore';

export type DialogueSceneContext = {
  phaseSteps: string[];
  phaseIndex: number;
};

export type DialogueSceneEvent =
  | { type: 'SCROLL_DOWN_STEP'; source?: string }
  | { type: 'SCROLL_UP_STEP'; source?: string };

/**
 * Dialogue Scene State Machine
 *
 * Single state: active
 * - Forwards scroll events to navigationStore.advancePhase()
 * - If phase can't advance, requests parent to navigate nodes
 *
 * Note: This machine does NOT track nodeId - that's the parent's responsibility.
 * It only manages phase transitions within the current node.
 */
export const dialogueSceneMachine = setup({
  types: {
    context: {} as DialogueSceneContext,
    events: {} as DialogueSceneEvent,
    input: {} as {
      phaseSteps: string[];
      phaseIndex: number;
    },
  },
}).createMachine({
  id: 'dialogueScene',
  initial: 'active',
  context: ({ input }) => ({
    phaseSteps: input.phaseSteps || ['basic'],
    phaseIndex: input.phaseIndex || 0,
  }),
  entry: ({ context }) => {
    console.log('[DialogueSceneMachine] Started', {
      phaseSteps: context.phaseSteps,
      currentIndex: context.phaseIndex,
      currentPhase: context.phaseSteps[context.phaseIndex]
    });
  },
  states: {
    /**
     * ACTIVE
     * The dialogue scene is active - handle scroll events for phase navigation
     */
    active: {
      on: {
        SCROLL_DOWN_STEP: {
          actions: [
            () => {
              const store = useNavigationStore.getState();
              const advanced = store.advancePhase(1);

              if (advanced) {
                console.log('[DialogueSceneMachine] Advanced to next phase');
              } else {
                // At end of phases - request navigation to next node
                console.log('[DialogueSceneMachine] Phases complete - requesting nav next');
              }

              // If we couldn't advance phase, request nav to next node
              if (!advanced) {
                // Send REQUEST_NAV_NEXT to parent
                // Note: This will be handled by returning the event to parent
                return { type: 'REQUEST_NAV_NEXT' };
              }
            },
            // Conditionally send to parent if at boundary
            sendParent(({ context }) => {
              const store = useNavigationStore.getState();
              const canAdvance = store.canAdvancePhase(1);

              if (!canAdvance) {
                return { type: 'REQUEST_NAV_NEXT' };
              }

              // Don't send anything if we advanced successfully
              return { type: 'PHASE_ADVANCED' }; // Internal event, ignored by parent
            }),
          ],
        },
        SCROLL_UP_STEP: {
          actions: [
            () => {
              const store = useNavigationStore.getState();
              const advanced = store.advancePhase(-1);

              if (advanced) {
                console.log('[DialogueSceneMachine] Went back to previous phase');
              } else {
                // At beginning of phases - request navigation to previous node
                console.log('[DialogueSceneMachine] At first phase - requesting nav prev');
              }
            },
            // Conditionally send to parent if at boundary
            sendParent(({ context }) => {
              const store = useNavigationStore.getState();
              const canAdvance = store.canAdvancePhase(-1);

              if (!canAdvance) {
                return { type: 'REQUEST_NAV_PREV' };
              }

              // Don't send anything if we advanced successfully
              return { type: 'PHASE_ADVANCED' }; // Internal event, ignored by parent
            }),
          ],
        },
      },
    },
  },
});
