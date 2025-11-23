/**
 * RecordingOrchestrator - Clean speech-to-text recording implementation
 *
 * Responsibilities:
 * - Manage microphone recording lifecycle (start/stop)
 * - Handle audio transcription via OpenAI GPT-4o Transcribe
 * - Provide clean API for recording state and transcript
 * - Register recording control for navigation machine
 *
 * Flow:
 * 1. User calls start() → Microphone capture begins
 * 2. Audio streams to backend via WebSocket
 * 3. User calls stop() → Audio sent for transcription
 * 4. Backend returns final transcript
 * 5. onTranscript callback invoked with result
 */

import { useSTT } from './hooks/useSTT';
import type { UseSTTCallbacks } from './hooks/useSTT';
import { createDebugger } from '../../utils/createDebug';
import { useEffect, useState } from 'react';
import * as navigationBus from '../navigation/events/navigationBus';

const debug = createDebugger('recording:orchestrator');

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

/** Recording state machine */
export type RecordingState = 'idle' | 'recording' | 'processing' | 'error';

/** Callbacks for recording lifecycle events */
export type RecordingCallbacks = {
  /** Called when final transcript is ready */
  onTranscript?: (text: string) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
  /** Called when recording auto-stops due to silence */
  onAutoStop?: () => void;
};

/** Recording orchestrator interface */
export type RecordingOrchestrator = {
  /** Start recording audio */
  start: () => Promise<void>;
  /** Stop recording and request transcription */
  stop: () => void;
  /** Current recording state */
  state: RecordingState;
  /** Final transcript (after processing completes) */
  transcript: string;
  /** Partial transcript (during recording) */
  partial: string;
  /** Error message if state is 'error' */
  error: string;
  /** Current audio level (0-1) for visualization */
  audioLevel: number;
};

/** Control interface for navigation machine */
export type RecordingControl = {
  start: () => Promise<void>;
  stop: () => void;
  getAudioLevel: () => number;
};

// ──────────────────────────────────────────────────────────────────────────────
// Recording Control Registry
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Global registry for the active recording control.
 * Only one recording instance should be active at a time.
 */
class RecordingControlRegistry {
  private control: RecordingControl | null = null;

  register(control: RecordingControl) {
    if (this.control) {
      debug.error('⚠️  Multiple recording controls registered - replacing existing');
    }
    this.control = control;
    debug.log('✅ Recording control registered');
  }

  unregister() {
    this.control = null;
    debug.log('🗑️  Recording control unregistered');
  }

  getControl(): RecordingControl | null {
    return this.control;
  }
}

export const recordingRegistry = new RecordingControlRegistry();

// ──────────────────────────────────────────────────────────────────────────────
// API for Navigation Machine
// ──────────────────────────────────────────────────────────────────────────────

/**
 * API for navigation machine to control recording.
 * Uses the registry to find the active recording control.
 */
export const RecordingOrchestratorAPI = {
  startRecording: async () => {
    const control = recordingRegistry.getControl();
    if (control) {
      debug.log('🎙️ Starting recording via API');
      await control.start();
    } else {
      debug.error('❌ No recording control available');
    }
  },

  stopRecordingAndTranscribe: () => {
    const control = recordingRegistry.getControl();
    if (control) {
      debug.log('🛑 Stopping recording via API');
      control.stop();
    } else {
      debug.error('❌ No recording control available');
    }
  },

  getAudioLevel: (): number => {
    const control = recordingRegistry.getControl();
    return control ? control.getAudioLevel() : 0;
  },
};

/**
 * Hook to access current audio level for visualization
 * Updates at 60fps during recording
 */
export function useAudioLevel(): number {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let rafId: number;

    const updateAudioLevel = () => {
      const level = RecordingOrchestratorAPI.getAudioLevel();
      setAudioLevel(level);
      rafId = requestAnimationFrame(updateAudioLevel);
    };

    rafId = requestAnimationFrame(updateAudioLevel);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return audioLevel;
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Main hook for recording functionality.
 *
 * Provides a clean API for managing voice recording and transcription.
 * Automatically registers control with the registry so the navigation machine
 * can start/stop recording via RecordingOrchestratorAPI.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const recording = useRecordingOrchestrator({
 *     onTranscript: (text) => console.log('Got transcript:', text),
 *     onError: (error) => console.error('Recording error:', error),
 *   });
 *
 *   return (
 *     <button onClick={recording.start}>
 *       {recording.state === 'recording' ? 'Recording...' : 'Start Recording'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useRecordingOrchestrator(callbacks?: RecordingCallbacks): RecordingOrchestrator {

  // Configure STT callbacks to map to our orchestrator callbacks
  const sttCallbacks: UseSTTCallbacks = {
    onFinal: callbacks?.onTranscript,
    onError: callbacks?.onError,
  };

  // Use the low-level STT hook
  const stt = useSTT(sttCallbacks);

  // Map STT status to our recording state
  const state: RecordingState = stt.status;

  // Register this instance with the registry so navigation machine can use it
  useEffect(() => {
    const control: RecordingControl = {
      start: stt.start,
      stop: stt.stop,
      getAudioLevel: () => stt.audioLevel,
    };

    recordingRegistry.register(control);

    return () => {
      recordingRegistry.unregister();
    };
  }, [stt.start, stt.stop, stt.audioLevel]);

  return {
    start: stt.start,
    stop: stt.stop,
    state,
    transcript: stt.transcript || '',
    partial: stt.partial || '',
    error: stt.error || '',
    audioLevel: stt.audioLevel,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Recording Provider Component
// ──────────────────────────────────────────────────────────────────────────────

/**
 * RecordingProvider - Initializes recording system for the application
 *
 * This component must be mounted at app root to ensure recording control
 * is registered and available to the navigation machine.
 *
 * Automatically emits RECORDING_TRANSCRIBED events to the navigation bus
 * when transcripts are received.
 *
 * @example
 * ```tsx
 * <RecordingProvider>
 *   <App />
 * </RecordingProvider>
 * ```
 */
export function RecordingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize recording orchestrator with transcript handler
  useRecordingOrchestrator({
    onTranscript: (text: string) => {
      debug.log('📝 Transcript received:', text.substring(0, 50));

      // Emit RECORDING_TRANSCRIBED event to navigation bus
      // Navigation machine will use its current context to determine recordingId
      navigationBus.emit({
        type: 'RECORDING_TRANSCRIBED',
        transcript: text,
        recordingId: '' // Machine fills this from current node
      });
    },
    onError: (error: string) => {
      debug.error('❌ Recording error:', error);
    },
  });

  // Just a provider - render children unchanged
  return children;
}
