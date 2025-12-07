/**
 * Navigation Development Tools
 *
 * Logging and debugging utilities for the navigation system.
 * Toggle with environment flags for production vs development.
 *
 * Tracks the last N items of:
 * - Events received by the machine
 * - Actions emitted by the machine
 * - Commands enqueued for execution
 *
 * @module navigationLogger
 */

import type { NavigationEvent, NavigationAction, NavigationCommand } from '../machine/types';

/**
 * Configuration
 */
const MAX_LOG_ENTRIES = 50;
const ENABLE_LOGGING = import.meta.env.DEV || import.meta.env.VITE_NAVIGATION_DEBUG === 'true';

/**
 * Log storage
 */
const eventLog: Array<{ timestamp: string; event: NavigationEvent }> = [];
const actionLog: Array<{ timestamp: string; action: NavigationAction }> = [];
const commandLog: Array<{ timestamp: string; command: NavigationCommand }> = [];

/**
 * Helper to add an entry to a log with max size constraint
 */
function addToLog<T>(log: Array<{ timestamp: string } & T>, entry: T): void {
  log.push({
    timestamp: new Date().toISOString(),
    ...entry,
  });

  // Keep only last N entries
  if (log.length > MAX_LOG_ENTRIES) {
    log.shift();
  }
}

/**
 * Log a navigation event
 *
 * @param event - The event to log
 */
export function logEvent(event: NavigationEvent): void {
  if (!ENABLE_LOGGING) return;

  addToLog(eventLog, { event });

  console.log(
    `%c[NavEvent] ${event.type}`,
    'color: #4CAF50; font-weight: bold',
    event
  );
}

/**
 * Log a navigation action intent
 *
 * @param action - The action to log
 */
export function logAction(action: NavigationAction): void {
  if (!ENABLE_LOGGING) return;

  addToLog(actionLog, { action });

  console.log(
    `%c[NavAction] ${action.type}`,
    'color: #2196F3; font-weight: bold',
    action
  );
}

/**
 * Log a navigation command
 *
 * @param command - The command to log
 */
export function logCommand(command: NavigationCommand): void {
  if (!ENABLE_LOGGING) return;

  addToLog(commandLog, { command });

  console.log(
    `%c[NavCommand] ${command.type}`,
    'color: #FF9800; font-weight: bold',
    command
  );
}

/**
 * Get recent log entries for debugging
 *
 * @returns Object containing recent events, actions, and commands
 */
export function getRecentLogs(): {
  events: Array<{ timestamp: string; event: NavigationEvent }>;
  actions: Array<{ timestamp: string; action: NavigationAction }>;
  commands: Array<{ timestamp: string; command: NavigationCommand }>;
} {
  return {
    events: [...eventLog],
    actions: [...actionLog],
    commands: [...commandLog],
  };
}

/**
 * Print a summary of recent navigation activity
 */
export function printLogSummary(): void {
  console.group('📊 Navigation Log Summary');
  console.log(`Events: ${eventLog.length} (last ${MAX_LOG_ENTRIES})`);
  console.log(`Actions: ${actionLog.length} (last ${MAX_LOG_ENTRIES})`);
  console.log(`Commands: ${commandLog.length} (last ${MAX_LOG_ENTRIES})`);
  console.groupEnd();

  if (eventLog.length > 0) {
    console.group('Recent Events');
    eventLog.slice(-10).forEach((entry) => {
      console.log(`[${entry.timestamp}] ${entry.event.type}`);
    });
    console.groupEnd();
  }
}

/**
 * Clear all logs
 */
export function clearLogs(): void {
  eventLog.length = 0;
  actionLog.length = 0;
  commandLog.length = 0;
  console.log('[NavigationLogger] Logs cleared');
}

// Create logger object for type and window exposure
const navigationLogger = {
  getRecentLogs,
  printLogSummary,
  clearLogs,
};

// Expose logger functions on window for debugging
if (typeof window !== 'undefined' && ENABLE_LOGGING) {
  (window as Window & { __navigationLogger?: typeof navigationLogger }).__navigationLogger = navigationLogger;
}
