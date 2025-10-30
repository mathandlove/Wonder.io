/**
 * Action Collector
 *
 * Helper to collect NavigationAction intents from machine actions.
 * XState v5 doesn't expose actions on transitions, so we need to collect them manually.
 *
 * @module machine/actionCollector
 */

import type { NavigationAction } from './types';
import { actionsToCommands } from '../commands/executor';
import { enqueue } from '../queue/navigationQueue';
import { logAction } from '../devtools/navigationLogger';
import type { NavigationContext } from './types';

/**
 * Emit a navigation action intent and convert it to commands
 *
 * This should be called from within XState actions to emit action intents.
 *
 * @param context - Current machine context
 * @param action - The action intent to emit
 */
export function emitAction(context: NavigationContext, action: NavigationAction): void {
  // Log the action intent
  logAction(action);

  // Convert the action intent to concrete commands
  const commands = actionsToCommands(context, [action]);

  // Enqueue each command
  for (const command of commands) {
    enqueue(command);
  }
}

/**
 * Emit multiple navigation action intents
 *
 * @param context - Current machine context
 * @param actions - Array of action intents to emit
 */
export function emitActions(context: NavigationContext, actions: NavigationAction[]): void {
  // Log each action intent
  for (const action of actions) {
    logAction(action);
  }

  // Convert all actions to commands
  const commands = actionsToCommands(context, actions);

  // Enqueue each command
  for (const command of commands) {
    enqueue(command);
  }
}
