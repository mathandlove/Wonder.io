/**
 * WaveVisualizer - Real-time audio sine wave visualization
 *
 * Displays a live sine wave that reacts to microphone input in real-time.
 * Uses Web Audio API's AnalyserNode for time-domain visualization.
 */
import React, { useEffect, useRef, useState } from 'react';
import './css/AudioVisualizer.css';

interface WaveVisualizerProps {
  /** Whether recording is active */
  isRecording: boolean;
  /** Optional className for custom styling */
  className?: string;
  /** Wave stroke color */
  waveColor?: string;
  /** Line width */
  lineWidth?: number;
  /** Amplitude multiplier */
  amplitude?: number;
  /** Smoothing factor (0-1, higher = smoother but slower response) */
  smoothing?: number;
}

export const WaveVisualizer: React.FC<WaveVisualizerProps> = ({
  isRecording,
  className = '',
  waveColor = '#4ade80',
  lineWidth = 4,
  amplitude = 30,
  smoothing = 0.7,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const smoothedDataRef = useRef<Float32Array | null>(null);
  const animationIdRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Start audio capture when recording begins
  useEffect(() => {
    if (!isRecording) {
      // Stop animation
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = 0;
      }
      // Cleanup audio resources
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      dataRef.current = null;
      smoothedDataRef.current = null;
      setHasStarted(false);
      return;
    }

    // Setup audio context and analyser
    const audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioCtxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyserRef.current = analyser;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);
    smoothedDataRef.current = new Float32Array(analyser.frequencyBinCount);

    // Get microphone access
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      // Check if we're still recording (might have stopped during async)
      if (!audioCtxRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);
      setHasStarted(true);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      function draw() {
        if (!analyserRef.current || !dataRef.current || !smoothedDataRef.current || !canvas || !ctx) {
          return;
        }

        // Update canvas size each frame to handle container resize
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        if (rect.width > 0 && rect.height > 0) {
          if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
          }

          const displayWidth = rect.width;
          const displayHeight = rect.height;

          // Reset transform and scale for HiDPI
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          analyserRef.current.getByteTimeDomainData(dataRef.current);

          // Apply smoothing (lerp between previous and current values)
          for (let i = 0; i < dataRef.current.length; i++) {
            const rawValue = dataRef.current[i] / 128.0 - 1.0;
            smoothedDataRef.current[i] = smoothedDataRef.current[i] * smoothing + rawValue * (1 - smoothing);
          }

          ctx.clearRect(0, 0, displayWidth, displayHeight);

          ctx.beginPath();
          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = waveColor;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const sliceWidth = displayWidth / smoothedDataRef.current.length;

          let x = 0;
          for (let i = 0; i < smoothedDataRef.current.length; i++) {
            const v = smoothedDataRef.current[i];
            const y = (displayHeight / 2) + v * amplitude;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
          }

          ctx.stroke();
        }

        animationIdRef.current = requestAnimationFrame(draw);
      }

      draw();
    }).catch(err => {
      console.error('WaveVisualizer: Failed to get microphone:', err);
    });

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = 0;
      }
    };
  }, [isRecording, waveColor, lineWidth, amplitude, smoothing]);

  return (
    <span className={`audio-visualizer ${className}`} style={{ display: 'flex', width: '100%', height: '100%' }}>
      {!hasStarted && (
        <span className="audio-visualizer-listening">Listening...</span>
      )}
      <canvas
        ref={canvasRef}
        className="wave-visualizer-canvas"
        style={{
          width: '100%',
          height: '100%',
          display: hasStarted ? 'block' : 'none',
        }}
      />
    </span>
  );
};
