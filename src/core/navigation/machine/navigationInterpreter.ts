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
const inspector = typeof window !== 'undefined' && window.location.hostname === 'localhost'
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
    console.warn('[NavigationInterpreter] Service already started');
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

    console.log('[NavigationInterpreter] Received event:', event.type);
    serviceInstance.send(event);
  });

  // Listen to machine transitions and process actions
  serviceInstance.subscribe((snapshot) => {
    // Get the current node using convenience method
    const node = useNavigationStore.getState().getCurrentNode();

    // Build log info with machine state and complete node
    const logInfo: Record<string, unknown> = {
      machineState: snapshot.value,
      scene: node?.scene?.type || 'none',
      phase: node?.phase || 'none',
      nodeId: node?.id.substring(0, 8) + '...' || 'none',
    };

    console.log('[NavigationInterpreter] State changed to:', logInfo);

    // Note: Actions now call store methods directly, no queue processing needed
  });

  // Start the machine
  serviceInstance.start();

  console.log('[NavigationInterpreter] Navigation service started');

  // Kick off the boot sequence by requesting the gingerbread story to be loaded
  serviceInstance.send({
    type: 'LOAD_STORY_REQUESTED',
    storyId: 'testStory'
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
    console.warn('[NavigationInterpreter] No service to stop');
    return;
  }

  serviceInstance.stop();
  serviceInstance = null;

  console.log('[NavigationInterpreter] Navigation service stopped');
}

/**
 * Get the current service instance (for debugging/testing)
 */
export function getServiceInstance(): ReturnType<typeof createActor> | null {
  return serviceInstance;
}
