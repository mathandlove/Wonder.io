/**
 * useSTT Hook
 *
 * Vendor-agnostic Speech-to-Text hook using OpenAI GPT-4o Transcribe via WebSocket proxy.
 * Handles microphone capture, audio encoding, and real-time transcription.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { createDebugger } from '../../../utils/createDebug';
import { API_ENDPOINTS } from '../../../config';

const debug = createDebugger('recording:transcripts');

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
  onRecordingActive?: () => void; // Called when mic is confirmed active and recording
  onNoAudioDetected?: () => void; // Called when recording had no real audio (peak level below threshold)
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
  WS_URL: API_ENDPOINTS.STT_SOCKET,
  SAMPLE_RATE: 16000, // 16kHz audio for STT
  SILENCE_THRESHOLD: 0.005, // Lower threshold for soft-spoken children (was 0.01)
  SILENCE_DURATION_MS: 20000, // Auto-stop after 20s of silence (fallback)
  AUTOSTOP_SILENCE_MS: 2000, // Auto-stop after 2s of silence AFTER speech is detected
  BUFFER_SIZE: 4096, // AudioWorklet buffer size
  // Minimum peak RMS level to consider audio was actually recorded
  // If peak never exceeds this, we assume no real audio was captured (mic blocked, silent, etc.)
  MIN_PEAK_RMS_THRESHOLD: 0.01, // Very low - just needs to show SOME audio activity
} as const;

// Detect iOS (all browsers on iOS use WebKit)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

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

  // Track if stop has been called to prevent duplicate stop calls
  const isStoppingRef = useRef<boolean>(false);

  // Track if we're waiting for a flush chunk (allows final chunk through when stopping)
  const expectingFlushRef = useRef<boolean>(false);

  // Callback to execute when flush chunk is received
  const onFlushCompleteRef = useRef<(() => void) | null>(null);

  // CRITICAL: Prevent duplicate start() calls (React StrictMode protection)
  const isStartingRef = useRef<boolean>(false);

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

  // Track peak audio level during recording session
  // Used to detect if any real audio was captured (vs silence/blocked mic)
  const peakAudioLevelRef = useRef<number>(0);

  // Track if speech has been detected during this recording session
  // Used for autostop: only trigger 1s silence timeout AFTER speech is detected
  const speechDetectedRef = useRef<boolean>(false);

  // Autostop timer - separate from main silence timer
  // Fires 1 second after last speech when autostop is enabled
  const autostopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Safety timeout to ensure cleanup happens even if 'close' event never arrives
  const cleanupSafetyTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    debug.log('🧹 [useSTT] Cleanup called');

    // Reset all state flags
    isStoppingRef.current = false;
    isStartingRef.current = false; // Reset starting flag

    // Reset flush expectation flag and callback
    expectingFlushRef.current = false;
    onFlushCompleteRef.current = null;

    // Clear audio buffer
    audioBufferRef.current = [];

    // Reset STT ready state
    isSttReadyRef.current = false;

    // Clear ALL timers
    if (flushDelayTimerRef.current) {
      clearTimeout(flushDelayTimerRef.current);
      flushDelayTimerRef.current = null;
    }

    if (autostopTimerRef.current) {
      clearTimeout(autostopTimerRef.current);
      autostopTimerRef.current = null;
    }

    // Reset speech detection state
    speechDetectedRef.current = false;

    if (cleanupSafetyTimerRef.current) {
      clearTimeout(cleanupSafetyTimerRef.current);
      cleanupSafetyTimerRef.current = null;
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

    // Stop media stream - CRITICAL for releasing microphone
    if (mediaStreamRef.current) {
      const tracks = mediaStreamRef.current.getTracks();
      debug.log(`🛑 [Cleanup] Stopping ${tracks.length} media track(s)...`);
      tracks.forEach((track) => {
        debug.log(`  Stopping track: ${track.label} (state: ${track.readyState})`);
        track.stop();
      });
      mediaStreamRef.current = null;
      debug.log('✅ [Cleanup] All media tracks stopped');
    } 

    // Close audio context - this releases the microphone indicator
    if (audioContextRef.current) {
      const context = audioContextRef.current;
      const contextState = context.state;

      if (contextState !== 'closed') {
        context.close().then(() => {
        }).catch((err) => {
          debug.error('[Cleanup] ❌ Failed to close AudioContext:', err);
        });
      } 
      audioContextRef.current = null;
    } 

  }, []);

  // ──────────────────────────────────────────────────────────────────────────────
  // Start Recording
  // ──────────────────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {

    // CRITICAL: Prevent duplicate start() calls (React StrictMode double-mount protection)
    if (isStartingRef.current) {
      debug.log('⚠️ [useSTT] start() already in progress, ignoring duplicate call');
      return;
    }

    isStartingRef.current = true;
    peakAudioLevelRef.current = 0; // Reset peak audio level for new recording session
    speechDetectedRef.current = false; // Reset speech detection for autostop
    debug.log('🎬 [useSTT] Starting recording session...');

    // CRITICAL: Clean up any existing resources before starting new recording
    // This prevents resource leaks if start() is called multiple times
    cleanup();

    // CRITICAL FIX: Wait for cleanup to complete and resources to be released
    // This ensures microphone is fully released before requesting it again
    await new Promise(resolve => setTimeout(resolve, 300)); // Increased to 300ms for full cleanup

    try {
      isStoppingRef.current = false; // Reset stopping flag when starting new recording

      setStatus('recording');
      setPartial('');
      setTranscript('');
      setError(undefined);

      // Clear audio buffer from any previous session
      audioBufferRef.current = [];

      // ═══════════════════════════════════════════════════════════════════════
      // PARALLELIZED INITIALIZATION
      // Start WebSocket AND audio capture simultaneously to minimize latency
      // ═══════════════════════════════════════════════════════════════════════


      // 1. Start WebSocket connection (non-blocking)
      debug.log('🔌 [useSTT] Attempting WebSocket connection to:', CONFIG.WS_URL);
      const ws = new WebSocket(CONFIG.WS_URL);
      wsRef.current = ws;

      // Track if we've sent start_session
      let sessionStartSent = false;
      let connectionEstablished = false;

      ws.onopen = () => {
        connectionEstablished = true;
        debug.log('✅ [useSTT] WebSocket connected successfully');
        // Signal to backend that a new session is starting (reset accumulation)
        ws.send(JSON.stringify({ type: 'start_session' }));
        sessionStartSent = true;
      };

      ws.onmessage = (event) => {
        try {
          const message: NormalizedSttEvent = JSON.parse(event.data);

          switch (message.type) {
            case 'ready':

              // IMPORTANT: Send start_session again on ready signal to ensure backend resets
              // This handles cases where the WebSocket might have been reused
              if (!sessionStartSent) {
                ws.send(JSON.stringify({ type: 'start_session' }));
                sessionStartSent = true;
              }

              // Mark as ready immediately - backend will buffer and process all audio on finalize
              isSttReadyRef.current = true;

              // Flush any buffered audio immediately
              flushBuffer(ws);
              break;

            case 'final':
              debug.log('✅ [useSTT] Received final transcription from backend:', {
                text: message.text,
                length: message.text.length,
                timestamp: new Date().toISOString(),
                peakAudioLevel: peakAudioLevelRef.current,
                minThreshold: CONFIG.MIN_PEAK_RMS_THRESHOLD
              });

              // Check if any real audio was captured during recording
              // If peak audio level never exceeded threshold, consider it "no audio"
              if (peakAudioLevelRef.current < CONFIG.MIN_PEAK_RMS_THRESHOLD) {
                debug.log('⚠️ [useSTT] No real audio detected - peak level too low:', {
                  peakLevel: peakAudioLevelRef.current,
                  threshold: CONFIG.MIN_PEAK_RMS_THRESHOLD
                });
                // Don't set transcript - invoke no audio callback instead
                setPartial('');
                if (callbacksRef.current?.onNoAudioDetected) {
                  callbacksRef.current.onNoAudioDetected();
                }
                break;
              }

              // This is the complete, finalized transcript from the entire recording
              setTranscript(message.text);
              setPartial(''); // Clear any partial text

              // Invoke callback with the final transcript
              if (callbacksRef.current?.onFinal) {
                callbacksRef.current.onFinal(message.text, message.confidence);
              }
              break;

            case 'error':
              debug.error(`ERROR: ${message.message} (code: ${message.code})`);
              setError(message.message);
              setStatus('error');
              // Invoke callback
              if (callbacksRef.current?.onError) {
                callbacksRef.current.onError(message.message);
              }
              cleanup();
              break;

            case 'close':
              debug.log('🔚 [useSTT] Received close event from backend');
              // Invoke callback to signal that transcription is complete
              if (callbacksRef.current?.onFinalized) {
                callbacksRef.current.onFinalized();
              }
              // Now cleanup all resources (transcript state is preserved as it's not touched by cleanup)
              cleanup();
              setStatus('idle');
              break;
          }
        } catch (error) {
          debug.error('[FRONTEND] Parse error:', error);
        }
      };

      ws.onerror = () => {
        const errorMsg = 'WebSocket connection failed - is backend running on port 3001?';
        debug.error('❌ [useSTT] WebSocket Connection Error - start backend with: cd backend && npm run dev');
        setError(errorMsg);
        setStatus('error');
        cleanup();
      };

      ws.onclose = (event) => {
        debug.log('🔌 [useSTT] WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          connectionEstablished: connectionEstablished,
        });

        // If connection never established, this is a connection failure
        if (!connectionEstablished) {
          const errorMsg = 'Failed to connect to backend server on port 3001';
          debug.error('❌ [useSTT] Backend Connection Failed - start backend with: cd backend && npm run dev');

          setError(errorMsg);
          setStatus('error');
          if (callbacksRef.current?.onError) {
            callbacksRef.current.onError(errorMsg);
          }
        }

        if (status === 'recording') {
          setStatus('idle');
        }
      };

      // 2. Capture microphone IN PARALLEL (this may block on user permission)
      debug.log('🎤 [useSTT] Requesting microphone access...');

      // First, list all available audio input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      debug.log('🎙️ [useSTT] Available audio input devices:', audioInputs.map(d => ({
        deviceId: d.deviceId,
        label: d.label,
        groupId: d.groupId
      })));

      // CRITICAL: Request DEFAULT microphone by NOT specifying deviceId
      // Browser will automatically use system default audio input
      // This prevents selecting wrong microphone (like AirPods when built-in mic is default)
      // NOTE: iOS/Safari requires simpler constraints - complex constraints can cause permission issues
      debug.log('🎤 [useSTT] Platform detection:', { isIOS });
      const audioConstraints = isIOS
        ? { audio: true } // iOS: use simplest constraints to avoid permission issues
        : {
            audio: {
              deviceId: 'default',      // Explicitly request default device
              noiseSuppression: false,  // Turn OFF - we do our own normalization
              echoCancellation: false,  // Turn OFF - might cause issues
              autoGainControl: false,   // Turn OFF - we do our own normalization
              sampleRate: CONFIG.SAMPLE_RATE,
            },
          };
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      mediaStreamRef.current = stream;
      const tracks = stream.getTracks();

      debug.log('🎤 [useSTT] Microphone stream created:', {
        trackCount: tracks.length,
        tracks: tracks.map(track => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings()
        }))
      });

      // CRITICAL: Wait for tracks to become unmuted (browser may take a moment to activate microphone)
      // This is a known issue where tracks report as muted immediately after getUserMedia
      const unmutedTracks = await Promise.all(tracks.map(track => {
        return new Promise<MediaStreamTrack>((resolve) => {
          if (!track.muted) {
            debug.log('✅ [useSTT] Track already unmuted:', track.label);
            resolve(track);
            return;
          }

          debug.log('⚠️ [useSTT] Track is muted, waiting for unmute...', {
            label: track.label,
            readyState: track.readyState,
            muted: track.muted
          });

          // Wait up to 2 seconds for unmute
          const timeout = setTimeout(() => {
            if (track.muted) {
              debug.error('❌ Track still muted after 2s - may be browser/system issue');
              debug.log('💡 Possible fixes:');
              debug.log('  1. Close other apps/tabs using the microphone');
              debug.log('  2. Check browser microphone permissions in Settings');
              debug.log('  3. Try refreshing the page');
              debug.log('  4. Check System Preferences > Security & Privacy > Microphone');
            }
            resolve(track);
          }, 2000);

          track.addEventListener('unmute', () => {
            debug.log('✅ [useSTT] Track unmuted!', track.label);
            clearTimeout(timeout);
            resolve(track);
          }, { once: true });
        });
      }));

      // Enable all tracks
      unmutedTracks.forEach(track => {
        if (!track.enabled) {
          track.enabled = true;
          debug.log('🔧 [useSTT] Enabled track:', track.label);
        }
      });

      // 3. Setup AudioContext
      const audioContext = new AudioContext({ sampleRate: CONFIG.SAMPLE_RATE });
      audioContextRef.current = audioContext;

      debug.log('🎧 [useSTT] AudioContext created:', {
        sampleRate: audioContext.sampleRate,
        state: audioContext.state,
        baseLatency: audioContext.baseLatency
      });

      // CRITICAL: AudioContext might be suspended, need to resume it
      if (audioContext.state === 'suspended') {
        debug.log('⚠️ [useSTT] AudioContext is suspended, resuming...');
        await audioContext.resume();
        debug.log('✅ [useSTT] AudioContext resumed, state:', audioContext.state);
      }

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      debug.log('🔌 [useSTT] MediaStreamSource created from stream');

      // DEBUG: Verify the MediaStreamAudioSourceNode is actually receiving audio
      // This is a browser issue - sometimes the stream shows as "live" but produces silence
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        debug.error('❌ NO AUDIO TRACKS in MediaStream!');
      } else {
        audioTracks.forEach((track, idx) => {
          const settings = track.getSettings();
          debug.log(`🎤 Selected Audio Track ${idx}:`, {
            id: track.id,
            label: track.label,
            deviceId: settings.deviceId,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            settings: settings
          });
          debug.log(`✅ Using microphone: "${track.label}"`);
        });
      }

      // 4. Load and setup AudioWorklet processor
      await audioContext.audioWorklet.addModule('/audio-processor.worklet.js');

      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
      workletNodeRef.current = workletNode;

      debug.log('⚙️ [useSTT] AudioWorklet processor loaded');

      // Configure silence detection parameters
      workletNode.port.postMessage({
        type: 'updateConfig',
        silenceThreshold: CONFIG.SILENCE_THRESHOLD,
        silenceDurationMs: CONFIG.SILENCE_DURATION_MS,
      });

      // Handle messages from the AudioWorklet processor
      let audioChunkCount = 0;
      workletNode.port.onmessage = (event) => {
        switch (event.data.type) {
          case 'audiodata': {
            // Only process audio if we're actively recording OR expecting the final flush
            if (isStoppingRef.current && !expectingFlushRef.current) {
              return;
            }

            const audioBuffer = event.data.buffer;
            audioChunkCount++;

            // Log first few chunks to verify data flow
            if (audioChunkCount <= 3) {
              const int16View = new Int16Array(audioBuffer);
              debug.log(`🎵 Audio chunk #${audioChunkCount}:`, {
                bufferSize: audioBuffer.byteLength,
                sampleCount: int16View.length,
                firstSamples: Array.from(int16View.slice(0, 5)),
                rms: event.data.rms,
                gain: event.data.gain,
                wsReady: ws.readyState === WebSocket.OPEN,
                sttReady: isSttReadyRef.current
              });
            }

            // If we were expecting a flush, handle it regardless of WebSocket state
            // This is critical for quick start/stop where WebSocket may not be ready yet
            if (expectingFlushRef.current) {
              expectingFlushRef.current = false;

              // Try to send the final chunk if WebSocket is ready
              if (ws.readyState === WebSocket.OPEN && isSttReadyRef.current) {
                ws.send(audioBuffer);
              }

              // Execute the callback that was set up when we sent the flush command
              if (onFlushCompleteRef.current) {
                onFlushCompleteRef.current();
                onFlushCompleteRef.current = null;
              }
              break;
            }

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

          case 'flush_complete': {
            // Worklet buffer was empty, but flush was acknowledged
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

            // AUTOSTOP: If speech was detected, start short autostop timer (1s)
            // This triggers stop after 1s of silence following speech
            if (speechDetectedRef.current && !autostopTimerRef.current) {
              debug.log('🔇 [useSTT] Speech ended, starting 1s autostop timer');
              autostopTimerRef.current = setTimeout(() => {
                debug.log('⏱️ [useSTT] Autostop triggered - 1s silence after speech');
                // Call onAutoStop callback if registered (allows orchestrator to handle state transition)
                if (callbacksRef.current?.onAutoStop) {
                  callbacksRef.current.onAutoStop();
                }
                // Then stop the recording
                stopRef.current?.();
              }, CONFIG.AUTOSTOP_SILENCE_MS);
            }
            break;
          }

          case 'long_silence': {
            // Don't process if we're already stopping
            if (isStoppingRef.current) {
              break;
            }

            // FALLBACK: 20s of continuous silence from worklet - auto-stop
            // This handles the case where user never speaks at all
            debug.log('⏱️ [useSTT] Long silence (20s) - auto-stopping');
            if (callbacksRef.current?.onAutoStop) {
              callbacksRef.current.onAutoStop();
            }
            stopRef.current?.();
            break;
          }

          case 'speech': {
            // Don't process speech detection if we're already stopping
            if (isStoppingRef.current) {
              break;
            }

            // Mark that speech has been detected in this session
            if (!speechDetectedRef.current) {
              debug.log('🎤 [useSTT] Speech detected - autostop now armed');
              speechDetectedRef.current = true;
            }

            // Clear autostop timer on speech (user is still talking)
            if (autostopTimerRef.current) {
              clearTimeout(autostopTimerRef.current);
              autostopTimerRef.current = null;
            }
            break;
          }

          case 'volumeLevel': {
            // Don't update audio level if we're already stopping
            if (isStoppingRef.current) {
              break;
            }

            // Track peak audio level (raw RMS, not scaled)
            // This is used to detect if any real audio was captured
            const rawLevel = event.data.level;
            if (rawLevel > peakAudioLevelRef.current) {
              peakAudioLevelRef.current = rawLevel;
            }

            // Update audio level for visualization
            // Scale RMS (typically 0-0.1) to 0-1 range for better visualization
            const scaledLevel = Math.min(rawLevel * 10, 1);
            setAudioLevel(scaledLevel);
            break;
          }
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      debug.log('✅ [useSTT] Audio pipeline connected:', {
        source: 'MediaStreamSource',
        processor: 'AudioWorklet',
        destination: 'AudioContext.destination',
        pipelineComplete: true
      });

      // Recording started successfully
      isStartingRef.current = false;
      debug.log('✅ [useSTT] Recording session started successfully');

      // Notify that recording is now active (mic is live)
      if (callbacksRef.current?.onRecordingActive) {
        debug.log('📢 [useSTT] Emitting onRecordingActive callback');
        callbacksRef.current.onRecordingActive();
      }

    } catch (err) {
      debug.error('[START] ❌ ERROR during start:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMsg);
      setStatus('error');
      isStartingRef.current = false; // Reset flag on error
      cleanup();
      // Notify via callback so navigation can handle the error
      if (callbacksRef.current?.onError) {
        callbacksRef.current.onError(errorMsg);
      }
    }
  }, [cleanup, flushBuffer, status]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Stop Recording
  // ──────────────────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {

    // Guard: If already stopping, don't stop again
    if (isStoppingRef.current) {
      return;
    }

    isStoppingRef.current = true;

    // Clear autostop timer to prevent it from firing during cleanup
    if (autostopTimerRef.current) {
      clearTimeout(autostopTimerRef.current);
      autostopTimerRef.current = null;
    }

    // Clear flush delay timer too
    if (flushDelayTimerRef.current) {
      clearTimeout(flushDelayTimerRef.current);
      flushDelayTimerRef.current = null;
    }

    if (mediaStreamRef.current) {
      const tracks = mediaStreamRef.current.getTracks();
      tracks.forEach(() => {
      });
    }

    setStatus('processing');

    // CRITICAL FIX: Flush the worklet buffer BEFORE stopping the audio pipeline
    // This ensures we capture any remaining audio in the worklet's partial buffer
    if (workletNodeRef.current) {
      // Set flag to allow the final flush chunk through (and ONLY that chunk)
      expectingFlushRef.current = true;

      // Set up the callback to execute when flush chunk arrives
      onFlushCompleteRef.current = () => {

        // NOW stop capturing new audio
        if (mediaStreamRef.current) {
          const tracks = mediaStreamRef.current.getTracks();
          tracks.forEach((track) => {
            track.stop();
          });
          mediaStreamRef.current = null;
        } 

        // Disconnect the source node to stop audio flowing to the worklet
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
        } 

        // Disconnect the worklet
        if (workletNodeRef.current) {
          workletNodeRef.current.disconnect();
          workletNodeRef.current = null;
        } 

        // Close AudioContext to release microphone
        if (audioContextRef.current) {
          const context = audioContextRef.current;
          const state = context.state;

          if (state !== 'closed') {
            context.close().then(() => {
            }).catch((err) => {
              debug.error('[useSTT] ❌ Failed to close AudioContext:', err);
            });
          } 
          // Note: Don't null the ref yet - cleanup will do that safely
        } 
        // NOW wait for WebSocket buffer to drain before sending finalize
        let checkAttempts = 0;
        const maxCheckAttempts = 100; // 100 * 10ms = 1 second max wait

        const checkBufferAndFinalize = () => {
          const ws = wsRef.current;
          checkAttempts++;

          // If WebSocket is not available or closed, trigger NO_AUDIO_RECORDED since we can't complete
          if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
            debug.log('⚠️ [useSTT] WebSocket not available for finalize - emitting empty transcript');
            // Trigger the final callback with empty transcript to handle gracefully
            if (callbacksRef.current?.onFinal) {
              callbacksRef.current.onFinal('');
            }
            cleanup();
            setStatus('idle');
            return;
          }

          // If still connecting, wait (but with a limit)
          if (ws.readyState === WebSocket.CONNECTING) {
            if (checkAttempts < maxCheckAttempts) {
              setTimeout(checkBufferAndFinalize, 10);
            } else {
              debug.log('⚠️ [useSTT] WebSocket never connected - emitting empty transcript');
              if (callbacksRef.current?.onFinal) {
                callbacksRef.current.onFinal('');
              }
              cleanup();
              setStatus('idle');
            }
            return;
          }

          // Check if WebSocket send buffer is empty (all audio chunks sent)
          const bufferedAmount = ws.bufferedAmount;

          if (bufferedAmount === 0) {
            // Buffer is empty - all audio chunks have been sent to the server
            // NOW it's safe to send finalize
            ws.send(JSON.stringify({ type: 'finalize' }));
          } else if (checkAttempts < maxCheckAttempts) {
            // Buffer still has data - wait a bit longer
            setTimeout(checkBufferAndFinalize, 10);
          } else {
            // Timeout waiting for buffer to drain - send finalize anyway
            debug.log('⚠️ [useSTT] Buffer drain timeout - sending finalize anyway');
            ws.send(JSON.stringify({ type: 'finalize' }));
          }
        };

        // Start checking the WebSocket buffer
        checkBufferAndFinalize();
      };

      // Now send the flush command - the callback will execute when the chunk arrives
      workletNodeRef.current.port.postMessage({ type: 'flush' });

      // CRITICAL: Add a flush timeout in case the worklet never responds
      // This can happen if stop() is called very quickly after start() before the worklet is fully initialized
      setTimeout(() => {
        if (expectingFlushRef.current && onFlushCompleteRef.current) {
          debug.log('⚠️ [useSTT] Flush timeout - worklet did not respond, forcing completion');
          expectingFlushRef.current = false;
          const callback = onFlushCompleteRef.current;
          onFlushCompleteRef.current = null;
          callback();
        }
      }, 500); // 500ms should be more than enough for worklet to respond
    } else {
      // No worklet (already disconnected somehow), just send finalize
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'finalize' }));
      }
    }

    // Safety timeout: ensure cleanup happens even if 'close' event never arrives
    // This prevents resource leaks in case of network issues or backend failures
    // IMPORTANT: Increased to 30s to accommodate DEBUG_PLAYBACK mode in backend
    // (audio playback can take 10+ seconds for long recordings)
    cleanupSafetyTimerRef.current = setTimeout(() => {
      debug.log('⚠️ [useSTT] Safety timeout fired - backend did not respond in time');
      debug.log('💡 [useSTT] This may indicate a backend issue or network problem');
      cleanup();
      setStatus('idle');
    }, 30000); // 30 seconds to allow for slow transcription + debug playback

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
