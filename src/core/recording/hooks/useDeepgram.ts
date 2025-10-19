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
  | { type: 'finalized' } // Backend signals all final transcripts received
  | { type: 'error'; code?: string; message: string }
  | { type: 'close' };

export type UseDeepgramCallbacks = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string, confidence?: number) => void;
  onFinalized?: () => void; // Called when all final transcripts have been received
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
  SILENCE_DURATION_MS: 5000, // Auto-stop after 5s of silence
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
      console.log(`[useDeepgram] 🔊 Flushing ${audioBufferRef.current.length} buffered chunks`);
      audioBufferRef.current.forEach(chunk => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(chunk);
        }
      });
      audioBufferRef.current = [];
      bufferWasFlushedRef.current = true;
    } else {
      console.log('[useDeepgram] ℹ️ Buffer is empty (no audio captured yet)');
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ──────────────────────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    console.log('[useDeepgram] Cleaning up resources...');

    // Clear audio buffer
    audioBufferRef.current = [];

    // Reset Deepgram ready state
    isDeepgramReadyRef.current = false;

    // Clear timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

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

    console.log('[useDeepgram] Cleanup complete');
  }, []);

  // ──────────────────────────────────────────────────────────────────────────────
  // Start Recording
  // ──────────────────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    try {
      console.log('[useDeepgram] Starting recording...');
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
        console.log('[useDeepgram] ✅ WebSocket connected to backend proxy:', CONFIG.WS_URL);
        console.log('[useDeepgram] ⏳ Waiting for Deepgram to be ready...');
        // Note: We don't flush the buffer here anymore - we wait for the 'ready' signal
      };

      ws.onmessage = (event) => {
        try {
          const message: NormalizedSttEvent = JSON.parse(event.data);
          console.log('[useDeepgram] 📨 Received message:', message.type);

          switch (message.type) {
            case 'ready':
              console.log('[useDeepgram] ✅ Deepgram is ready!');
              console.log('[useDeepgram] ⏳ Continuing to buffer for 500ms to catch early speech...');

              // Don't mark as ready immediately - wait for delayed flush
              // This ensures we buffer any speech that starts right after mic permission is granted

              // Schedule delayed flush to catch early speech
              flushDelayTimerRef.current = setTimeout(() => {
                console.log('[useDeepgram] ⏰ Delay period over - flushing buffer and switching to direct send');
                isDeepgramReadyRef.current = true;
                flushBuffer(ws);
                flushDelayTimerRef.current = null;
              }, 500); // Wait 500ms to catch early speech
              break;

            case 'partial':
              console.log('[useDeepgram] Partial:', message.text);
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
              console.log('[useDeepgram] Final:', message.text, `(confidence: ${message.confidence})`);
              // Don't accumulate in the hook - let the parent handle it via callback
              setTranscript(message.text); // Store only the latest final text
              setPartial(''); // Clear partial after final
              // Invoke callback
              if (callbacksRef.current?.onFinal) {
                callbacksRef.current.onFinal(message.text, message.confidence);
              }
              break;

            case 'finalized':
              console.log('[useDeepgram] ✅ All final transcripts received');
              // Invoke callback to signal that all transcripts are done
              if (callbacksRef.current?.onFinalized) {
                callbacksRef.current.onFinalized();
              }
              // Close WebSocket (will trigger cleanup via onclose handler)
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.log('[useDeepgram] 🔌 Closing WebSocket after finalized');
                wsRef.current.close(1000, 'Finalized');
              }
              setStatus('idle');
              break;

            case 'error':
              console.error('[useDeepgram] Error:', message.message);
              setError(message.message);
              setStatus('error');
              // Invoke callback
              if (callbacksRef.current?.onError) {
                callbacksRef.current.onError(message.message);
              }
              cleanup();
              break;

            case 'close':
              console.log('[useDeepgram] Connection closed by server');
              cleanup();
              break;
          }
        } catch (err) {
          console.error('[useDeepgram] Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[useDeepgram] WebSocket error:', event);
        console.error('[useDeepgram] Make sure backend is running: cd backend && pnpm dev');
        console.error('[useDeepgram] Expected WebSocket URL:', CONFIG.WS_URL);
        setError('WebSocket connection failed - is backend running on port 3001?');
        setStatus('error');
        cleanup();
      };

      ws.onclose = () => {
        console.log('[useDeepgram] WebSocket closed');
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
        const inputData = event.inputBuffer.getChannelData(0);

        // VAD: Check if speaking
        const rms = calculateRMS(inputData);
        const isSilence = rms < CONFIG.SILENCE_THRESHOLD;

        if (isSilence) {
          // Start silence timer if not already running
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              console.log('[useDeepgram] Auto-stop: 5s silence detected');
              stop();
            }, CONFIG.SILENCE_DURATION_MS);
          }
        } else {
          // Reset silence timer on speech
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        }

        // Convert and send audio data
        const int16Data = convertFloat32ToInt16(inputData);

        if (ws.readyState === WebSocket.OPEN && isDeepgramReadyRef.current) {
          // Deepgram is ready - send directly
          ws.send(int16Data.buffer);

          // Log first direct send after buffering
          if (audioBufferRef.current.length === 0 && bufferWasFlushedRef.current) {
            console.log('[useDeepgram] 📡 Now sending audio directly to Deepgram');
            bufferWasFlushedRef.current = false;
          }
        } else if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          // WebSocket open but Deepgram not ready yet, or still connecting - buffer the audio
          const bufferLength = audioBufferRef.current.length;
          audioBufferRef.current.push(int16Data.buffer);

          // Log when we start buffering
          if (bufferLength === 0) {
            console.log('[useDeepgram] 🎤 Started buffering audio (Deepgram not ready yet)');
          }

          // Limit buffer size to prevent memory issues (max 2 seconds = ~125 chunks at 4096 buffer size)
          if (audioBufferRef.current.length > 125) {
            audioBufferRef.current.shift(); // Remove oldest chunk
          }
        }
        // If WebSocket is CLOSING or CLOSED, we just drop the audio
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log('[useDeepgram] Recording started successfully');
    } catch (err) {
      console.error('[useDeepgram] Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setStatus('error');
      cleanup();
    }
  }, [calculateRMS, cleanup, convertFloat32ToInt16, status]); // stop is defined below, not a dependency

  // ──────────────────────────────────────────────────────────────────────────────
  // Stop Recording
  // ──────────────────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    console.log('[useDeepgram] Stopping recording...');
    setStatus('processing');

    // Send finalize message to backend to get final transcripts before closing
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('[useDeepgram] 📤 Sending finalize request to backend');
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

    // Clear silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
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
