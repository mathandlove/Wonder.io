/**
 * AudioWorklet Processor for Real-time Audio Processing
 *
 * This processor runs on a separate high-priority audio thread,
 * avoiding main thread blocking and providing better performance
 * than the deprecated ScriptProcessorNode.
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Buffer size for processing (matches previous ScriptProcessorNode config)
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;

    // Silence detection configuration
    this.silenceThreshold = 0.01; // RMS threshold
    this.silenceDurationSamples = 16000; // 1 second at 16kHz
    this.silenceCounter = 0;

    // Listen for messages from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'updateConfig') {
        this.silenceThreshold = event.data.silenceThreshold || this.silenceThreshold;
        this.silenceDurationSamples = event.data.silenceDurationMs
          ? (event.data.silenceDurationMs * sampleRate) / 1000
          : this.silenceDurationSamples;
      } else if (event.data.type === 'flush') {
        // Flush any remaining audio in the buffer
        this.flushBuffer();
      }
    };
  }

  /**
   * Flush any remaining audio in the buffer
   * Called when recording stops to ensure the last partial chunk is sent
   */
  flushBuffer() {
    if (this.bufferIndex > 0) {
      // Create a trimmed buffer with only the accumulated samples
      const partialBuffer = this.buffer.slice(0, this.bufferIndex);
      const int16Data = this.convertFloat32ToInt16(partialBuffer);

      // Send the final partial chunk
      this.port.postMessage({
        type: 'audiodata',
        buffer: int16Data.buffer,
        rms: this.calculateRMS(partialBuffer)
      }, [int16Data.buffer]);

      // Reset buffer
      this.bufferIndex = 0;
      this.buffer = new Float32Array(this.bufferSize);
    }
  }

  /**
   * Calculate RMS (Root Mean Square) for voice activity detection
   */
  calculateRMS(audioData) {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  /**
   * Convert Float32 audio data to Int16 PCM format
   */
  convertFloat32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  /**
   * Process audio in 128-sample quantum chunks
   * This is called for every audio quantum by the Web Audio API
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];

    // If no input, keep processor alive
    if (!input || !input[0]) {
      return true;
    }

    const inputChannel = input[0]; // Get first (mono) channel

    // Calculate RMS for silence detection
    const rms = this.calculateRMS(inputChannel);
    const isSilence = rms < this.silenceThreshold;

    // Track silence duration
    if (isSilence) {
      this.silenceCounter += inputChannel.length;

      // Send silence event when threshold is reached
      if (this.silenceCounter >= this.silenceDurationSamples) {
        this.port.postMessage({ type: 'silence' });
        this.silenceCounter = 0; // Reset to prevent repeated messages
      }
    } else {
      // Reset silence counter on speech activity
      if (this.silenceCounter > 0) {
        this.port.postMessage({ type: 'speech' });
        this.silenceCounter = 0;
      }
    }

    // Send RMS level updates for visualization (every quantum)
    this.port.postMessage({
      type: 'volumeLevel',
      level: rms
    });

    // Accumulate audio into buffer
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];

      // When buffer is full, convert and send to main thread
      if (this.bufferIndex >= this.bufferSize) {
        const int16Data = this.convertFloat32ToInt16(this.buffer);

        // Send audio data to main thread
        this.port.postMessage({
          type: 'audiodata',
          buffer: int16Data.buffer,
          rms: rms
        }, [int16Data.buffer]); // Transfer ownership for performance

        // Reset buffer
        this.bufferIndex = 0;
        this.buffer = new Float32Array(this.bufferSize);
      }
    }

    // Keep the processor alive
    return true;
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);
