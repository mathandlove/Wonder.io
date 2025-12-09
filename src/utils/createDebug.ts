/**
 * Debug Utility - Feature-Flag Based Logging
 *
 * Provides namespace-based debug logging with runtime toggleable flags.
 * Built on the `debug` npm package for zero-config localStorage persistence.
 *
 * ## Usage in Code
 *
 * ```typescript
 * import { createDebugger } from '@/utils/createDebug';
 *
 * const debug = createDebugger('navigation:machine');
 *
 * debug.log('State transition:', state);
 * debug.event('📤', 'Emitting event:', event);
 * debug.error('Failed to process:', error);
 * debug.group('Complex operation', () => {
 *   console.log('Step 1');
 *   console.log('Step 2');
 * });
 * ```
 *
 * ## Controlling Debug Output (Browser DevTools Console)
 *
 * ```javascript
 * // Enable all Wonder.io debug logs
 * localStorage.debug = 'wonder:*'
 *
 * // Enable specific namespaces
 * localStorage.debug = 'wonder:navigation:*,wonder:ai:*'
 *
 * // Enable all except recording transcripts (noisy)
 * localStorage.debug = 'wonder:*,-wonder:recording:transcripts'
 *
 * // Disable all
 * localStorage.debug = ''
 *
 * // Then refresh the page
 * ```
 *
 * ## Available Namespaces
 *
 * - `wonder:navigation:machine` - XState machine state transitions
 * - `wonder:navigation:store` - Zustand store updates
 * - `wonder:navigation:graph` - Graph operations (insert, delete, navigate)
 * - `wonder:navigation:events` - Event bus emissions
 * - `wonder:navigation:queue` - Command queue processing
 * - `wonder:ai:orchestrator` - AI request orchestration
 * - `wonder:ai:service` - AI service calls and responses
 * - `wonder:ai:validation` - Answer validation logic
 * - `wonder:recording:orchestrator` - Recording flow orchestration
 * - `wonder:recording:api` - Recording API lifecycle
 * - `wonder:recording:transcripts` - Real-time transcript updates (noisy!)
 * - `wonder:scenes:renderer` - Scene rendering lifecycle
 * - `wonder:scenes:dialogue` - Dialogue scene machine
 * - `wonder:scenes:dance` - Success/fail dance scenes
 * - `wonder:dialogue:chatflow` - Chat flow orchestration
 * - `wonder:characters` - Character panel and animations
 * - `wonder:background` - Background orchestration
 *
 * @module createDebug
 */

import debug from 'debug';

/**
 * Base namespace for all Wonder.io debug logs
 */
const BASE_NAMESPACE = 'wonder';

/**
 * Debug instance with enhanced helpers for common logging patterns
 */
export interface WonderDebugger {
  /**
   * Standard debug logging - controlled by namespace enable/disable
   */
  log: debug.Debugger;

  /**
   * Always logs errors regardless of namespace settings
   */
  error: (...args: any[]) => void;

  /**
   * Log with emoji prefix for visual scanning
   * @param emoji - Emoji prefix (e.g., '📤', '🎯', '✅')
   * @param args - Additional arguments to log
   */
  event: (emoji: string, ...args: any[]) => void;

  /**
   * Group logging for complex operations (only if namespace enabled)
   * @param label - Group label
   * @param fn - Function containing grouped console.logs
   */
  group: (label: string, fn: () => void) => void;

  /**
   * Check if this debugger is currently enabled
   */
  enabled: boolean;
}

/**
 * Create a namespaced debugger with Wonder-specific helpers
 *
 * @param namespace - The debug namespace (will be prefixed with 'wonder:')
 * @returns WonderDebugger instance with helper methods
 *
 * @example
 * ```typescript
 * const debug = createDebugger('navigation:machine');
 * debug.log('State changed:', newState);
 * debug.event('📤', 'Event emitted:', event);
 * debug.error('Critical error:', error);
 * ```
 */
export function createDebugger(namespace: string): WonderDebugger {
  const fullNamespace = `${BASE_NAMESPACE}:${namespace}`;
  const log = debug(fullNamespace);
  const errorLog = debug(`${fullNamespace}:error`);

  // Always enable error logs in development
  if (import.meta.env.DEV) {
    errorLog.enabled = true;
  }

  return {
    log,

    error: (...args: any[]) => {
      // Always log errors to console.error for visibility
      console.error(`[${fullNamespace}]`, ...args);
      errorLog(...args);
    },

    event: (emoji: string, ...args: any[]) => {
      log(emoji, ...args);
    },

    group: (label: string, fn: () => void) => {
      if (!log.enabled) return;
      console.group(`[${fullNamespace}] ${label}`);
      fn();
      console.groupEnd();
    },

    get enabled() {
      return log.enabled;
    },
  };
}

/**
 * Utility functions for managing debug flags at runtime
 * Exposed on window in development mode for easy DevTools access
 */
export const debugUtils = {
  /**
   * Enable a debug namespace
   * @param pattern - Namespace pattern (e.g., 'wonder:*', 'wonder:navigation:*')
   */
  enable(pattern: string) {
    const current = localStorage.getItem('debug') || '';
    const patterns = current ? current.split(',') : [];
    if (!patterns.includes(pattern)) {
      patterns.push(pattern);
      localStorage.setItem('debug', patterns.join(','));
      console.log(`✅ Debug enabled: ${pattern}`);
      console.log('🔄 Refresh the page to apply changes');
    } else {
      console.log(`ℹ️  Already enabled: ${pattern}`);
    }
  },

  /**
   * Disable a debug namespace
   * @param pattern - Namespace pattern to disable
   */
  disable(pattern: string) {
    const current = localStorage.getItem('debug') || '';
    const patterns = current.split(',').filter((p) => p.trim() !== pattern);
    localStorage.setItem('debug', patterns.join(','));
    console.log(`❌ Debug disabled: ${pattern}`);
    console.log('🔄 Refresh the page to apply changes');
  },

  /**
   * Show current debug configuration
   */
  show() {
    const current = localStorage.getItem('debug') || '(none)';
    console.log('🐛 Current debug namespaces:', current);
    console.log('\n📚 Available namespaces:');
    console.log('  wonder:navigation:*  - All navigation logs');
    console.log('  wonder:ai:*          - All AI logs');
    console.log('  wonder:recording:*   - All recording logs');
    console.log('  wonder:scenes:*      - All scene logs');
    console.log('  wonder:*             - All Wonder.io logs');
    console.log('\n🎯 Quick presets:');
    console.log('  __debug.enableAll()      - Show all Wonder.io logs');
    console.log('  __debug.recommended()    - Balanced (hide noisy logs)');
    console.log('  __debug.xstateOnly()     - Only XState machine changes');
    console.log('  __debug.recordingOnly()  - Only recording logic (hide navigation)');
    console.log('  __debug.disableAll()     - Hide all logs');
  },

  /**
   * Enable all Wonder.io debug logs
   */
  enableAll() {
    localStorage.setItem('debug', 'wonder:*');
    console.log('✅ All Wonder.io debug logs enabled');
    console.log('🔄 Refresh the page to apply changes');
  },

  /**
   * Disable all debug logs
   */
  disableAll() {
    localStorage.removeItem('debug');
    console.log('❌ All debug logs disabled');
    console.log('🔄 Refresh the page to apply changes');
  },

  /**
   * Reset to recommended defaults (high-signal, low-noise)
   */
  recommended() {
    const recommended = 'wonder:*,-wonder:recording:transcripts,-wonder:scenes:renderer';
    localStorage.setItem('debug', recommended);
    console.log('✅ Debug set to recommended defaults:');
    console.log('   ✓ All Wonder.io logs');
    console.log('   ✗ Recording transcripts (too noisy)');
    console.log('   ✗ Scene renderer (too noisy)');
    console.log('🔄 Refresh the page to apply changes');
  },

  /**
   * Show only XState machine state transitions and changes
   */
  xstateOnly() {
    const xstatePattern = 'wonder:navigation:machine,wonder:scenes:dialogue,wonder:ai:*';
    localStorage.setItem('debug', xstatePattern);
    console.log('✅ Debug set to XState-only mode:');
    console.log('   ✓ Navigation machine state transitions');
    console.log('   ✓ Dialogue scene machine events');
    console.log('   ✓ AI service and validation logs');
    console.log('   ✗ All other debug logs (recording, store, graph, etc.)');
    console.log('🔄 Refresh the page to apply changes');
  },

  /**
   * Show only recording logs (hide navigation state changes)
   */
  recordingOnly() {
    const recordingPattern = 'wonder:recording:*,-wonder:navigation:*';
    localStorage.setItem('debug', recordingPattern);
    console.log('✅ Debug set to Recording-only mode:');
    console.log('   ✓ Recording orchestrator');
    console.log('   ✓ Recording transcripts');
    console.log('   ✓ Recording API lifecycle');
    console.log('   ✗ Navigation state changes (machine, store, graph, events, queue)');
    console.log('🔄 Refresh the page to apply changes');
  },
};

/**
 * Auto-initialize debug configuration on first load
 * Set your preferred default here - options:
 * - 'xstate' - Only XState machine changes (cleanest for development)
 * - 'recommended' - Balanced logging (all except noisy logs)
 * - 'all' - Everything
 * - 'none' - Nothing (you'll use __debug commands manually)
 */
const DEFAULT_DEBUG_MODE: 'xstate' | 'recommended' | 'all' | 'none' = 'all';

/**
 * Expose debug utilities on window in development for easy DevTools access
 *
 * Usage in browser console:
 * ```javascript
 * __debug.show()           // Show current config
 * __debug.enableAll()      // Enable all logs
 * __debug.recommended()    // Use recommended settings
 * __debug.xstateOnly()     // Show only XState machine changes
 * ```
 */
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // Auto-initialize if no debug config exists
  const currentDebug = localStorage.getItem('debug');
  if (!currentDebug) {
    const modeMap = {
      xstate: 'wonder:navigation:machine,wonder:scenes:dialogue,wonder:ai:*',
      recommended: 'wonder:*,-wonder:recording:transcripts,-wonder:scenes:renderer',
      all: 'wonder:*',
      none: null,
    };
    const pattern = modeMap[DEFAULT_DEBUG_MODE];
    if (pattern) {
      localStorage.setItem('debug', pattern);
      console.log(`🐛 Debug auto-initialized to '${DEFAULT_DEBUG_MODE}' mode`);
      console.log(`   Pattern: ${pattern}`);
    }
  }

  (window as Window & { __debug?: typeof debugUtils }).__debug = debugUtils;
  console.log('🐛 Debug utilities available: __debug.show()');
}
