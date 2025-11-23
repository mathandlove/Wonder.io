/**
 * Navigation Event Bus
 *
 * Single intake point for all domain events that affect navigation.
 * Events flow: UI/Media/AI -> Event Bus -> Machine Interpreter
 *
 * NOTE: Only ONE subscriber is allowed - the machine interpreter.
 * All other code must emit events, not subscribe.
 *
 * @module navigationBus
 */

import type { NavigationEvent } from '../machine/types';
import { logEvent } from '../devtools/navigationLogger';

/**
 * Internal subscriber reference
 * This MUST be a singleton - only the machine interpreter subscribes
 */
let subscriber: ((event: NavigationEvent) => void) | null = null;

/**
 * Emit a domain event to the navigation system
 *
 * All UI components, media handlers, and AI callbacks should use this
 * to communicate navigation-relevant events.
 *
 * @param event - The domain event to emit
 */
export function emit(event: NavigationEvent): void {
  // Log the event first
  logEvent(event);

  // Notify main subscriber (machine interpreter)
  if (!subscriber) {
    console.warn('[NavigationBus] No subscriber registered, event dropped:', event.type);
    return;
  }

  try {
    subscriber(event);
  } catch (error) {
    console.error('[NavigationBus] Error in subscriber:', error);
    // Don't rethrow - we don't want emitters to crash if machine has issues
  }
}

/**
 * Subscribe to navigation events
 *
 * WARNING: This should ONLY be called by the machine interpreter.
 * Calling this multiple times will override the previous subscriber.
 *
 * @param handler - Function to call when events are emitted
 * @returns Unsubscribe function
 */
export function subscribe(handler: (event: NavigationEvent) => void): () => void {
  if (subscriber !== null) {
    console.warn('[NavigationBus] Subscriber already registered, replacing it');
  }

  subscriber = handler;

  // Return unsubscribe function
  return () => {
    subscriber = null;
  };
}
