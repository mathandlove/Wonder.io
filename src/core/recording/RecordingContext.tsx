import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from "react";
import { Recording } from "./RecordingAPI";
import { useSTT } from "./hooks/useSTT";

// ──────────────────────────────────────────────────────────────────────────────
// Feature Flags
// ──────────────────────────────────────────────────────────────────────────────

// Backend STT mode: Uses GPT-4o Transcribe via WebSocket proxy for high accuracy

// Recording state
export interface RecordingState {
  isRecording: boolean;
  sessionId: string | null;
  accumulatedText: string; // Final accurate text from backend (triggers state changes)
  displayText: string; // What should be shown in bubbles (final transcript from backend)
  isSupported: boolean;
}

// Recording events
type RecordingEvent =
  | { type: 'START'; sessionId: string }
  | { type: 'STOP' }
  | { type: 'ABORT' }
  | { type: 'ACCUMULATE'; finalText: string } // Backend final transcript
  | { type: 'UNSUPPORTED' };

const initialState: RecordingState = {
  isRecording: false,
  sessionId: null,
  accumulatedText: '',
  displayText: '',
  isSupported: true
};

function recordingReducer(state: RecordingState, action: RecordingEvent): RecordingState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        isRecording: true,
        sessionId: action.sessionId,
        accumulatedText: '',
        displayText: ''
      };
    case 'STOP':
    case 'ABORT':
      // Preserve accumulatedText and displayText - backend final transcript will update them
      return {
        ...state,
        isRecording: false,
        sessionId: null
      };
    case 'ACCUMULATE': {
      // Backend sends complete, accurate final transcript
      const trimmedFinal = action.finalText.trim();

      console.log('[RecordingReducer] ACCUMULATE:', { finalText: trimmedFinal });

      if (!trimmedFinal) {
        console.log('[RecordingReducer] Empty final text, ignoring');
        return state;
      }

      return {
        ...state,
        accumulatedText: trimmedFinal,
        displayText: trimmedFinal
      };
    }
    case 'UNSUPPORTED':
      return {
        ...state,
        isSupported: false,
        isRecording: false
      };
    default:
      return state;
  }
}

interface RecordingContextValue {
  state: RecordingState;
  start: () => void;
  stop: () => void;
  abort: () => void;
  getDisplayText: () => string;
  isRecording: () => boolean;
  setOnFinalized: (callback: (() => void) | null) => void; // Register callback for when transcripts are finalized
  setOnAutoStop: (callback: (() => void) | null) => void; // Register callback for when auto-stop timeout fires
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onStateChange?: (state: RecordingState) => void;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(recordingReducer, initialState);

  // Store state in a ref so getDisplayText always reads the latest value
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Track finalization callback - parent can register to know when all transcripts are done
  const onFinalizedCallbackRef = React.useRef<(() => void) | null>(null);

  // Track auto-stop callback - parent can register to know when auto-stop timeout fires
  const onAutoStopCallbackRef = React.useRef<(() => void) | null>(null);

  // STT backend hook with callbacks (only used if USE_STT_BACKEND is true)
  const stt = useSTT({
    onFinal: (text: string) => {
      // Receive the complete, finalized transcript from backend after stop
      console.log('[RecordingContext] onFinal callback received:', text);
      dispatch({
        type: 'ACCUMULATE',
        finalText: text
      });
    },
    onFinalized: () => {
      // Called when backend sends 'close' signal (transcription complete)
      if (onFinalizedCallbackRef.current) {
        onFinalizedCallbackRef.current();
      }
    },
    onAutoStop: () => {
      if (onAutoStopCallbackRef.current) {
        onAutoStopCallbackRef.current();
      }
    },
    onError: () => {
      dispatch({ type: 'UNSUPPORTED' });
    },
  });

  const start = useCallback(() => {
    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    dispatch({ type: 'START', sessionId });

    // Start backend STT (GPT-4o Transcribe via WebSocket)
    console.log('[RecordingContext] Starting backend recording');
    stt.start().catch(() => {
      console.error('[RecordingContext] Backend STT failed to start');
      dispatch({ type: 'ABORT' });
    });
  }, [stt]);

  const stop = useCallback(() => {
    console.log('[RecordingContext] Stopping recording');

    // Stop backend WebSocket (will process and send final transcript)
    stt.stop();

    dispatch({ type: 'STOP' });
  }, [stt]);

  const abort = useCallback(() => {
    // Stop backend STT
    stt.stop();
    dispatch({ type: 'ABORT' });
  }, [stt]);

  // Setter for finalized callback
  const setOnFinalized = useCallback((callback: (() => void) | null) => {
    onFinalizedCallbackRef.current = callback;
  }, []);

  // Setter for auto-stop callback
  const setOnAutoStop = useCallback((callback: (() => void) | null) => {
    onAutoStopCallbackRef.current = callback;
  }, []);

  // Register with global Recording API
  useEffect(() => {
    Recording.register(start, stop, abort);
  }, [start, stop, abort]);

  const value: RecordingContextValue = {
    state,
    start,
    stop,
    abort,
    getDisplayText: () => {
      // Return from actual state, not ref, to avoid stale closure issues
      return state.displayText;
    },
    isRecording: () => stateRef.current.isRecording,
    setOnFinalized,
    setOnAutoStop
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within RecordingProvider');
  }
  return context;
}