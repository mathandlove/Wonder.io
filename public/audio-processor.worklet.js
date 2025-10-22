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

    // Dynamic normalization configuration
    // Optimized for soft-spoken children on varied devices (iPads, Chromebooks, MacBooks)
    this.targetRMS = 0.15; // Target RMS level (comfortable speaking volume)
    this.minRMS = 0.005; // Below this is considered silence/noise
    this.maxGain = 8.0; // Maximum amplification (boost quiet speech significantly)
    this.minGain = 0.5; // Minimum gain (slight reduction for very loud speech)
    this.currentGain = 1.0; // Current gain multiplier
    this.gainSmoothingFactor = 0.95; // Smooth gain changes (prevents sudden volume jumps)

    // RMS history for lookahead analysis (prevents clipping on sudden loud sounds)
    this.rmsHistory = [];
    this.rmsHistorySize = 10; // Track last 10 chunks (~80ms of audio)

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
        rms: this.calculateRMS(partialBuffer),
        gain: this.currentGain
      }, [int16Data.buffer]);

      // Reset buffer and gain state
      this.bufferIndex = 0;
      this.buffer = new Float32Array(this.bufferSize);
      this.currentGain = 1.0; // Reset gain for next recording session
      this.rmsHistory = []; // Clear RMS history
    } else {
      // Buffer is empty, but still send acknowledgment that flush completed
      // This ensures the main thread's callback always executes
      this.port.postMessage({
        type: 'flush_complete'
      });
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
   * Normalize audio using dynamic gain control
   * Optimized for soft-spoken users on varied devices
   */
  normalizeAudio(audioData) {
    const rms = this.calculateRMS(audioData);

    // Track RMS history for lookahead analysis
    this.rmsHistory.push(rms);
    if (this.rmsHistory.length > this.rmsHistorySize) {
      this.rmsHistory.shift();
    }

    // Calculate average RMS over recent history (smoother gain adjustment)
    const avgRMS = this.rmsHistory.reduce((sum, val) => sum + val, 0) / this.rmsHistory.length;

    // Skip normalization for silence/noise (prevents amplifying background noise)
    if (avgRMS < this.minRMS) {
      return audioData;
    }

    // Calculate desired gain to reach target RMS
    const desiredGain = this.targetRMS / avgRMS;

    // Clamp gain to safe range
    const clampedGain = Math.max(this.minGain, Math.min(this.maxGain, desiredGain));

    // Smooth gain changes to prevent audible artifacts
    this.currentGain = this.gainSmoothingFactor * this.currentGain +
                       (1 - this.gainSmoothingFactor) * clampedGain;

    // Apply gain with soft clipping to prevent distortion
    const normalized = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      const amplified = audioData[i] * this.currentGain;
      // Soft clipping using tanh (sounds more natural than hard clipping)
      normalized[i] = Math.tanh(amplified * 0.9); // 0.9 factor prevents hitting ±1.0
    }

    return normalized;
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

    // Normalize input audio before buffering (boost soft speech)
    const normalizedInput = this.normalizeAudio(inputChannel);

    // Accumulate audio into buffer
    for (let i = 0; i < normalizedInput.length; i++) {
      this.buffer[this.bufferIndex++] = normalizedInput[i];

      // When buffer is full, convert and send to main thread
      if (this.bufferIndex >= this.bufferSize) {
        const int16Data = this.convertFloat32ToInt16(this.buffer);

        // Send audio data to main thread
        this.port.postMessage({
          type: 'audiodata',
          buffer: int16Data.buffer,
          rms: rms,
          gain: this.currentGain // Send gain for debugging/monitoring
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
