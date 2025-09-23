/**
 * QuestManager - React Context + reducer implementation
 */
import { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type QuestPhase = 'idle' | 'offered' | 'minimized' | 'complete';

export interface Quest {
  id: string;
  title?: string;
  text?: string;
}

export interface QuestState {
  phase: QuestPhase;
  currentQuest?: Quest;
}

export type QuestAction =
  | { type: 'OFFER'; payload: { id: string; title?: string; text?: string } }
  | { type: 'ACCEPT' }
  | { type: 'COMPLETE' }
  | { type: 'RESET' };

export interface QuestProviderProps {
  children: ReactNode;
}

export interface QuestStatus {
  phase: QuestPhase;
  currentQuest?: Quest;
}

export interface QuestGates {
  canScroll: boolean;
  canAdvanceDialogue: boolean;
}

export interface QuestHook {
  state: QuestState;
  offer: (id: string | Quest, title?: string, text?: string) => void;
  accept: () => void;
  complete: () => void;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: QuestState = {
  phase: 'idle',
  currentQuest: undefined,
};

// ============================================================================
// Reducer
// ============================================================================

function questReducer(state: QuestState, action: QuestAction): QuestState {
  switch (action.type) {
    case 'OFFER':
      console.log('[QuestReducer] OFFER payload:', action.payload);

      // Ensure we don't nest objects
      const cleanPayload = {
        id: String(action.payload.id),
        title: typeof action.payload.title === 'string' ? action.payload.title : undefined,
        text: typeof action.payload.text === 'string' ? action.payload.text : undefined,
      };

      console.log('[QuestReducer] Clean payload:', cleanPayload);

      return {
        ...state,
        phase: 'offered',
        currentQuest: cleanPayload,
      };

    case 'ACCEPT':
      return {
        ...state,
        phase: 'minimized',
      };

    case 'COMPLETE':
      return {
        ...state,
        phase: 'complete',
      };

    case 'RESET':
      return {
        ...state,
        phase: 'idle',
        currentQuest: undefined,
      };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface QuestContextValue {
  state: QuestState;
  offer: (id: string | Quest, title?: string, text?: string) => void;
  accept: () => void;
  complete: () => void;
  reset: () => void;
}

const QuestContext = createContext<QuestContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function QuestProvider({ children }: QuestProviderProps) {
  const [state, dispatch] = useReducer(questReducer, initialState);

  // Debug logging
  useEffect(() => {
    console.log('[Quest] State changed:', state);
    console.debug('[Quest]', state);
  }, [state]);

  // Initial mount log and auto-create minimized quest for testing
  useEffect(() => {
    console.log('[Quest] QuestProvider mounted');

    // AUTO-CREATE MINIMIZED QUEST FOR TESTING
    // Comment out or remove this block in production
    const timer = setTimeout(() => {
      console.log('[Quest] Auto-creating minimized quest for testing');
      dispatch({
        type: 'OFFER',
        payload: {
          id: 'test-quest',
          title: 'Find the Lost Cookie',
          text: 'Help Betsy find her missing cookie'
        }
      });

      // Auto-accept after a short delay to show minimized state
      setTimeout(() => {
        console.log('[Quest] Auto-accepting quest to show minimized pill box');
        dispatch({ type: 'ACCEPT' });

        // Auto-complete after 3 seconds to test complete state
        setTimeout(() => {
          console.log('[Quest] Auto-completing quest to test complete state');
          dispatch({ type: 'COMPLETE' });
        }, 3000);
      }, 500);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Action creators
  const offer = useCallback((id: string | Quest, title?: string, text?: string) => {
    console.log('[Quest] Action: offer called with:', {
      id,
      title: title,
      titleType: typeof title,
      text: text,
      textType: typeof text
    });

    // Handle both calling patterns: offer(id, title, text) or offer(questObject)
    let cleanId: string;
    let cleanTitle: string | undefined;
    let cleanText: string | undefined;

    if (typeof id === 'object' && id !== null) {
      // Called with quest object: offer({id: 'demo', title: 'Find Cookie', text: 'Help Betsy...'})
      console.log('[Quest] Detected object parameter, extracting properties:', id);
      cleanId = String((id as Quest).id);
      cleanTitle = typeof (id as Quest).title === 'string' ? (id as Quest).title : undefined;
      cleanText = typeof (id as Quest).text === 'string' ? (id as Quest).text : undefined;
    } else {
      // Called with separate parameters: offer('demo', 'Find Cookie', 'Help Betsy...')
      cleanId = String(id);
      cleanTitle = typeof title === 'string' ? title : undefined;
      cleanText = typeof text === 'string' ? text : undefined;
    }

    console.log('[Quest] Clean parameters:', { cleanId, cleanTitle, cleanText });

    dispatch({ type: 'OFFER', payload: { id: cleanId, title: cleanTitle, text: cleanText } });
  }, []);

  const accept = useCallback(() => {
    console.log('[Quest] Action: accept');
    dispatch({ type: 'ACCEPT' });
  }, []);

  const complete = useCallback(() => {
    console.log('[Quest] Action: complete');
    dispatch({ type: 'COMPLETE' });
  }, []);

  const reset = useCallback(() => {
    console.log('[Quest] Action: reset');
    dispatch({ type: 'RESET' });
  }, []);

  const contextValue: QuestContextValue = useMemo(() => ({
    state,
    offer,
    accept,
    complete,
    reset,
  }), [state, offer, accept, complete, reset]);

  // Dev-only global helpers for quick console testing
  useEffect(() => {
    (window as any).__quest = {
      state,
      offer,
      accept,
      complete,
      reset,
    };
    return () => {
      if ((window as any).__quest) {
        delete (window as any).__quest;
      }
    };
  }, [state, offer, accept, complete, reset]);

  return (
    <QuestContext.Provider value={contextValue}>
      {children}
    </QuestContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

function useQuestContext(): QuestContextValue {
  const context = useContext(QuestContext);
  if (!context) {
    throw new Error('Quest hooks must be used within QuestProvider');
  }
  return context;
}

export function useQuest(): QuestHook {
  const { state, offer, accept, complete, reset } = useQuestContext();
  return { state, offer, accept, complete, reset };
}

export function useQuestStatus(): QuestStatus {
  const { state } = useQuestContext();
  return {
    phase: state.phase,
    currentQuest: state.currentQuest,
  };
}

export function useQuestGates(): QuestGates {
  const { state } = useQuestContext();

  return useMemo(() => ({
    canScroll: state.phase !== 'offered',
    canAdvanceDialogue: state.phase !== 'offered',
  }), [state.phase]);
}