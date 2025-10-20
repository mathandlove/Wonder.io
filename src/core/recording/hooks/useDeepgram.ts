/**
 * useDeepgram Hook
 *
 * Vendor-agnostic Speech-to-Text hook using Deepgram via WebSocket proxy.
 * Handles microphone capture, audio encoding, and real-time transcription.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type SttStatus = 'idle' | 'recording' | 'processing' | 'error';

export type NormalizedSttEvent =
  | { type: 'ready' } // Backend signals Deepgram is ready
  | { type: 'partial'; text: string }
  | { type: 'final'; text: string; confidence?: number }
  | { type: 'error'; code?: string; message: string }
  | { type: 'close' }; // Backend signals Deepgram closed (finals already sent)

export type UseDeepgramCallbacks = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string, confidence?: number) => void;
  onFinalized?: () => void; // Called when all final transcripts have been received
  onAutoStop?: () => void; // Called when auto-stop timeout fires (silence detection)
  onError?: (error: string) => void;
};

export type UseDeepgram = {
  start: () => Promise<void>;
  stop: () => void;
  status: SttStatus;
  partial: string;
  transcript: string;
  error?: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  WS_URL: 'ws://localhost:3001/api/stt/socket',
  SAMPLE_RATE: 16000, // Deepgram expects 16kHz
  SILENCE_THRESHOLD: 0.01, // RMS threshold for silence detection
  SILENCE_DURATION_MS: 1000, // Auto-stop after 20s of silence
  BUFFER_SIZE: 4096, // AudioWorklet buffer size
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ──────────────────────────────────────────────────────────────────────────────

export function useDeepgram(callbacks?: UseDeepgramCallbacks): UseDeepgram {
  const [status, setStatus] = useState<SttStatus>('idle');
  const [partial, setPartial] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | undefined>(undefined);

  // Store callbacks in ref to avoid re-creating WebSocket on callback changes
  const callbacksRef = useRef<UseDeepgramCallbacks | undefined>(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Refs for cleanup
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track if stop has been called to prevent duplicate stop calls
  const isStoppingRef = useRef<boolean>(false);

  // Track if a silence timer is currently pending (prevents race condition)
  const silenceTimerPendingRef = useRef<boolean>(false);

  // Audio buffer for early speech (before Deepgram is ready)
  const audioBufferRef = useRef<ArrayBuffer[]>([]);

  // Track if Deepgram is ready to receive audio (use ref so onaudioprocess callback has latest value)
  const isDeepgramReadyRef = useRef<boolean>(false);

  // Track if we flushed the buffer (for logging purposes)
  const bufferWasFlushedRef = useRef<boolean>(false);

  // Timer to delay buffer flush after 'ready' (to catch early speech)
  const flushDelayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ──────────────────────────────────────────────────────────────────────────────
  // Audio Processing: Convert Float32 → Int16 PCM
  // ──────────────────────────────────────────────────────────────────────────────

  const convertFloat32ToInt16 = useCallback((float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }, []);

  // ──────────────────────────────────────────────────────────────────────────────
  // VAD: Voice Activity Detection (RMS-based)
  // ──────────────────────────────────────────────────────────────────────────────

  const calculateRMS = useCallback((audioData: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────────
  // Buffer Flushing Helper
  // ──────────────────────────────────────────────────────────────────────────────

  const flushBuffer = useCallback((ws: WebSocket) => {
    if (audioBufferRef.current.length > 0) {
      audioBufferRef.current.forEach(chunk => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(chunk);
        }
      });
      audioBufferRef.current = [];
      bufferWasFlushedRef.current = true;
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ──────────────────────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    // Reset stopping flag
    isStoppingRef.current = false;

    // Clear audio buffer
    audioBufferRef.current = [];

    // Reset Deepgram ready state
    isDeepgramReadyRef.current = false;

    // Clear timers and pending flags
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    silenceTimerPendingRef.current = false;

    if (flushDelayTimerRef.current) {
      clearTimeout(flushDelayTimerRef.current);
      flushDelayTimerRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────────
  // Start Recording
  // ──────────────────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    try {
      isStoppingRef.current = false; // Reset stopping flag when starting new recording
      setStatus('recording');
      setPartial('');
      setTranscript('');
      setError(undefined);

      // Clear audio buffer from any previous session
      audioBufferRef.current = [];

      // 1. Connect to WebSocket proxy
      const ws = new WebSocket(CONFIG.WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // Note: We don't flush the buffer here anymore - we wait for the 'ready' signal
      };

      ws.onmessage = (event) => {
        try {
          const message: NormalizedSttEvent = JSON.parse(event.data);

          switch (message.type) {
            case 'ready':
              // Don't mark as ready immediately - wait for delayed flush
              // This ensures we buffer any speech that starts right after mic permission is granted

              // Schedule delayed flush to catch early speech
              flushDelayTimerRef.current = setTimeout(() => {
                isDeepgramReadyRef.current = true;
                flushBuffer(ws);
                flushDelayTimerRef.current = null;
              }, 500); // Wait 500ms to catch early speech
              break;

            case 'partial':
              setPartial(message.text);
              // Invoke callback
              if (callbacksRef.current?.onPartial) {
                callbacksRef.current.onPartial(message.text);
              }
              // Reset silence timer on speech activity
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
              break;

            case 'final':
              // Don't accumulate in the hook - let the parent handle it via callback
              setTranscript(message.text); // Store only the latest final text
              setPartial(''); // Clear partial after final
              // Invoke callback
              if (callbacksRef.current?.onFinal) {
                callbacksRef.current.onFinal(message.text, message.confidence);
              }
              break;

            case 'error':
              setError(message.message);
              setStatus('error');
              // Invoke callback
              if (callbacksRef.current?.onError) {
                callbacksRef.current.onError(message.message);
              }
              cleanup();
              break;

            case 'close':
              // Invoke callback to signal that all transcripts are done
              if (callbacksRef.current?.onFinalized) {
                callbacksRef.current.onFinalized();
              }
              cleanup();
              setStatus('idle');
              break;
          }
        } catch {
          // Silently handle parse errors
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection failed - is backend running on port 3001?');
        setStatus('error');
        cleanup();
      };

      ws.onclose = () => {
        if (status === 'recording') {
          setStatus('idle');
        }
      };

      // 2. Capture microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          sampleRate: CONFIG.SAMPLE_RATE,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Setup AudioContext
      const audioContext = new AudioContext({ sampleRate: CONFIG.SAMPLE_RATE });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // 4. Process audio with ScriptProcessorNode
      // Note: AudioWorklet is preferred but requires separate file setup
      const processor = audioContext.createScriptProcessor(CONFIG.BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        // Don't process audio if we're already stopping
        if (isStoppingRef.current) {
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);

        // VAD: Check if speaking
        const rms = calculateRMS(inputData);
        const isSilence = rms < CONFIG.SILENCE_THRESHOLD;

        if (isSilence) {
          // Start silence timer if not already pending AND not stopping
          // Use pending flag to prevent race condition where multiple audio chunks
          // create multiple timers before the first one sets silenceTimerRef
          if (!silenceTimerPendingRef.current && !isStoppingRef.current) {
            // Set pending flag IMMEDIATELY to prevent concurrent timer creation
            silenceTimerPendingRef.current = true;

            silenceTimerRef.current = setTimeout(() => {
              // Call onAutoStop callback if registered (allows orchestrator to handle state transition)
              if (callbacksRef.current?.onAutoStop) {
                callbacksRef.current.onAutoStop();
              }
              // Then stop the recording
              stop();
            }, CONFIG.SILENCE_DURATION_MS);
          }
        } else {
          // Reset silence timer on speech
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
            silenceTimerPendingRef.current = false;
          }
        }

        // Convert and send audio data
        const int16Data = convertFloat32ToInt16(inputData);

        if (ws.readyState === WebSocket.OPEN && isDeepgramReadyRef.current) {
          // Deepgram is ready - send directly
          ws.send(int16Data.buffer);

          // Reset flag after first direct send
          if (audioBufferRef.current.length === 0 && bufferWasFlushedRef.current) {
            bufferWasFlushedRef.current = false;
          }
        } else if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          // WebSocket open but Deepgram not ready yet, or still connecting - buffer the audio
          audioBufferRef.current.push(int16Data.buffer);

          // Limit buffer size to prevent memory issues (max 2 seconds = ~125 chunks at 4096 buffer size)
          if (audioBufferRef.current.length > 125) {
            audioBufferRef.current.shift(); // Remove oldest chunk
          }
        }
        // If WebSocket is CLOSING or CLOSED, we just drop the audio
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setStatus('error');
      cleanup();
    }
  }, [calculateRMS, cleanup, convertFloat32ToInt16, status]); // stop is defined below, not a dependency

  // ──────────────────────────────────────────────────────────────────────────────
  // Stop Recording
  // ──────────────────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    // Guard: If already stopping, don't stop again
    if (isStoppingRef.current) {
      return;
    }

    isStoppingRef.current = true;

    // CRITICAL: Clear silence timer AND pending flag FIRST to prevent it from firing during cleanup
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    silenceTimerPendingRef.current = false;

    // Clear flush delay timer too
    if (flushDelayTimerRef.current) {
      clearTimeout(flushDelayTimerRef.current);
      flushDelayTimerRef.current = null;
    }

    setStatus('processing');

    // Send finalize message to backend to get final transcripts before closing
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'finalize' }));
    }

    // Stop audio capture immediately (but keep WebSocket open for final transcripts)
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Don't call full cleanup yet - wait for 'finalized' event
    // The 'finalized' event handler or a timeout will call cleanup
  }, []);

  // ──────────────────────────────────────────────────────────────────────────────
  // Cleanup on unmount
  // ──────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    start,
    stop,
    status,
    partial,
    transcript,
    error,
  };
}
