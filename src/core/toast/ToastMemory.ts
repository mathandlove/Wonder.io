/**
 * ToastMemory - Tracks which first-time toasts have been shown
 *
 * This module provides a simple way to track which tutorial/instructional toasts
 * the user has already seen. It uses localStorage for persistence across sessions.
 *
 * Toast keys follow a hierarchical naming convention:
 * - input:first - First time seeing input phase
 * - input:ask-recording - First time recording a question
 * - input:post-ai - After seeing first AI response (ask again + answer available)
 * - input:hint - After getting answer wrong (hint button explanation)
 * - answer:recording - First time recording an answer
 * - clue-image:discovery - First time on clue image scene
 * - clue-selection:ask - First time selecting clue for asking
 * - clue-selection:answer - First time selecting clue for answering
 */

const STORAGE_KEY = 'wonder-io-toast-memory';

/**
 * DEBUG FLAG: Force all toasts to show every time
 * Set to true to bypass toast memory and show all guidance toasts repeatedly
 * Useful for testing/debugging toast appearance and behavior
 * NOTE: Always forced to false in production builds
 */
const DEBUG_SHOW_ALL_TOASTS = import.meta.env.PROD ? false : true;

// All possible toast keys - add new ones here as needed
export type ToastKey =
  | 'input:first'           // "Your turn. What should Leo ask?"
  | 'input:ask-recording'   // "Ask a question out loud. Push stop when done."
  | 'input:post-ai'         // Multiple: "Ask as many questions..." + "When you think you know..."
  | 'input:hint'            // "This button will give you an idea..."
  | 'answer:recording'      // "Tell the answer then click stop."
  | 'clue-image:discovery'  // "Click on the clues hidden in the picture."
  | 'clue-selection:ask'    // "Click on the clue that you want to learn more about."
  | 'clue-selection:answer' // "Only some of the clues lead to the right answer..."
  ;

// Toast content configuration
export interface ToastConfig {
  key: ToastKey;
  message: string;
  pointsTo?: 'ask' | 'answer' | 'hint' | 'record' | 'center' | 'clue-grid';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// All toast definitions in one place for easy updates
export const TOAST_DEFINITIONS: Record<ToastKey, ToastConfig | ToastConfig[]> = {
  'input:first': {
    key: 'input:first',
    message: "Let's ask the baker \"What's wrong?\"",
    pointsTo: 'ask',
    position: 'top'
  },
  'input:ask-recording': {
    key: 'input:ask-recording',
    message: "Say out loud, \"What is wrong?\" then click STOP.",
    pointsTo: 'record',
    position: 'top'
  },
  'input:post-ai': {
    key: 'input:post-ai',
    message: "Now we know enough to answer the question!",
    pointsTo: 'answer',
    position: 'top'
  },
  'input:hint': {
    key: 'input:hint',
    message: "This button will give you an idea for what to ask Leo.",
    pointsTo: 'hint',
    position: 'top'
  },
  'answer:recording': {
    key: 'answer:recording',
    message: "Say out loud, \"Your cookie has been stolen!\" then click STOP.",
    pointsTo: 'record',
    position: 'top'
  },
  'clue-image:discovery': {
    key: 'clue-image:discovery',
    message: "Click on the 4 clues hidden in the picture.",
    pointsTo: 'center',
    position: 'bottom'
  },
  'clue-selection:ask': {
    key: 'clue-selection:ask',
    message: "Click on the clue that you want to learn more about.",
    pointsTo: 'clue-grid',
    position: 'top'
  },
  'clue-selection:answer': {
    key: 'clue-selection:answer',
    message: "Only some of the clues lead to the right answer. Select carefully.",
    pointsTo: 'clue-grid',
    position: 'top'
  }
};

// In-memory cache of shown toasts
let shownToasts: Set<ToastKey> = new Set();

// Load from localStorage on module init
function loadFromStorage(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ToastKey[];
      shownToasts = new Set(parsed);
    }
  } catch (e) {
    console.warn('[ToastMemory] Failed to load from localStorage:', e);
    shownToasts = new Set();
  }
}

// Save to localStorage
function saveToStorage(): void {
  try {
    const toArray = Array.from(shownToasts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toArray));
  } catch (e) {
    console.warn('[ToastMemory] Failed to save to localStorage:', e);
  }
}

// Initialize on module load
// In debug mode, clear memory at the start of each session so toasts show again
if (DEBUG_SHOW_ALL_TOASTS) {
  localStorage.removeItem(STORAGE_KEY);
  shownToasts = new Set();
} else {
  loadFromStorage();
}

/**
 * Check if a toast has been shown before
 */
export function hasShown(key: ToastKey): boolean {
  return shownToasts.has(key);
}

/**
 * Mark a toast as shown (won't show again)
 */
export function markShown(key: ToastKey): void {
  if (!shownToasts.has(key)) {
    shownToasts.add(key);
    saveToStorage();
    console.log('[ToastMemory] Marked as shown:', key);
  }
}

/**
 * Check if toast should show (not shown before) and mark it as shown
 * Returns true if toast should display, false if already shown
 */
export function shouldShowAndMark(key: ToastKey): boolean {
  if (shownToasts.has(key)) {
    return false;
  }
  markShown(key);
  return true;
}

/**
 * Get the toast config(s) for a key
 */
export function getToastConfig(key: ToastKey): ToastConfig | ToastConfig[] | undefined {
  return TOAST_DEFINITIONS[key];
}

/**
 * Reset all toast memory (useful for testing/demo mode)
 */
export function resetAllToasts(): void {
  shownToasts.clear();
  localStorage.removeItem(STORAGE_KEY);
  console.log('[ToastMemory] All toasts reset');
}

/**
 * Reset a specific toast (useful for testing)
 */
export function resetToast(key: ToastKey): void {
  shownToasts.delete(key);
  saveToStorage();
  console.log('[ToastMemory] Reset toast:', key);
}

/**
 * Get all shown toast keys (useful for debugging)
 */
export function getShownToasts(): ToastKey[] {
  return Array.from(shownToasts);
}
