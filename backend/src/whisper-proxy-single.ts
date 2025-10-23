import { WebSocket, RawData } from 'ws';
import OpenAI from 'openai';
import { createReadStream, unlinkSync, writeFileSync, mkdirSync, existsSync } from 'fs';
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
const DEBUG_SAVE_CHUNKS = process.env.DEBUG_SAVE_CHUNKS === 'true'; // Set to 'true' to save audio files
let debugChunkCounter = 0; // Counter for saved debug chunks

// Debug audio storage directory - relative to backend folder
const DEBUG_AUDIO_DIR = join(__dirname, '..', 'debug-audio');

// Create debug directory if it doesn't exist
if (DEBUG_SAVE_CHUNKS && !existsSync(DEBUG_AUDIO_DIR)) {
  mkdirSync(DEBUG_AUDIO_DIR, { recursive: true });
  console.log('📁 [DEBUG] Created debug audio directory:', DEBUG_AUDIO_DIR);
}

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

  console.log('🔊 [DEBUG] Playing received audio:', wavFilePath);

  return new Promise((resolve) => {
    exec(`afplay "${wavFilePath}"`, (error, _stdout, stderr) => {
      if (error) {
        console.error('🔊 [DEBUG] ❌ Failed to play audio:', error.message);
        if (stderr) console.error('🔊 [DEBUG] stderr:', stderr);
      } else {
        console.log('🔊 [DEBUG] ✅ Audio playback completed');
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

    // Debug: Save audio to disk for manual inspection (overwrites previous recording)
    if (DEBUG_SAVE_CHUNKS) {
      const debugPath = join(DEBUG_AUDIO_DIR, 'latest-recording.wav');
      writeFileSync(debugPath, wavBuffer);
      const durationSeconds = (audioBuffer.length / (SAMPLE_RATE * 2)).toFixed(2);
      console.log('💾 [DEBUG] Saved audio file (overwritten):', debugPath);
      console.log('💾 [DEBUG] Duration:', durationSeconds + 's');
      console.log('💾 [DEBUG] You can play this file with: afplay backend/debug-audio/latest-recording.wav');
    }

    // Write to temporary file
    tempFilePath = join(tmpdir(), `gpt4o_complete_${Date.now()}_${Math.random().toString(36).substring(2, 11)}.wav`);
    writeFileSync(tempFilePath, wavBuffer);

    // Create file stream
    const fileStream = createReadStream(tempFilePath);

    // Log what we're sending to OpenAI
    const durationSeconds = (audioBuffer.length / (SAMPLE_RATE * 2)).toFixed(2); // 16-bit = 2 bytes per sample
    console.log('🎙️  Sending audio to OpenAI Transcription API:', {
      model: 'gpt-4o-transcribe',
      audioFormat: 'WAV (16kHz, mono, 16-bit PCM)',
      originalPcmSize: `${audioBuffer.length} bytes`,
      wavFileSize: `${wavBuffer.length} bytes`,
      duration: `${durationSeconds}s`,
      tempFilePath: tempFilePath,
      language: 'en',
      timestamp: new Date().toISOString()
    });

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

    // Log the transcription result received from OpenAI
    console.log('✅ Transcription received from OpenAI:', {
      transcribedText: transcription,
      textLength: transcription.length,
      wordCount: transcription.split(/\s+/).filter(w => w.length > 0).length,
      timestamp: new Date().toISOString()
    });

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
      console.log('📡 [WebSocket] Ready signal sent to client');
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
          console.log('🎤 [Finalize] Received finalize command');
          const durationSeconds = (audioBuffer.length / 32000).toFixed(2);
          console.log(`📊 [Audio Buffer] Size: ${audioBuffer.length} bytes (${durationSeconds}s at 16kHz mono)`);
          console.log(`🔊 [Audio Buffer] DEBUG_PLAYBACK is ${DEBUG_PLAYBACK ? 'ENABLED' : 'DISABLED'} - ${DEBUG_PLAYBACK ? 'Audio will play after transcription' : 'Set DEBUG_PLAYBACK=true in .env to enable'}`);

          // Process complete audio buffer
          if (audioBuffer.length > 0) {
            try {
              const transcription = await transcribeCompleteAudio(audioBuffer);

              // CRITICAL: Check WebSocket state BEFORE and AFTER transcription
              const readyStateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
              const stateName = readyStateNames[clientWs.readyState] || 'UNKNOWN';
              console.log(`🔍 [WebSocket] State after transcription: ${stateName} (${clientWs.readyState})`);

              // Send final transcript
              if (clientWs.readyState === WebSocket.OPEN) {
                const finalEvent: NormalizedSttEvent = {
                  type: 'final',
                  text: transcription,
                };
                console.log('📤 [WebSocket] Sending transcription to frontend:', {
                  transcription: transcription,
                  textLength: transcription.length,
                  wordCount: transcription.split(/\s+/).filter(w => w.length > 0).length,
                  timestamp: new Date().toISOString()
                });
                clientWs.send(JSON.stringify(finalEvent));
                console.log('✅ [WebSocket] Transcription sent successfully');
              } else {
                console.error(`❌ [WebSocket] CANNOT SEND - WebSocket is ${stateName}! Transcription lost:`, transcription);
                console.error('💡 [WebSocket] This usually means the frontend closed the connection while waiting for transcription');
              }
            } catch (error) {
              console.error('❌ [Transcription] Error during transcription:', error);
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
            console.warn('⚠️ [Audio Buffer] No audio data to transcribe');
          }

          // Send close signal and wait for messages to flush before cleanup
          if (clientWs.readyState === WebSocket.OPEN) {
            const closeEvent: NormalizedSttEvent = { type: 'close' };
            console.log('🔚 [WebSocket] Sending close event to frontend');
            clientWs.send(JSON.stringify(closeEvent));
            console.log('✅ [WebSocket] Close event sent, checking buffer...');

            // CRITICAL FIX: Wait for WebSocket send buffer to actually be empty
            // The bufferedAmount property tells us how many bytes are still queued
            const waitForBufferFlush = () => {
              const bufferedAmount = clientWs.bufferedAmount;
              console.log(`📊 [WebSocket] Buffer status: ${bufferedAmount} bytes remaining`);

              if (bufferedAmount === 0) {
                // Buffer is empty - all messages have been sent
                console.log('✅ [WebSocket] Buffer is empty, safe to cleanup');
                cleanup('Finalized');
              } else {
                // Buffer still has data - wait a bit longer
                console.log(`⏳ [WebSocket] Waiting for ${bufferedAmount} bytes to flush...`);
                setTimeout(waitForBufferFlush, 10);
              }
            };

            // Start checking the buffer
            waitForBufferFlush();
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
        console.log(`⏱️  [Progress] Accumulated ${seconds}s of audio`);
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
