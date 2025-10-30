/**
 * Navigation Command Queue
 *
 * Ensures graph mutations happen sequentially with concurrency=1.
 * This is the only place in the app that calls graph mutators.
 *
 * The queue runner is started once at app bootstrap and runs continuously,
 * processing commands in FIFO order with no parallelism.
 *
 * @module navigationQueue
 */

import type { NavigationCommand } from '../machine/types';
import { logCommand } from '../devtools/navigationLogger';

/**
 * Internal queue state
 */
const queue: NavigationCommand[] = [];
let isProcessing = false;
let isStarted = false;

/**
 * Command executor function - will be set when graph mutators are integrated
 * For now, this is a no-op that just logs commands
 */
let executor: ((command: NavigationCommand) => void) = (command) => {
  console.log('[NavigationQueue] Processing command:', command.type);
  // TODO: In Ticket 8, this will call actual graph mutators
};

/**
 * Set the executor function that processes commands
 *
 * This will be called once during initialization to wire up the graph mutators
 *
 * @param fn - Function that executes a command synchronously
 */
export function setExecutor(fn: (command: NavigationCommand) => void): void {
  executor = fn;
}

/**
 * Add a command to the queue
 *
 * Commands are processed in FIFO order with guaranteed concurrency=1
 *
 * @param command - The command to enqueue
 */
export function enqueue(command: NavigationCommand): void {
  if (!isStarted) {
    console.warn('[NavigationQueue] Queue not started yet, command will be queued but not processed');
  }

  // Log the command
  logCommand(command);

  queue.push(command);

  // If not currently processing, kick off processing
  if (!isProcessing) {
    processQueue();
  }
}

/**
 * Process commands from the queue one at a time
 *
 * Executes synchronously to ensure commands complete before XState transitions
 */
function processQueue(): void {
  if (isProcessing) {
    return; // Already processing
  }

  isProcessing = true;

  while (queue.length > 0) {
    const command = queue.shift();
    if (!command) continue;

    try {
      executor(command);
    } catch (error) {
      console.error('[NavigationQueue] Error executing command:', command.type, error);
      // Continue processing next command even if one fails
    }
  }

  isProcessing = false;
}

/**
 * Start the queue processing system
 *
 * Call this once at app initialization
 */
export function start(): void {
  if (isStarted) {
    console.warn('[NavigationQueue] Queue already started');
    return;
  }

  isStarted = true;
  console.log('[NavigationQueue] Queue processing started');

  // If there are any commands that were enqueued before start, process them
  if (queue.length > 0 && !isProcessing) {
    processQueue();
  }
}

/**
 * Get queue statistics (for debugging/devtools)
 */
export function getStats(): { queueLength: number; isProcessing: boolean; isStarted: boolean } {
  return {
    queueLength: queue.length,
    isProcessing,
    isStarted,
  };
}
