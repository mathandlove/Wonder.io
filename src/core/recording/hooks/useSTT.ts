/**
 * useSTT Hook
 *
 * Vendor-agnostic Speech-to-Text hook using OpenAI GPT-4o Transcribe via WebSocket proxy.
 * Handles microphone capture, audio encoding, and real-time transcription.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type SttStatus = 'idle' | 'recording' | 'processing' | 'error';

export type NormalizedSttEvent =
  | { type: 'ready' } // Backend signals STT provider is ready
  | { type: 'final'; text: string; confidence?: number; start?: number; duration?: number }
  | { type: 'error'; code?: string; message: string }
  | { type: 'close' }; // Backend signals transcription is complete

export type UseSTTCallbacks = {
  onFinal?: (text: string, confidence?: number, start?: number, duration?: number) => void;
  onFinalized?: () => void; // Called when transcription is complete (after finalize)
  onAutoStop?: () => void; // Called when auto-stop timeout fires (silence detection)
  onError?: (error: string) => void;
};

export type UseSTT = {
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
  SAMPLE_RATE: 16000, // 16kHz audio for STT
  SILENCE_THRESHOLD: 0.01, // RMS threshold for silence detection
  SILENCE_DURATION_MS: 20000, // Auto-stop after 20s of silence
  BUFFER_SIZE: 4096, // AudioWorklet buffer size
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ──────────────────────────────────────────────────────────────────────────────

export function useSTT(callbacks?: UseSTTCallbacks): UseSTT {
  const [status, setStatus] = useState<SttStatus>('idle');
  const [partial, setPartial] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | undefined>(undefined);

  // Store callbacks in ref to avoid re-creating WebSocket on callback changes
  const callbacksRef = useRef<UseSTTCallbacks | undefined>(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Refs for cleanup
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track if stop has been called to prevent duplicate stop calls
  const isStoppingRef = useRef<boolean>(false);

  // Track if a silence timer is currently pending (prevents race condition)
  const silenceTimerPendingRef = useRef<boolean>(false);

  // Audio buffer for early speech (before STT is ready)
  const audioBufferRef = useRef<ArrayBuffer[]>([]);

  // Track if STT backend is ready to receive audio (use ref so onaudioprocess callback has latest value)
  const isSttReadyRef = useRef<boolean>(false);

  // Track if we flushed the buffer (for logging purposes)
  const bufferWasFlushedRef = useRef<boolean>(false);

  // Timer to delay buffer flush after 'ready' (to catch early speech)
  const flushDelayTimerRef = useRef<NodeJS.Timeout | null>(null);

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

    // Reset STT ready state
    isSttReadyRef.current = false;

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
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
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

      // Track if we've sent start_session
      let sessionStartSent = false;

      ws.onopen = () => {
        // Signal to backend that a new session is starting (reset accumulation)
        ws.send(JSON.stringify({ type: 'start_session' }));
        sessionStartSent = true;
        console.log('[FRONTEND] Sent start_session signal to backend on WebSocket open');
      };

      ws.onmessage = (event) => {
        try {
          const message: NormalizedSttEvent = JSON.parse(event.data);

          switch (message.type) {
            case 'ready':
              console.log('✅ STT READY signal received');

              // IMPORTANT: Send start_session again on ready signal to ensure backend resets
              // This handles cases where the WebSocket might have been reused
              if (!sessionStartSent) {
                ws.send(JSON.stringify({ type: 'start_session' }));
                sessionStartSent = true;
                console.log('[FRONTEND] Sent start_session signal on ready (fallback)');
              }

              // Mark as ready immediately - backend will buffer and process all audio on finalize
              isSttReadyRef.current = true;

              // Flush any buffered audio immediately
              flushBuffer(ws);
              break;

            case 'final':
              console.log(`[FRONTEND] FINAL: "${message.text}"`);
              // This is the complete, finalized transcript from the entire recording
              setTranscript(message.text);
              setPartial(''); // Clear any partial text

              // Invoke callback with the final transcript
              if (callbacksRef.current?.onFinal) {
                callbacksRef.current.onFinal(message.text, message.confidence);
              }
              break;

            case 'error':
              console.error(`[FRONTEND] ERROR: ${message.message} (code: ${message.code})`);
              setError(message.message);
              setStatus('error');
              // Invoke callback
              if (callbacksRef.current?.onError) {
                callbacksRef.current.onError(message.message);
              }
              cleanup();
              break;

            case 'close':
              console.log('[FRONTEND] CLOSE signal received');
              // Invoke callback to signal that transcription is complete
              if (callbacksRef.current?.onFinalized) {
                callbacksRef.current.onFinalized();
              }
              // DON'T call cleanup() here - we need to preserve the final transcript!
              // Cleanup will happen when a new recording starts
              // Just close the WebSocket and stop audio processing
              if (wsRef.current) {
                if (wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.close();
                }
                wsRef.current = null;
              }
              setStatus('idle');
              break;
          }
        } catch (error) {
          console.error('[FRONTEND] Parse error:', error);
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

      // 4. Load and setup AudioWorklet processor
      await audioContext.audioWorklet.addModule('/audio-processor.worklet.js');

      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
      workletNodeRef.current = workletNode;

      // Configure silence detection parameters
      workletNode.port.postMessage({
        type: 'updateConfig',
        silenceThreshold: CONFIG.SILENCE_THRESHOLD,
        silenceDurationMs: CONFIG.SILENCE_DURATION_MS,
      });

      // Handle messages from the AudioWorklet processor
      workletNode.port.onmessage = (event) => {
        // Don't process audio if we're already stopping
        if (isStoppingRef.current) {
          return;
        }

        switch (event.data.type) {
          case 'audiodata': {
            // Received processed audio data from worklet
            const audioBuffer = event.data.buffer;

            if (ws.readyState === WebSocket.OPEN && isSttReadyRef.current) {
              // STT backend is ready - send directly
              ws.send(audioBuffer);

              // Reset flag after first direct send
              if (audioBufferRef.current.length === 0 && bufferWasFlushedRef.current) {
                bufferWasFlushedRef.current = false;
              }
            } else if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
              // WebSocket open but STT not ready yet, or still connecting - buffer the audio
              audioBufferRef.current.push(audioBuffer);

              // Limit buffer size to prevent memory issues (max 2 seconds = ~125 chunks at 4096 buffer size)
              if (audioBufferRef.current.length > 125) {
                audioBufferRef.current.shift(); // Remove oldest chunk
              }
            }
            // If WebSocket is CLOSING or CLOSED, we just drop the audio
            break;
          }

          case 'silence': {
            // Start silence timer if not already pending AND not stopping
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
            break;
          }

          case 'speech': {
            // Reset silence timer on speech
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
              silenceTimerPendingRef.current = false;
            }
            break;
          }
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setStatus('error');
      cleanup();
    }
  }, [cleanup, flushBuffer, status]); // stop is defined below, not a dependency

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
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
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
