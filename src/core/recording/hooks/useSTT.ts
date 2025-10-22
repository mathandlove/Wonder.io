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
  audioLevel: number; // Current audio level (0-1) for visualization
};

// ──────────────────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  WS_URL: 'ws://localhost:3001/api/stt/socket',
  SAMPLE_RATE: 16000, // 16kHz audio for STT
  SILENCE_THRESHOLD: 0.005, // Lower threshold for soft-spoken children (was 0.01)
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
  const [audioLevel, setAudioLevel] = useState<number>(0);

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

  // Track if we're waiting for a flush chunk (allows final chunk through when stopping)
  const expectingFlushRef = useRef<boolean>(false);

  // Callback to execute when flush chunk is received
  const onFlushCompleteRef = useRef<(() => void) | null>(null);

  // Track if a silence timer is currently pending (prevents race condition)
  const silenceTimerPendingRef = useRef<boolean>(false);

  // Audio buffer for early speech (before STT is ready)
  const audioBufferRef = useRef<ArrayBuffer[]>([]);

  // Ref to store stop function to avoid circular dependency in useCallback
  const stopRef = useRef<(() => void) | null>(null);

  // Track if STT backend is ready to receive audio (use ref so onaudioprocess callback has latest value)
  const isSttReadyRef = useRef<boolean>(false);

  // Track if we flushed the buffer (for logging purposes)
  const bufferWasFlushedRef = useRef<boolean>(false);

  // Timer to delay buffer flush after 'ready' (to catch early speech)
  const flushDelayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Safety timeout to ensure cleanup happens even if 'close' event never arrives
  const cleanupSafetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ──────────────────────────────────────────────────────────────────────────────
  // Buffer Flushing Helper
  // ──────────────────────────────────────────────────────────────────────────────

  const flushBuffer = useCallback((ws: WebSocket) => {
    if (audioBufferRef.current.length > 0) {
      console.log(`[flushBuffer] 🚀 Flushing ${audioBufferRef.current.length} buffered chunks to WebSocket`);
      let sentCount = 0;
      audioBufferRef.current.forEach(chunk => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(chunk);
          sentCount++;
        }
      });
      console.log(`[flushBuffer] ✅ Successfully sent ${sentCount}/${audioBufferRef.current.length} chunks`);
      audioBufferRef.current = [];
      bufferWasFlushedRef.current = true;
    } else {
      console.log('[flushBuffer] ℹ️  No buffered chunks to flush');
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ──────────────────────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    console.log('');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  🧹 CLEANUP FUNCTION CALLED                        ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');

    console.log('[Cleanup] 📊 Current resource state:');
    console.log(`  - MediaStream: ${mediaStreamRef.current ? 'EXISTS' : 'NULL'}`);
    console.log(`  - SourceNode: ${sourceNodeRef.current ? 'EXISTS' : 'NULL'}`);
    console.log(`  - WorkletNode: ${workletNodeRef.current ? 'EXISTS' : 'NULL'}`);
    console.log(`  - AudioContext: ${audioContextRef.current ? audioContextRef.current.state : 'NULL'}`);
    console.log(`  - WebSocket: ${wsRef.current ? `state=${wsRef.current.readyState}` : 'NULL'}`);

    // Reset stopping flag
    isStoppingRef.current = false;
    console.log('[Cleanup] ✓ Reset isStoppingRef = false');

    // Reset flush expectation flag and callback
    expectingFlushRef.current = false;
    onFlushCompleteRef.current = null;
    console.log('[Cleanup] ✓ Reset expectingFlushRef = false and cleared onFlushCompleteRef');

    // Clear audio buffer
    audioBufferRef.current = [];
    console.log('[Cleanup] ✓ Cleared audio buffer');

    // Reset STT ready state
    isSttReadyRef.current = false;
    console.log('[Cleanup] ✓ Reset isSttReadyRef = false');

    // Clear ALL timers and pending flags
    console.log('[Cleanup] ⏱️  Clearing timers...');
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      console.log('  ✓ Cleared silence timer');
    }
    silenceTimerPendingRef.current = false;

    if (flushDelayTimerRef.current) {
      clearTimeout(flushDelayTimerRef.current);
      flushDelayTimerRef.current = null;
      console.log('  ✓ Cleared flush delay timer');
    }

    if (cleanupSafetyTimerRef.current) {
      clearTimeout(cleanupSafetyTimerRef.current);
      cleanupSafetyTimerRef.current = null;
      console.log('  ✓ Cleared cleanup safety timer');
    }

    // Close WebSocket
    console.log('[Cleanup] 🌐 Closing WebSocket...');
    if (wsRef.current) {
      console.log(`  → WebSocket readyState: ${wsRef.current.readyState}`);
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
        console.log('  ✓ WebSocket closed');
      }
      wsRef.current = null;
      console.log('  ✓ WebSocket ref cleared');
    } else {
      console.log('  → WebSocket already null');
    }

    // Stop audio processing
    console.log('[Cleanup] 🔌 Disconnecting audio nodes...');
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
      console.log('  ✓ Worklet disconnected and ref cleared');
    } else {
      console.log('  → Worklet already null');
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
      console.log('  ✓ Source node disconnected and ref cleared');
    } else {
      console.log('  → Source node already null');
    }

    // Stop media stream
    console.log('[Cleanup] 🎤 Stopping MediaStream...');
    if (mediaStreamRef.current) {
      const tracks = mediaStreamRef.current.getTracks();
      console.log(`  → Found ${tracks.length} track(s)`);
      tracks.forEach((track, i) => {
        console.log(`  → Stopping track ${i}: ${track.kind} (state: ${track.readyState})`);
        track.stop();
        console.log(`    → After stop: ${track.readyState}`);
      });
      mediaStreamRef.current = null;
      console.log('  ✓ MediaStream ref cleared');
    } else {
      console.log('  → MediaStream already null');
    }

    // Close audio context - this releases the microphone indicator
    console.log('[Cleanup] 🔊 Closing AudioContext...');
    if (audioContextRef.current) {
      const context = audioContextRef.current;
      const contextState = context.state;
      console.log(`  → AudioContext state: "${contextState}"`);

      if (contextState !== 'closed') {
        console.log('  → Calling context.close()...');
        context.close().then(() => {
          console.log('[Cleanup] ✅✅✅ AudioContext.close() RESOLVED IN CLEANUP ✅✅✅');
        }).catch((err) => {
          console.error('[Cleanup] ❌ Failed to close AudioContext:', err);
        });
      } else {
        console.log('  → Already closed');
      }
      audioContextRef.current = null;
      console.log('  ✓ AudioContext ref cleared');
    } else {
      console.log('  → AudioContext already null');
    }

    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  ✅ CLEANUP COMPLETE                               ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log('');
  }, []);

  // ──────────────────────────────────────────────────────────────────────────────
  // Start Recording
  // ──────────────────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║  ▶️  START RECORDING CALLED                       ║');
    console.log('╚═══════════════════════════════════════════════════╝');

    // CRITICAL: Clean up any existing resources before starting new recording
    // This prevents resource leaks if start() is called multiple times
    console.log('[START] 🧹 Cleaning up any existing resources first...');
    cleanup();

    // CRITICAL FIX: Wait for WebSocket close to complete before creating new connection
    // This prevents race condition where two WebSockets are open simultaneously
    // causing audio from old session to leak into new session
    console.log('[START] ⏳ Waiting 100ms for WebSocket close handshake to complete...');
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[START] ✓ WebSocket cleanup grace period complete');

    try {
      isStoppingRef.current = false; // Reset stopping flag when starting new recording
      console.log('[START] ✓ Reset isStoppingRef = false');

      setStatus('recording');
      setPartial('');
      setTranscript('');
      setError(undefined);
      console.log('[START] ✓ Set status to recording, cleared transcript');

      // Clear audio buffer from any previous session
      audioBufferRef.current = [];

      // ═══════════════════════════════════════════════════════════════════════
      // PARALLELIZED INITIALIZATION
      // Start WebSocket AND audio capture simultaneously to minimize latency
      // ═══════════════════════════════════════════════════════════════════════

      console.log('[START] 🚀 Starting PARALLEL initialization (WebSocket + Audio)...');

      // 1. Start WebSocket connection (non-blocking)
      console.log(`[START] 🌐 Connecting to WebSocket: ${CONFIG.WS_URL}`);
      const ws = new WebSocket(CONFIG.WS_URL);
      wsRef.current = ws;

      // Track if we've sent start_session
      let sessionStartSent = false;

      ws.onopen = () => {
        // Signal to backend that a new session is starting (reset accumulation)
        ws.send(JSON.stringify({ type: 'start_session' }));
        sessionStartSent = true;
        console.log('[FRONTEND] ✅ WebSocket OPEN - Sent start_session signal');
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
              console.log(`[FRONTEND] Flushing ${audioBufferRef.current.length} buffered chunks`);
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
              console.log('');
              console.log('╔═══════════════════════════════════════════════════╗');
              console.log('║  📨 BACKEND SENT "CLOSE" SIGNAL                   ║');
              console.log('╚═══════════════════════════════════════════════════╝');
              // Invoke callback to signal that transcription is complete
              if (callbacksRef.current?.onFinalized) {
                console.log('[WS:close] → Calling onFinalized callback');
                callbacksRef.current.onFinalized();
              }
              // Now cleanup all resources (transcript state is preserved as it's not touched by cleanup)
              console.log('[WS:close] → Calling cleanup()');
              cleanup();
              console.log('[WS:close] → Setting status to idle');
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

      // 2. Capture microphone IN PARALLEL (this may block on user permission)
      console.log('[START] 🎤 Requesting microphone access (parallel with WebSocket)...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          sampleRate: CONFIG.SAMPLE_RATE,
        },
      });
      mediaStreamRef.current = stream;
      const tracks = stream.getTracks();
      console.log(`[START] ✓ Got MediaStream with ${tracks.length} track(s):`);
      tracks.forEach((track, i) => {
        console.log(`  → Track ${i}: ${track.kind}, state: ${track.readyState}, enabled: ${track.enabled}`);
      });

      // 3. Setup AudioContext
      console.log('[START] 🔊 Creating AudioContext...');
      const audioContext = new AudioContext({ sampleRate: CONFIG.SAMPLE_RATE });
      audioContextRef.current = audioContext;
      console.log(`[START] ✓ AudioContext created, state: ${audioContext.state}`);

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      console.log('[START] ✓ Created MediaStreamSource node');

      // 4. Load and setup AudioWorklet processor
      console.log('[START] 📦 Loading AudioWorklet module...');
      await audioContext.audioWorklet.addModule('/audio-processor.worklet.js');
      console.log('[START] ✓ AudioWorklet module loaded');

      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
      workletNodeRef.current = workletNode;
      console.log('[START] ✓ AudioWorkletNode created');

      // Configure silence detection parameters
      workletNode.port.postMessage({
        type: 'updateConfig',
        silenceThreshold: CONFIG.SILENCE_THRESHOLD,
        silenceDurationMs: CONFIG.SILENCE_DURATION_MS,
      });

      // Handle messages from the AudioWorklet processor
      workletNode.port.onmessage = (event) => {
        switch (event.data.type) {
          case 'audiodata': {
            // Only process audio if we're actively recording OR expecting the final flush
            if (isStoppingRef.current && !expectingFlushRef.current) {
              console.log('[useSTT] Dropping audio chunk - already stopping and not expecting flush');
              return;
            }

            const audioBuffer = event.data.buffer;

            if (ws.readyState === WebSocket.OPEN && isSttReadyRef.current) {
              // STT backend is ready - send directly
              ws.send(audioBuffer);
              console.log('[useSTT] Sent audio chunk to backend, size:', audioBuffer.byteLength);

              // If we were expecting a flush, we just received it - execute the post-flush callback
              if (expectingFlushRef.current) {
                console.log('[useSTT] ✅ Received expected flush chunk - executing onFlushComplete callback');
                expectingFlushRef.current = false;

                // Execute the callback that was set up when we sent the flush command
                if (onFlushCompleteRef.current) {
                  onFlushCompleteRef.current();
                  onFlushCompleteRef.current = null;
                }
              }

              // Reset flag after first direct send
              if (audioBufferRef.current.length === 0 && bufferWasFlushedRef.current) {
                bufferWasFlushedRef.current = false;
              }
            } else if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
              // WebSocket open but STT not ready yet, or still connecting - buffer the audio
              audioBufferRef.current.push(audioBuffer);
              console.log(`[useSTT] 📦 BUFFERING audio chunk (total buffered: ${audioBufferRef.current.length}) - WS state: ${ws.readyState}, STT ready: ${isSttReadyRef.current}`);

              // Limit buffer size to prevent memory issues (max 2 seconds = ~125 chunks at 4096 buffer size)
              if (audioBufferRef.current.length > 125) {
                audioBufferRef.current.shift(); // Remove oldest chunk
                console.log('[useSTT] ⚠️  Buffer overflow - dropped oldest chunk');
              }
            }
            // If WebSocket is CLOSING or CLOSED, we just drop the audio
            break;
          }

          case 'flush_complete': {
            // Worklet buffer was empty, but flush was acknowledged
            console.log('[useSTT] ✅ Received flush_complete (buffer was empty) - executing onFlushComplete callback');
            expectingFlushRef.current = false;

            // Execute the callback that was set up when we sent the flush command
            if (onFlushCompleteRef.current) {
              onFlushCompleteRef.current();
              onFlushCompleteRef.current = null;
            }
            break;
          }

          case 'silence': {
            // Don't process silence detection if we're already stopping
            if (isStoppingRef.current) {
              break;
            }

            // Start silence timer if not already pending
            if (!silenceTimerPendingRef.current) {
              // Set pending flag IMMEDIATELY to prevent concurrent timer creation
              silenceTimerPendingRef.current = true;

              silenceTimerRef.current = setTimeout(() => {
                // Call onAutoStop callback if registered (allows orchestrator to handle state transition)
                if (callbacksRef.current?.onAutoStop) {
                  callbacksRef.current.onAutoStop();
                }
                // Then stop the recording
                stopRef.current?.();
              }, CONFIG.SILENCE_DURATION_MS);
            }
            break;
          }

          case 'speech': {
            // Don't process speech detection if we're already stopping
            if (isStoppingRef.current) {
              break;
            }

            // Reset silence timer on speech
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
              silenceTimerPendingRef.current = false;
            }
            break;
          }

          case 'volumeLevel': {
            // Don't update audio level if we're already stopping
            if (isStoppingRef.current) {
              break;
            }

            // Update audio level for visualization
            // Scale RMS (typically 0-0.1) to 0-1 range for better visualization
            const scaledLevel = Math.min(event.data.level * 10, 1);
            setAudioLevel(scaledLevel);
            break;
          }
        }
      };

      console.log('[START] 🔌 Connecting audio nodes...');
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
      console.log('[START] ✓ Audio graph connected');

      console.log('[START] 📊 FINAL RESOURCE STATE:');
      console.log(`  - MediaStream: ${mediaStreamRef.current ? 'SET' : 'NULL'}`);
      console.log(`  - SourceNode: ${sourceNodeRef.current ? 'SET' : 'NULL'}`);
      console.log(`  - WorkletNode: ${workletNodeRef.current ? 'SET' : 'NULL'}`);
      console.log(`  - AudioContext: ${audioContextRef.current ? audioContextRef.current.state : 'NULL'}`);
      console.log(`  - WebSocket: ${wsRef.current ? wsRef.current.readyState : 'NULL'}`);

      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║  ✅ START RECORDING COMPLETE                      ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log('');
    } catch (err) {
      console.error('[START] ❌ ERROR during start:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setStatus('error');
      cleanup();
    }
  }, [cleanup, flushBuffer, status]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Stop Recording
  // ──────────────────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('[useSTT] 🛑 STOP CALLED');
    console.log('═══════════════════════════════════════════════════════');

    // Guard: If already stopping, don't stop again
    if (isStoppingRef.current) {
      console.log('[useSTT] ⚠️  Already stopping, ignoring stop call');
      return;
    }

    isStoppingRef.current = true;
    console.log('[useSTT] ✓ Set isStoppingRef = true');

    // CRITICAL: Clear silence timer AND pending flag FIRST to prevent it from firing during cleanup
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      console.log('[useSTT] ✓ Cleared silence timer');
    }
    silenceTimerPendingRef.current = false;

    // Clear flush delay timer too
    if (flushDelayTimerRef.current) {
      clearTimeout(flushDelayTimerRef.current);
      flushDelayTimerRef.current = null;
      console.log('[useSTT] ✓ Cleared flush delay timer');
    }

    console.log('[useSTT] 📊 RESOURCE STATE BEFORE STOP:');
    console.log(`  - MediaStream: ${mediaStreamRef.current ? 'EXISTS' : 'NULL'}`);
    if (mediaStreamRef.current) {
      const tracks = mediaStreamRef.current.getTracks();
      console.log(`    → Tracks: ${tracks.length}`);
      tracks.forEach((track, i) => {
        console.log(`      [${i}] ${track.kind}: ${track.readyState} (enabled: ${track.enabled})`);
      });
    }
    console.log(`  - SourceNode: ${sourceNodeRef.current ? 'EXISTS' : 'NULL'}`);
    console.log(`  - WorkletNode: ${workletNodeRef.current ? 'EXISTS' : 'NULL'}`);
    console.log(`  - AudioContext: ${audioContextRef.current ? audioContextRef.current.state : 'NULL'}`);
    console.log(`  - WebSocket: ${wsRef.current ? wsRef.current.readyState : 'NULL'}`);

    setStatus('processing');
    console.log('[useSTT] ✓ Status set to: processing');

    // CRITICAL FIX: Flush the worklet buffer BEFORE stopping the audio pipeline
    // This ensures we capture any remaining audio in the worklet's partial buffer
    console.log('[useSTT] 📤 Flushing worklet buffer FIRST (before stopping audio)...');
    if (workletNodeRef.current) {
      console.log('[useSTT] ✓ Worklet exists, sending flush message');
      // Set flag to allow the final flush chunk through (and ONLY that chunk)
      expectingFlushRef.current = true;

      // Set up the callback to execute when flush chunk arrives
      onFlushCompleteRef.current = () => {
        console.log('[useSTT] 🎯 EVENT-DRIVEN: Flush chunk received - now stopping audio pipeline');

        // NOW stop capturing new audio
        console.log('[useSTT] 🎤 Stopping MediaStream tracks...');
        if (mediaStreamRef.current) {
          const tracks = mediaStreamRef.current.getTracks();
          console.log(`  → Found ${tracks.length} track(s)`);
          tracks.forEach((track, i) => {
            console.log(`  → Track ${i}: ${track.kind}, readyState BEFORE: "${track.readyState}", enabled: ${track.enabled}`);
            track.stop();
            console.log(`  → Track ${i}: ${track.kind}, readyState AFTER: "${track.readyState}"`);
          });
          mediaStreamRef.current = null;
          console.log('[useSTT] ✅ MediaStream ref cleared');
        } else {
          console.log('[useSTT] ⚠️  No MediaStream to stop!');
        }

        // Disconnect the source node to stop audio flowing to the worklet
        console.log('[useSTT] 🔌 Disconnecting source node...');
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
          console.log('[useSTT] ✅ Source node disconnected and ref cleared');
        } else {
          console.log('[useSTT] ⚠️  No source node to disconnect');
        }

        // Disconnect the worklet
        if (workletNodeRef.current) {
          console.log('[useSTT] 🔌 Disconnecting worklet...');
          workletNodeRef.current.disconnect();
          workletNodeRef.current = null;
          console.log('[useSTT] ✅ Worklet disconnected and ref cleared');
        } else {
          console.log('[useSTT] ⚠️  Worklet already gone');
        }

        // Close AudioContext to release microphone
        console.log('[useSTT] 🔊 Closing AudioContext...');
        if (audioContextRef.current) {
          const context = audioContextRef.current;
          const state = context.state;
          console.log(`  → AudioContext state: "${state}"`);

          if (state !== 'closed') {
            console.log('[useSTT] 🚪 Calling context.close()...');
            context.close().then(() => {
              console.log('[useSTT] ✅✅✅ AudioContext.close() PROMISE RESOLVED - MICROPHONE SHOULD BE RELEASED ✅✅✅');
            }).catch((err) => {
              console.error('[useSTT] ❌ Failed to close AudioContext:', err);
            });
          } else {
            console.log('[useSTT] ℹ️  AudioContext already closed');
          }
          // Note: Don't null the ref yet - cleanup will do that safely
        } else {
          console.log('[useSTT] ⚠️  No AudioContext ref');
        }

        // NOW wait for WebSocket buffer to drain before sending finalize
        const checkBufferAndFinalize = () => {
          const ws = wsRef.current;
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            return;
          }

          // Check if WebSocket send buffer is empty (all audio chunks sent)
          const bufferedAmount = ws.bufferedAmount;
          console.log('[useSTT] WebSocket bufferedAmount:', bufferedAmount);

          if (bufferedAmount === 0) {
            // Buffer is empty - all audio chunks have been sent to the server
            // NOW it's safe to send finalize
            console.log('[useSTT] Buffer drained, sending finalize to backend');
            ws.send(JSON.stringify({ type: 'finalize' }));
          } else {
            // Buffer still has data - wait a bit longer
            console.log('[useSTT] Buffer not empty, waiting...');
            setTimeout(checkBufferAndFinalize, 10);
          }
        };

        // Start checking the WebSocket buffer
        checkBufferAndFinalize();
      };

      // Now send the flush command - the callback will execute when the chunk arrives
      workletNodeRef.current.port.postMessage({ type: 'flush' });
    } else {
      // No worklet (already disconnected somehow), just send finalize
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'finalize' }));
      }
    }

    // Safety timeout: ensure cleanup happens even if 'close' event never arrives
    // This prevents resource leaks in case of network issues or backend failures
    console.log('[useSTT] ⏰ Setting 5-second safety timeout...');
    cleanupSafetyTimerRef.current = setTimeout(() => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║  ⏰ SAFETY TIMEOUT FIRED (5s)                     ║');
      console.log('║  Backend did not send "close" signal in time     ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      cleanup();
      setStatus('idle');
    }, 5000); // 5 seconds should be plenty for the backend to respond

    console.log('═══════════════════════════════════════════════════════');
    console.log('[useSTT] 🛑 STOP COMPLETE - waiting for backend close signal or timeout');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
  }, [cleanup]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Update stopRef when stop changes
  // ──────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

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
    audioLevel,
  };
}
