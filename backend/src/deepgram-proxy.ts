import { WebSocket, RawData } from 'ws';
import { z } from 'zod';

/**
 * Normalized STT Event Schema - Vendor-agnostic message format
 * Provides a consistent interface regardless of underlying STT provider
 */
export type NormalizedSttEvent =
  | { type: 'ready' } // Signals that Deepgram is connected and ready to receive audio
  | { type: 'partial'; text: string }
  | { type: 'final'; text: string; confidence?: number }
  | { type: 'error'; code?: string; message: string }
  | { type: 'close' }; // Signals Deepgram closed after sending finals

/**
 * Client control messages - sent from frontend to backend
 */
export type ClientControlMessage =
  | { type: 'finalize' }; // Request graceful finalization (send CloseStream to Deepgram)

/**
 * Deepgram response schema validation
 */
const DeepgramTranscriptSchema = z.object({
  channel: z.object({
    alternatives: z.array(
      z.object({
        transcript: z.string(),
        confidence: z.number().optional(),
      })
    ),
  }),
  is_final: z.boolean(),
  speech_final: z.boolean().optional(),
});

const DeepgramMessageSchema = z.object({
  type: z.string(),
  channel_index: z.array(z.number()).optional(),
  duration: z.number().optional(),
  start: z.number().optional(),
  is_final: z.boolean().optional(),
  speech_final: z.boolean().optional(),
  channel: z.any().optional(),
});

/**
 * Configuration
 */
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const MAX_FRAME_SIZE = 2 * 1024 * 1024; // 2MB per frame
const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB total per connection
const IDLE_TIMEOUT = 60 * 1000; // 60 seconds
const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds

/**
 * Normalizes Deepgram messages into vendor-agnostic format
 */
function normalizeDeepgramMessage(message: any): NormalizedSttEvent | null {
  try {
    const parsed = DeepgramMessageSchema.parse(message);

    // Handle metadata messages (connection established, etc.)
    if (parsed.type === 'Metadata') {
      return null; // Don't forward metadata to client
    }

    // Handle Results messages (transcripts)
    if (parsed.type === 'Results' && parsed.channel) {
      const transcript = DeepgramTranscriptSchema.parse(message);
      const alternative = transcript.channel.alternatives[0];

      if (!alternative || !alternative.transcript) {
        return null; // Empty transcript
      }

      const text = alternative.transcript.trim();
      if (!text) {
        return null; // Ignore empty strings
      }

      // Use is_final for accumulation - this fires for each finalized segment during speech
      // speech_final only fires after endpointing (500ms silence), which is too late
      // We need to accumulate as the user speaks, not wait for long pauses
      if (transcript.is_final) {
        return {
          type: 'final',
          text,
          confidence: alternative.confidence,
        };
      } else {
        // Interim results (partial transcripts that may change)
        return {
          type: 'partial',
          text,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Handles a single WebSocket connection from the client
 */
export function handleDeepgramProxy(clientWs: WebSocket, request: any) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const origin = request.headers.origin || request.headers.referer || 'unknown';

  // Validate origin
  if (origin !== ALLOWED_ORIGIN && origin !== 'unknown') {
    clientWs.send(JSON.stringify({
      type: 'error',
      code: 'UNAUTHORIZED_ORIGIN',
      message: 'Origin not allowed',
    }));
    clientWs.close(1008, 'Unauthorized origin');
    return;
  }

  if (!DEEPGRAM_API_KEY) {
    clientWs.send(JSON.stringify({
      type: 'error',
      code: 'SERVER_CONFIG_ERROR',
      message: 'Server not properly configured',
    }));
    clientWs.close(1011, 'Server configuration error');
    return;
  }

  // Connection state
  let deepgramWs: WebSocket | null = null;
  let totalBytesReceived = 0;
  let idleTimer: NodeJS.Timeout | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let isClosed = false;
  let isFinalizing = false; // Track if we're waiting to send 'finalized' event

  /**
   * Cleanup function - ensures both sockets are closed
   */
  function cleanup(reason: string) {
    if (isClosed) return;
    isClosed = true;

    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
      deepgramWs.close(1000, 'Client disconnected');
      deepgramWs = null;
    }

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1000, reason);
    }
  }

  /**
   * Reset idle timer
   */
  function resetIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }

    idleTimer = setTimeout(() => {
      const errorEvent: NormalizedSttEvent = {
        type: 'error',
        code: 'IDLE_TIMEOUT',
        message: 'Connection idle for too long',
      };
      clientWs.send(JSON.stringify(errorEvent));
      cleanup('Idle timeout');
    }, IDLE_TIMEOUT);
  }

  /**
   * Connect to Deepgram
   */
  function connectToDeepgram() {
    const deepgramUrl =
      'wss://api.deepgram.com/v1/listen?' +
      'model=nova-2-general&' +   // Nova-2 General model - best accuracy for varied speakers
      'punctuate=true&' +
      'smart_format=true&' +
      'encoding=linear16&' +
      'sample_rate=16000&' +
      'channels=1&' +
      'interim_results=true&' +
      'vad_events=true&' +
      'endpointing=500&' +         // 500ms of silence to finalize utterances quickly
      'language=en';                // Explicitly set language for better accuracy

    deepgramWs = new WebSocket(deepgramUrl, {
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
      },
    });

    deepgramWs.on('open', () => {
      resetIdleTimer();

      // Notify client that Deepgram is ready to receive audio
      if (clientWs.readyState === WebSocket.OPEN) {
        const readyEvent: NormalizedSttEvent = {
          type: 'ready',
        };
        clientWs.send(JSON.stringify(readyEvent));
      }

      // Start heartbeat
      heartbeatInterval = setInterval(() => {
        if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
          // Deepgram expects KeepAlive message
          deepgramWs.send(JSON.stringify({ type: 'KeepAlive' }));
        }
      }, HEARTBEAT_INTERVAL);
    });

    deepgramWs.on('message', (data: RawData) => {
      try {
        const message = JSON.parse(data.toString());
        const normalized = normalizeDeepgramMessage(message);

        if (normalized && clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify(normalized));
          resetIdleTimer(); // Reset on activity
        }
      } catch {
        // Silently handle parse errors
      }
    });

    deepgramWs.on('error', () => {
      const errorEvent: NormalizedSttEvent = {
        type: 'error',
        code: 'UPSTREAM_ERROR',
        message: 'Deepgram connection failed',
      };
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(errorEvent));
      }
      cleanup('Deepgram error');
    });

    deepgramWs.on('close', () => {
      if (isFinalizing) {
        // Expected close after CloseStream - finals have been sent
        // Send close to client so it can transition to ai-waiting
        const closeEvent: NormalizedSttEvent = { type: 'close' };
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify(closeEvent));
        }
        // Client will close its connection, triggering cleanup via client close handler
      } else {
        // Unexpected close - send close and cleanup
        const closeEvent: NormalizedSttEvent = { type: 'close' };
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify(closeEvent));
        }
        cleanup('Deepgram closed unexpectedly');
      }
    });
  }

  // Start connection to Deepgram
  connectToDeepgram();

  /**
   * Handle messages from client (audio data or control messages)
   */
  clientWs.on('message', (data: RawData) => {
    resetIdleTimer(); // Reset on activity

    // Check if this is a text message (control command)
    if (typeof data === 'string' || (data instanceof Buffer && data[0] === 0x7b)) { // 0x7b is '{'
      try {
        const message: ClientControlMessage = JSON.parse(data.toString());

        if (message.type === 'finalize') {
          // Send CloseStream to Deepgram to get final transcripts
          // Deepgram will send finals then close - we'll forward the close to client
          if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
            isFinalizing = true; // Mark that we're finalizing (close will be sent to client)
            deepgramWs.send(JSON.stringify({ type: 'CloseStream' }));
          }
          return;
        }
      } catch {
        // Silently handle parse errors
      }
    }

    // Only accept binary frames (audio data)
    if (!(data instanceof Buffer)) {
      return;
    }

    // Check frame size
    if (data.length > MAX_FRAME_SIZE) {
      const errorEvent: NormalizedSttEvent = {
        type: 'error',
        code: 'FRAME_TOO_LARGE',
        message: `Frame size ${data.length} exceeds limit ${MAX_FRAME_SIZE}`,
      };
      clientWs.send(JSON.stringify(errorEvent));
      cleanup('Frame size exceeded');
      return;
    }

    // Check total bytes
    totalBytesReceived += data.length;
    if (totalBytesReceived > MAX_TOTAL_BYTES) {
      const errorEvent: NormalizedSttEvent = {
        type: 'error',
        code: 'TOTAL_BYTES_EXCEEDED',
        message: `Total bytes ${totalBytesReceived} exceeds limit ${MAX_TOTAL_BYTES}`,
      };
      clientWs.send(JSON.stringify(errorEvent));
      cleanup('Total bytes exceeded');
      return;
    }

    // Forward to Deepgram if connected
    if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
      deepgramWs.send(data);
    }
  });

  /**
   * Handle client disconnect
   */
  clientWs.on('close', () => {
    cleanup('Client disconnected');
  });

  /**
   * Handle client errors
   */
  clientWs.on('error', () => {
    cleanup('Client error');
  });
}
