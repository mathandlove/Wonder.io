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
import { useEffect, useState, useRef } from 'react';
import * as navigationBus from '../navigation/events/navigationBus';
import { useNavigationStore } from '../navigation/navigationStore';

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
  /** Called when mic is confirmed active and recording */
  onRecordingActive?: () => void;
  /** Called when recording had no real audio (mic blocked, silent, etc.) */
  onNoAudioDetected?: () => void;
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
  getStatus: () => RecordingState;
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

  getStatus(): RecordingState {
    return this.control?.getStatus() ?? 'idle';
  }
}

export const recordingRegistry = new RecordingControlRegistry();

// ──────────────────────────────────────────────────────────────────────────────
// API for Navigation Machine
// ──────────────────────────────────────────────────────────────────────────────

// Track if we've already requested permission this session
let permissionRequested = false;

/**
 * Request microphone permission without starting recording.
 * This prompts the user for permission upfront so they don't get prompted
 * when they actually want to record.
 *
 * On iOS (including Chrome on iOS), permissions may still be requested
 * per-session due to platform restrictions, but this helps in most cases.
 */
async function requestMicrophonePermission(emitErrorEvent = false): Promise<boolean> {
  if (permissionRequested) {
    debug.log('🎤 Permission already requested this session, skipping');
    return true;
  }

  try {
    debug.log('🎤 Requesting microphone permission upfront...');

    // Request minimal audio access - this triggers the permission prompt
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Immediately stop the tracks - we just wanted the permission
    stream.getTracks().forEach(track => track.stop());

    permissionRequested = true;
    debug.log('✅ Microphone permission granted');
    return true;
  } catch (err) {
    debug.error('❌ Microphone permission denied or failed:', err);
    // Don't set permissionRequested to true so we can retry
    // Emit event so navigation machine can show error state (only when user is trying to record)
    if (emitErrorEvent) {
      navigationBus.emit({ type: 'NO_MICROPHONE_DETECTED' });
    }
    return false;
  }
}

/**
 * API for navigation machine to control recording.
 * Uses the registry to find the active recording control.
 */
export const RecordingOrchestratorAPI = {
  /**
   * Request microphone permission without starting recording.
   * Call this early (e.g., after first user interaction) to avoid
   * permission prompts when the user wants to record.
   */
  requestPermission: requestMicrophonePermission,

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
 * Updates at 60fps during recording, but only triggers re-render when value changes
 */
export function useAudioLevel(): number {
  const [audioLevel, setAudioLevel] = useState(0);
  const lastLevelRef = useRef(0);

  useEffect(() => {
    let rafId: number;

    const updateAudioLevel = () => {
      const level = RecordingOrchestratorAPI.getAudioLevel();
      // Only update state if level changed (avoid unnecessary re-renders)
      if (level !== lastLevelRef.current) {
        lastLevelRef.current = level;
        setAudioLevel(level);
      }
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

/**
 * Hook to access current recording status
 * Returns 'idle' | 'recording' | 'processing' | 'error'
 * Use this to disable stop button until recording has actually started
 */
export function useRecordingStatus(): RecordingState {
  const [status, setStatus] = useState<RecordingState>('idle');
  const lastStatusRef = useRef<RecordingState>('idle');

  useEffect(() => {
    let rafId: number;

    const updateStatus = () => {
      const currentStatus = recordingRegistry.getStatus();
      // Only update state if status changed (avoid unnecessary re-renders)
      if (currentStatus !== lastStatusRef.current) {
        lastStatusRef.current = currentStatus;
        setStatus(currentStatus);
      }
      rafId = requestAnimationFrame(updateStatus);
    };

    rafId = requestAnimationFrame(updateStatus);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return status;
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
    onAutoStop: callbacks?.onAutoStop,
    onRecordingActive: callbacks?.onRecordingActive,
    onNoAudioDetected: callbacks?.onNoAudioDetected,
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
      getStatus: () => state,
    };

    recordingRegistry.register(control);

    return () => {
      recordingRegistry.unregister();
    };
  }, [stt.start, stt.stop, stt.audioLevel, state]);

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
    onRecordingActive: () => {
      debug.log('🎙️ Recording active - emitting RECORDING_ACTIVE');
      navigationBus.emit({ type: 'RECORDING_ACTIVE' });
    },
    onAutoStop: () => {
      // Called when autostop fires (1s silence after speech detected)
      // We need to emit RECORDING_STOPPED so the navigation machine transitions to processing state
      debug.log('⏱️ Autostop fired - emitting RECORDING_STOPPED');

      // Determine recording type from current phase
      const currentPhase = useNavigationStore.getState().getCurrentPhase();
      const recordingType = currentPhase === 'record-answer' ? 'answer' : 'question';
      const currentNodeId = useNavigationStore.getState().graph.currentId || '';

      navigationBus.emit({
        type: 'RECORDING_STOPPED',
        nodeId: currentNodeId,
        recordingType
      });
    },
    onNoAudioDetected: () => {
      // Called when peak audio level was below threshold during recording
      // This means mic was blocked, silent, or not capturing real audio
      debug.log('⚠️ No audio detected (low peak level) - emitting NO_AUDIO_RECORDED');
      navigationBus.emit({
        type: 'NO_AUDIO_RECORDED',
        recordingType: 'question' // Default to question, machine will handle based on current state
      });
    },
    onTranscript: (text: string) => {
      debug.log('📝 Transcript received:', {
        text: text?.substring(0, 50),
        length: text?.length,
      });

      // Emit RECORDING_TRANSCRIBED event to navigation bus
      // Navigation machine will use its current context to determine recordingId
      // Note: onNoAudioDetected is called instead if no real audio was captured
      navigationBus.emit({
        type: 'RECORDING_TRANSCRIBED',
        transcript: text,
        recordingId: '' // Machine fills this from current node
      });
    },
    onError: (error: string) => {
      debug.error('❌ Recording error:', error);
      // Check if error is related to microphone permission/access
      if (error.includes('NotAllowedError') || error.includes('permission') || error.includes('denied')) {
        navigationBus.emit({ type: 'NO_MICROPHONE_DETECTED' });
      }
    },
  });

  // Just a provider - render children unchanged
  return children;
}
