/**
 * Navigation Machine Interpreter
 *
 * Manages the lifecycle of the navigation state machine service.
 * This is the bridge between the event bus and the XState interpreter.
 *
 * @module navigationInterpreter
 */

import { createActor } from 'xstate';
import { createBrowserInspector } from '@statelyai/inspect';
import { navigationMachine } from './navigationMachine';
import * as navigationBus from '../events/navigationBus';
import { useNavigationStore } from '../navigationStore';

/**
 * The running machine service instance
 * Singleton - only one machine runs at a time
 */
let serviceInstance: ReturnType<typeof createActor> | null = null;

/**
 * Create the browser inspector in development mode
 * This enables visualization at https://stately.ai/viz?inspect
 */
const inspector = typeof window !== 'undefined' && import.meta.env.DEV
  ? createBrowserInspector()
  : undefined;

/**
 * Start the navigation machine service
 *
 * This should be called once at app initialization.
 * It creates the XState actor and subscribes it to the event bus.
 *
 * @returns The running service instance
 */
export function startNavigationService(): ReturnType<typeof createActor> {
  if (serviceInstance) {
    return serviceInstance;
  }

  // Create the XState actor with inspector enabled for development
  // The inspector connects to https://stately.ai/viz?inspect for visualization
  serviceInstance = createActor(navigationMachine, {
    inspect: inspector?.inspect,
  });

  // Subscribe to the event bus - forward all events to the machine
  navigationBus.subscribe((event) => {
    if (!serviceInstance) return;
    serviceInstance.send(event);
  });

  // Listen to machine transitions (for future action processing if needed)
  serviceInstance.subscribe(() => {
    // Note: Actions now call store methods directly, no queue processing needed
  });

  // Start the machine
  serviceInstance.start();

  // Expose service instance on window for debugging in development
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    (window as Window & { __xstate?: typeof serviceInstance }).__xstate = serviceInstance;
  }

  // Kick off the boot sequence by requesting the gingerbread story to be loaded
  serviceInstance.send({
    type: 'LOAD_STORY_REQUESTED',
    storyId: 'gingerbread'
  });

  return serviceInstance;
}

/**
 * Stop the navigation machine service
 *
 * Use this for cleanup or testing
 */
export function stopNavigationService(): void {
  if (!serviceInstance) {
    return;
  }

  serviceInstance.stop();
  serviceInstance = null;
}

/**
 * Get the current service instance (for debugging/testing)
 */
export function getServiceInstance(): ReturnType<typeof createActor> | null {
  return serviceInstance;
}
