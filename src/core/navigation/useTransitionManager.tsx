/**
 * useTransitionManager - Centralized transition state management
 *
 * This hook manages the separation between visual and logical layers:
 * - Visual layer: Frozen TransitionSnapshot for animations
 * - Logical layer: Live navigationArray for scene graph management
 *
 * Core Responsibilities:
 * 1. Capture character snapshots at navigation start (BEFORE mutations)
 * 2. Maintain activeTransition state for animation components
 * 3. Emit lifecycle events (begin, complete, cancel)
 * 4. Handle transition interruption (rapid navigation)
 *
 * The frozen snapshot becomes the single source of truth during transitions.
 */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ulid } from 'ulid';
import type {
  TransitionSnapshot,
  CharacterSnapshot,
  CharacterPanelData,
  TransitionEventType,
  TransitionEventListener,
} from './transitionTypes';
import type { NavigationItem } from './types';

const TRANSITION_DURATION_MS = 2000;

interface TransitionManagerContextType {
  activeTransition: TransitionSnapshot | null;
  beginTransition: (
    fromIndex: number,
    toIndex: number,
    direction: 'forward' | 'backward',
    navigationArray: NavigationItem[]
  ) => string;
  onTransitionComplete: (transitionId: string) => void;
  addEventListener: (eventType: TransitionEventType, listener: TransitionEventListener) => void;
  removeEventListener: (eventType: TransitionEventType, listener: TransitionEventListener) => void;
}

const TransitionManagerContext = createContext<TransitionManagerContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useTransitionManager(): TransitionManagerContextType {
  const context = useContext(TransitionManagerContext);
  if (!context) {
    throw new Error('useTransitionManager must be used within TransitionManagerProvider');
  }
  return context;
}

interface TransitionManagerProviderProps {
  children: React.ReactNode;
}

export function TransitionManagerProvider({ children }: TransitionManagerProviderProps) {
  const [activeTransition, setActiveTransition] = useState<TransitionSnapshot | null>(null);
  const activeTransitionRef = useRef<TransitionSnapshot | null>(null);
  const eventListenersRef = useRef<Record<TransitionEventType, TransitionEventListener[]>>({
    'transition-begin': [],
    'transition-complete': [],
    'transition-cancel': [],
  });

  // Sync ref with state
  React.useEffect(() => {
    activeTransitionRef.current = activeTransition;
  }, [activeTransition]);

  /**
   * Extract character data from a navigation item
   * Returns frozen snapshot of character state at this point in time
   */
  const extractCharacterSnapshot = useCallback(
    (navItem: NavigationItem | undefined, navigationArray: NavigationItem[], itemIndex: number): CharacterSnapshot => {
      if (!navItem) {
        // Fallback for invalid index
        return {
          left: {
            character: 'NOCHARACTER',
            previousCharacter: 'NOCHARACTER',
            nextCharacter: 'NOCHARACTER',
            pose: null,
          },
          right: {
            character: 'NOCHARACTER',
            previousCharacter: 'NOCHARACTER',
            nextCharacter: 'NOCHARACTER',
            pose: null,
          },
          speaker: null,
          sceneId: '',
          navigationIndex: itemIndex,
        };
      }

      // Helper to extract character from a navigation item
      const getChar = (item: NavigationItem | undefined, side: 'left' | 'right'): string => {
        if (!item) return 'NOCHARACTER';
        const key = side === 'left' ? 'left-character' : 'right-character';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (item.scene as any)?.[key] || 'NOCHARACTER';
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getPose = (item: NavigationItem | undefined, side: 'left' | 'right'): string | null => {
        if (!item) return null;
        const metaKey = side === 'left' ? 'panelLeft' : 'panelRight';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (item.scene as any)?.meta?.[metaKey]?.pose || null;
      };

      const previousNavItem = navigationArray[itemIndex - 1];
      const nextNavItem = navigationArray[itemIndex + 1];

      const leftChar = getChar(navItem, 'left');
      const rightChar = getChar(navItem, 'right');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const speaker = (navItem.scene as any)?.speaker || null;

      const leftPanel: CharacterPanelData = {
        character: leftChar,
        previousCharacter: getChar(previousNavItem, 'left'),
        nextCharacter: getChar(nextNavItem, 'left'),
        pose: getPose(navItem, 'left'),
      };

      const rightPanel: CharacterPanelData = {
        character: rightChar,
        previousCharacter: getChar(previousNavItem, 'right'),
        nextCharacter: getChar(nextNavItem, 'right'),
        pose: getPose(navItem, 'right'),
      };

      return {
        left: leftPanel,
        right: rightPanel,
        speaker,
        sceneId: navItem.sceneId,
        navigationIndex: itemIndex,
      };
    },
    []
  );

  /**
   * Begin a new transition - capture snapshot BEFORE any navigation mutations
   *
   * This must be called synchronously at the start of navigation, before:
   * - Scene deletions
   * - Navigation rewiring
   * - navigationIndex updates
   *
   * Creates a fresh snapshot for each transition with a unique ID.
   *
   * Returns the unique transition ID for tracking
   */
  const beginTransition = useCallback(
    (
      fromIndex: number,
      toIndex: number,
      direction: 'forward' | 'backward',
      navigationArray: NavigationItem[]
    ): string => {
      // Cancel existing transition if one is active
      if (activeTransitionRef.current) {
        console.log('[TransitionManager] 🔄 Canceling previous transition:', activeTransitionRef.current.id);
        const oldTransition = activeTransitionRef.current;

        // Fire cancel event
        eventListenersRef.current['transition-cancel'].forEach(listener => {
          listener(oldTransition);
        });
      }

      // Create new transition snapshot
      const transitionId = ulid();
      const fromItem = navigationArray[fromIndex];
      const toItem = navigationArray[toIndex];

      if (!fromItem || !toItem) {
        console.warn('[TransitionManager] ⚠️  Invalid transition indices:', { fromIndex, toIndex });
        // Return a no-op transition ID
        return transitionId;
      }

      const fromSnapshot = extractCharacterSnapshot(fromItem, navigationArray, fromIndex);
      const toSnapshot = extractCharacterSnapshot(toItem, navigationArray, toIndex);

      // Override previousCharacter in toSnapshot to be the fromSnapshot character
      // This ensures entrance animations trigger correctly (previousCharacter !== characterName)
      const adjustedToSnapshot: CharacterSnapshot = {
        ...toSnapshot,
        transitionId: transitionId, // Store transition ID for animation triggering
        left: {
          ...toSnapshot.left,
          previousCharacter: fromSnapshot.left.character, // Use "from" as "previous"
        },
        right: {
          ...toSnapshot.right,
          previousCharacter: fromSnapshot.right.character, // Use "from" as "previous"
        },
      };

      const snapshot: TransitionSnapshot = {
        id: transitionId,
        fromIndex,
        toIndex,
        fromSceneId: fromItem.sceneId,
        toSceneId: toItem.sceneId,
        fromCharacters: fromSnapshot,
        toCharacters: adjustedToSnapshot, // Use adjusted snapshot with correct previousCharacter
        startedAt: performance.now(),
        durationMs: TRANSITION_DURATION_MS,
        direction,
      };

      console.log('[TransitionManager] 🎬 Begin transition:', {
        id: transitionId,
        from: fromItem.sceneId,
        to: toItem.sceneId,
        direction,
        leftTransition: `${fromSnapshot.left.character} → ${adjustedToSnapshot.left.character}`,
        rightTransition: `${fromSnapshot.right.character} → ${adjustedToSnapshot.right.character}`,
        toSnapshot: {
          leftPrev: adjustedToSnapshot.left.previousCharacter,
          leftCurrent: adjustedToSnapshot.left.character,
          rightPrev: adjustedToSnapshot.right.previousCharacter,
          rightCurrent: adjustedToSnapshot.right.character,
        }
      });

      // Update state and ref synchronously
      setActiveTransition(snapshot);
      activeTransitionRef.current = snapshot;

      // Fire begin event
      eventListenersRef.current['transition-begin'].forEach(listener => {
        listener(snapshot);
      });

      return transitionId;
    },
    [extractCharacterSnapshot]
  );

  /**
   * Complete a transition - clears the active snapshot
   * Called either by timeout or manual completion
   */
  const onTransitionComplete = useCallback((transitionId: string) => {
    const current = activeTransitionRef.current;

    if (!current) {
      console.log('[TransitionManager] ℹ️  Complete called but no active transition');
      return;
    }

    if (current.id !== transitionId) {
      console.log('[TransitionManager] ⚠️  Complete called for non-active transition:', {
        requested: transitionId,
        active: current.id,
      });
      return;
    }

    console.log('[TransitionManager] ✅ Transition complete:', transitionId);

    // Fire complete event before clearing
    eventListenersRef.current['transition-complete'].forEach(listener => {
      listener(current);
    });

    // Clear active transition
    setActiveTransition(null);
    activeTransitionRef.current = null;
  }, []);

  /**
   * Add event listener for transition lifecycle events
   */
  const addEventListener = useCallback((eventType: TransitionEventType, listener: TransitionEventListener) => {
    console.log('[TransitionManager] 📡 Adding event listener:', eventType);
    eventListenersRef.current[eventType].push(listener);
  }, []);

  /**
   * Remove event listener
   */
  const removeEventListener = useCallback((eventType: TransitionEventType, listener: TransitionEventListener) => {
    console.log('[TransitionManager] 🔌 Removing event listener:', eventType);
    eventListenersRef.current[eventType] = eventListenersRef.current[eventType].filter(l => l !== listener);
  }, []);

  const contextValue = useMemo(
    (): TransitionManagerContextType => ({
      activeTransition,
      beginTransition,
      onTransitionComplete,
      addEventListener,
      removeEventListener,
    }),
    [activeTransition, beginTransition, onTransitionComplete, addEventListener, removeEventListener]
  );

  return (
    <TransitionManagerContext.Provider value={contextValue}>
      {children}
    </TransitionManagerContext.Provider>
  );
}
