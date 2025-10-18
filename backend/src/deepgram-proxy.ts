import { WebSocket, RawData } from 'ws';
import { z } from 'zod';

/**
 * Normalized STT Event Schema - Vendor-agnostic message format
 * Provides a consistent interface regardless of underlying STT provider
 */
export type NormalizedSttEvent =
  | { type: 'partial'; text: string }
  | { type: 'final'; text: string; confidence?: number }
  | { type: 'error'; code?: string; message: string }
  | { type: 'close' };

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

      // Prefer speech_final over is_final for better contextual accuracy
      // speech_final means Deepgram has refined the transcript with full utterance context
      if (transcript.speech_final) {
        return {
          type: 'final',
          text,
          confidence: alternative.confidence,
        };
      } else {
        // Show as partial even if is_final, until speech_final arrives
        return {
          type: 'partial',
          text,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Failed to normalize Deepgram message:', error);
    return null;
  }
}

/**
 * Handles a single WebSocket connection from the client
 */
export function handleDeepgramProxy(clientWs: WebSocket, request: any) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const origin = request.headers.origin || request.headers.referer || 'unknown';

  console.log(`🎤 [${requestId}] New STT connection from ${origin}`);

  // Validate origin
  if (origin !== ALLOWED_ORIGIN && origin !== 'unknown') {
    console.warn(`⚠️ [${requestId}] Rejected connection from unauthorized origin: ${origin}`);
    clientWs.send(JSON.stringify({
      type: 'error',
      code: 'UNAUTHORIZED_ORIGIN',
      message: 'Origin not allowed',
    }));
    clientWs.close(1008, 'Unauthorized origin');
    return;
  }

  if (!DEEPGRAM_API_KEY) {
    console.error(`❌ [${requestId}] DEEPGRAM_API_KEY not configured`);
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

  /**
   * Cleanup function - ensures both sockets are closed
   */
  function cleanup(reason: string) {
    if (isClosed) return;
    isClosed = true;

    console.log(`🧹 [${requestId}] Cleanup: ${reason}`);

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

    console.log(`✅ [${requestId}] Connection closed: ${reason}`);
  }

  /**
   * Reset idle timer
   */
  function resetIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }

    idleTimer = setTimeout(() => {
      console.log(`⏱️ [${requestId}] Idle timeout (${IDLE_TIMEOUT}ms)`);
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
      'model=nova-2&' +
      'punctuate=true&' +
      'smart_format=true&' +
      'encoding=linear16&' +
      'sample_rate=16000&' +
      'channels=1&' +
      'interim_results=true&' +
      'vad_events=true';

    console.log(`🔌 [${requestId}] Connecting to Deepgram...`);

    deepgramWs = new WebSocket(deepgramUrl, {
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
      },
    });

    deepgramWs.on('open', () => {
      console.log(`✅ [${requestId}] Connected to Deepgram`);
      resetIdleTimer();

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
      } catch (error) {
        console.error(`❌ [${requestId}] Error processing Deepgram message:`, error);
      }
    });

    deepgramWs.on('error', (error) => {
      console.error(`❌ [${requestId}] Deepgram WebSocket error:`, error);
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

    deepgramWs.on('close', (code, reason) => {
      console.log(`🔌 [${requestId}] Deepgram closed: ${code} - ${reason}`);
      const closeEvent: NormalizedSttEvent = { type: 'close' };
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(closeEvent));
      }
      cleanup('Deepgram closed');
    });
  }

  // Start connection to Deepgram
  connectToDeepgram();

  /**
   * Handle messages from client (audio data)
   */
  clientWs.on('message', (data: RawData) => {
    resetIdleTimer(); // Reset on activity

    // Only accept binary frames (audio data)
    if (!(data instanceof Buffer)) {
      console.warn(`⚠️ [${requestId}] Received non-binary frame, ignoring`);
      return;
    }

    // Check frame size
    if (data.length > MAX_FRAME_SIZE) {
      console.error(`❌ [${requestId}] Frame too large: ${data.length} bytes`);
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
      console.error(`❌ [${requestId}] Total bytes exceeded: ${totalBytesReceived}`);
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
    } else {
      // Queue is not implemented - just log warning
      console.warn(`⚠️ [${requestId}] Deepgram not ready, dropping ${data.length} bytes`);
    }
  });

  /**
   * Handle client disconnect
   */
  clientWs.on('close', (code, reason) => {
    console.log(`👋 [${requestId}] Client disconnected: ${code} - ${reason}`);
    cleanup('Client disconnected');
  });

  /**
   * Handle client errors
   */
  clientWs.on('error', (error) => {
    console.error(`❌ [${requestId}] Client WebSocket error:`, error);
    cleanup('Client error');
  });
}
