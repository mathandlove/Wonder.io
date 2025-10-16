import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from "react";
import { Recording } from "./RecordingAPI";

// Recording state
export interface RecordingState {
  isRecording: boolean;
  sessionId: string | null;
  interimTranscript: string;
  finalTranscript: string;
  accumulatedText: string; // Global accumulated text across all speech results
  displayText: string; // What should be shown in bubbles (accumulated + current interim)
  isSupported: boolean;
  keepListening: boolean;
}

// Recording events
type RecordingEvent =
  | { type: 'START'; sessionId: string }
  | { type: 'STOP' }
  | { type: 'ABORT' }
  | { type: 'INTERIM'; text: string }
  | { type: 'FINAL'; text: string }
  | { type: 'ACCUMULATE'; finalText: string; interimText?: string }
  | { type: 'UNSUPPORTED' }
  | { type: 'SET_KEEP_LISTENING'; value: boolean };

const initialState: RecordingState = {
  isRecording: false,
  sessionId: null,
  interimTranscript: '',
  finalTranscript: '',
  accumulatedText: '',
  displayText: '',
  isSupported: true,
  keepListening: false
};

function recordingReducer(state: RecordingState, action: RecordingEvent): RecordingState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        isRecording: true,
        sessionId: action.sessionId,
        interimTranscript: '',
        finalTranscript: '',
        accumulatedText: '',
        displayText: '',
        keepListening: true
      };
    case 'STOP':
    case 'ABORT':
      return {
        ...state,
        isRecording: false,
        sessionId: null,
        interimTranscript: '',
        finalTranscript: '',
        accumulatedText: '',
        displayText: '',
        keepListening: false
      };
    case 'INTERIM':
      const interimDisplayText = state.accumulatedText + ' ' + action.text;
      return {
        ...state,
        interimTranscript: action.text,
        displayText: interimDisplayText
      };
    case 'FINAL':
      return {
        ...state,
        finalTranscript: action.text,
        interimTranscript: ''
      };
    case 'ACCUMULATE':
      const newAccumulated = (state.accumulatedText + ' ' + action.finalText).trim();
      const newDisplayText = action.interimText
        ? newAccumulated + ' ' + action.interimText
        : newAccumulated;
      return {
        ...state,
        accumulatedText: newAccumulated,
        displayText: newDisplayText.trim(),
        finalTranscript: action.finalText,
        interimTranscript: action.interimText || ''
      };
    case 'UNSUPPORTED':
      return {
        ...state,
        isSupported: false,
        isRecording: false
      };
    case 'SET_KEEP_LISTENING':
      return {
        ...state,
        keepListening: action.value
      };
    default:
      return state;
  }
}

// Browser detection utilities
const isChrome = () => {
  return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
};

const isSafari = () => {
  return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
};

const hasWebSpeechAPI = () => {
  return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
};

interface RecordingContextValue {
  state: RecordingState;
  start: () => void;
  stop: () => void;
  abort: () => void;
  getDisplayText: () => string;
  isRecording: () => boolean;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onStateChange?: (state: RecordingState) => void;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(recordingReducer, initialState);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  const createRecognition = useCallback((_sessionId: string) => {
    if (!hasWebSpeechAPI()) {
      dispatch({ type: 'UNSUPPORTED' });
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    const scheduleRestart = () => {
      restartTimeoutRef.current = setTimeout(() => {
        // Use a flag check instead of state to avoid circular dependency
        if (currentSessionIdRef.current && (isChrome() || /Edge/.test(navigator.userAgent))) {
          try {
            const newRecognition = createRecognition(currentSessionIdRef.current);
            if (newRecognition) {
              recognitionRef.current = newRecognition;
              newRecognition.start();
            }
          } catch (e) {
            // Silent fail for restart attempts
          }
        }
      }, 100);
    };

    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + ' ';
        } else {
          interimText += transcript;
        }
      }

      // Use ACCUMULATE to build up the global recording state
      if (finalText.trim()) {
        dispatch({
          type: 'ACCUMULATE',
          finalText: finalText.trim(),
          interimText: interimText
        });
      } else if (interimText) {
        dispatch({ type: 'INTERIM', text: interimText });
      }
    };

    recognition.onerror = (_event: any) => {
      // Auto-restart on Chrome/Edge after error
      if (isChrome() || /Edge/.test(navigator.userAgent)) {
        scheduleRestart();
      }
    };

    recognition.onend = () => {
      // Auto-restart on Chrome/Edge when recognition ends naturally
      if (isChrome() || /Edge/.test(navigator.userAgent)) {
        scheduleRestart();
      }
    };

    return recognition;
  }, []);

  const start = useCallback(() => {
    if (!hasWebSpeechAPI()) {
      dispatch({ type: 'UNSUPPORTED' });
      return;
    }

    if (isSafari()) {
      dispatch({ type: 'UNSUPPORTED' });
      return;
    }

    try {
      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      currentSessionIdRef.current = sessionId;

      dispatch({ type: 'START', sessionId });

      const recognition = createRecognition(sessionId);
      if (recognition) {
        recognitionRef.current = recognition;
        recognition.start();
      }
    } catch (error) {
      dispatch({ type: 'ABORT' });
    }
  }, [createRecognition]);

  const stop = useCallback(() => {
    dispatch({ type: 'SET_KEEP_LISTENING', value: false });

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Recording text is now managed entirely by scene state (RecordPanelOrchestrator)
    // No need to sync with DialogueContext anymore

    currentSessionIdRef.current = null;
    dispatch({ type: 'STOP' });
  }, []);

  const abort = useCallback(() => {
    dispatch({ type: 'SET_KEEP_LISTENING', value: false });

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    dispatch({ type: 'ABORT' });
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
    getDisplayText: () => state.displayText,
    isRecording: () => state.isRecording
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within RecordingProvider');
  }
  return context;
}