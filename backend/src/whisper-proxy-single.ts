import { WebSocket, RawData } from 'ws';
import OpenAI from 'openai';
import { createReadStream, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { exec } from 'child_process';
import type { Uploadable } from 'openai/uploads';

/**
 * Normalized STT Event Schema - Vendor-agnostic message format
 */
export type NormalizedSttEvent =
  | { type: 'ready' }
  | { type: 'final'; text: string }
  | { type: 'error'; code?: string; message: string }
  | { type: 'close' };

/**
 * Client control messages
 */
export type ClientControlMessage =
  | { type: 'start_session' }
  | { type: 'finalize' };

/**
 * Configuration
 */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const MAX_FRAME_SIZE = 2 * 1024 * 1024; // 2MB per frame
const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB total per connection
const IDLE_TIMEOUT = 90 * 1000; // 90 seconds
const SAMPLE_RATE = 16000; // 16kHz audio
const DEBUG_PLAYBACK = process.env.DEBUG_PLAYBACK === 'true'; // Set to 'true' to hear received audio
const DEBUG_SAVE_CHUNKS = process.env.DEBUG_SAVE_CHUNKS === 'true'; // Set to 'true' to save chunks to /tmp
let debugChunkCounter = 0; // Counter for saved debug chunks

/**
 * Initialize OpenAI client
 */
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * Convert PCM buffer to WAV format
 */
function pcmToWav(pcmBuffer: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const fileSize = 36 + dataSize;

  const wavHeader = Buffer.alloc(44);

  // RIFF chunk descriptor
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(fileSize, 4);
  wavHeader.write('WAVE', 8);

  // fmt sub-chunk
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  return Buffer.concat([wavHeader, pcmBuffer]);
}

/**
 * Debug: Play audio file using macOS's built-in afplay command
 */
function playAudioDebug(wavFilePath: string): Promise<void> {
  if (!DEBUG_PLAYBACK) {
    return Promise.resolve();
  }


  return new Promise((resolve) => {
    exec(`afplay "${wavFilePath}"`, (error, _stdout, stderr) => {
      if (error) {
        console.error('🔊 [DEBUG] ❌ Failed to play audio:', error.message);
        if (stderr) console.error('🔊 [DEBUG] stderr:', stderr);
      } else {
      }
      resolve();
    });
  });
}

/**
 * Transcribe complete audio file using GPT-4o Transcribe
 */
async function transcribeCompleteAudio(audioBuffer: Buffer): Promise<string> {
  let tempFilePath: string | null = null;

  try {

    // Convert PCM to WAV
    const wavBuffer = pcmToWav(audioBuffer, SAMPLE_RATE);

    // Debug: Save chunk to disk for manual inspection
    if (DEBUG_SAVE_CHUNKS && debugChunkCounter < 5) {
      const debugPath = join(tmpdir(), `debug_chunk_${debugChunkCounter}.wav`);
      writeFileSync(debugPath, wavBuffer);
      debugChunkCounter++;
    }

    // Write to temporary file
    tempFilePath = join(tmpdir(), `gpt4o_complete_${Date.now()}_${Math.random().toString(36).substring(2, 11)}.wav`);
    writeFileSync(tempFilePath, wavBuffer);

    // Create file stream
    const fileStream = createReadStream(tempFilePath);

    // Call GPT-4o Transcribe API with complete audio
    const response = await openai.audio.transcriptions.create({
      file: fileStream as Uploadable,
      model: 'gpt-4o-transcribe',
      language: 'en',
      response_format: 'json',
      prompt: 'Transcribe the complete speech accurately. Preserve all words and natural pauses.',
    });

    // Debug: Play the audio that was transcribed (await to prevent file deletion)
    if (DEBUG_PLAYBACK && tempFilePath) {
      await playAudioDebug(tempFilePath);
    }

    const transcription = response.text.trim();
    return transcription;
  } catch (error) {
    console.error('❌ GPT-4o Transcribe API error:', error);
    throw error;
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        unlinkSync(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Handles a single WebSocket connection - SINGLE-SEND APPROACH
 * Buffers all audio, sends once on finalize
 */
export function handleWhisperProxy(clientWs: WebSocket, request: any) {
  const origin = request.headers.origin || request.headers.referer || 'unknown';

  // Validate origin - support multiple environments
  const allowedOrigins = ALLOWED_ORIGIN.split(',').map(o => o.trim());
  const isAllowed = origin === 'unknown' || allowedOrigins.some(allowed => origin.startsWith(allowed));

  if (!isAllowed) {
    console.warn(`❌ Unauthorized origin attempt: ${origin}`);
    clientWs.send(JSON.stringify({
      type: 'error',
      code: 'UNAUTHORIZED_ORIGIN',
      message: 'Origin not allowed',
    }));
    clientWs.close(1008, 'Unauthorized origin');
    return;
  }

  if (!OPENAI_API_KEY) {
    clientWs.send(JSON.stringify({
      type: 'error',
      code: 'SERVER_CONFIG_ERROR',
      message: 'Server not properly configured',
    }));
    clientWs.close(1011, 'Server configuration error');
    return;
  }


  // Connection state - SIMPLE: just buffer everything
  let audioBuffer: Buffer = Buffer.alloc(0);
  let totalBytesReceived = 0;
  let idleTimer: NodeJS.Timeout | null = null;
  let isClosed = false;
  let currentSessionId = Date.now();

  /**
   * Cleanup function
   */
  function cleanup(reason: string) {
    if (isClosed) return;
    isClosed = true;


    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
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

  // Start idle timer
  resetIdleTimer();

  // Notify client ready
  setTimeout(() => {
    if (clientWs.readyState === WebSocket.OPEN) {
      const readyEvent: NormalizedSttEvent = { type: 'ready' };
      clientWs.send(JSON.stringify(readyEvent));
    }
  }, 100);

  /**
   * Handle messages from client
   */
  clientWs.on('message', async (data: RawData) => {
    resetIdleTimer();

    // Check for control messages
    if (typeof data === 'string' || (data instanceof Buffer && data[0] === 0x7b)) {
      try {
        const message: ClientControlMessage = JSON.parse(data.toString());

        if (message.type === 'start_session') {
          // Reset for new recording session
          currentSessionId = Date.now();
          audioBuffer = Buffer.alloc(0);
          totalBytesReceived = 0;
          return;
        }

        if (message.type === 'finalize') {

          // Process complete audio buffer
          if (audioBuffer.length > 0) {
            try {
              const transcription = await transcribeCompleteAudio(audioBuffer);

              // Send final transcript
              if (clientWs.readyState === WebSocket.OPEN) {
                const finalEvent: NormalizedSttEvent = {
                  type: 'final',
                  text: transcription,
                };
                clientWs.send(JSON.stringify(finalEvent));
              }
            } catch (error) {
              if (clientWs.readyState === WebSocket.OPEN) {
                const errorEvent: NormalizedSttEvent = {
                  type: 'error',
                  code: 'TRANSCRIPTION_FAILED',
                  message: 'Failed to transcribe audio',
                };
                clientWs.send(JSON.stringify(errorEvent));
              }
            }
          } else {
          }

          // Send close signal and wait for messages to flush before cleanup
          if (clientWs.readyState === WebSocket.OPEN) {
            const closeEvent: NormalizedSttEvent = { type: 'close' };
            clientWs.send(JSON.stringify(closeEvent));

            // Wait 100ms for WebSocket to flush the send buffer before closing
            // This prevents the race condition where close() cuts off pending messages
            setTimeout(() => {
              cleanup('Finalized');
            }, 100);
          } else {
            cleanup('Finalized');
          }
          return;
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Binary audio data - accumulate into buffer
    if (data instanceof Buffer) {
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

      // Accumulate audio data
      audioBuffer = Buffer.concat([audioBuffer, data]);

      // Log progress every 100KB
      if (audioBuffer.length % 100000 < data.length) {
        const seconds = (audioBuffer.length / 32000).toFixed(1);
      }
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
