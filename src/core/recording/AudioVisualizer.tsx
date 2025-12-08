/**
 * AudioVisualizer - Real-time audio level visualization
 *
 * Shows "Listening..." text until sound is detected, then displays dots that
 * animate in a left-to-right triggered wave pattern based on voice activity.
 */
import React, { useEffect, useRef, useState } from 'react';
import './css/AudioVisualizer.css';

interface AudioVisualizerProps {
  /** Current audio level (0-1), where 0 is silence and 1 is max volume */
  audioLevel: number;
  /** Optional className for custom styling */
  className?: string;
  /** Mode: 'listening' shows "Listening...", 'processing' shows "Processing..." */
  mode?: 'listening' | 'processing';
  /** Number of dots to display */
  dotCount?: number;
  /** Maximum amplitude in pixels */
  maxAmplitudePx?: number;
  /** Delay between dots in seconds */
  dotDelaySec?: number;
  /** Wave frequency (omega) in radians/second */
  omega?: number;
  /** Dot radius in pixels */
  dotRadius?: number;
  /** Dot color */
  color?: string;
  /** Reseed interval in milliseconds */
  reseedMs?: number;
}

const SOUND_THRESHOLD = 0.05; // Minimum level to switch from "Listening..." to dots
const ATTACK_THRESHOLD = 0.035; // RMS threshold to trigger wave
const RELEASE_THRESHOLD = 0.02; // RMS threshold to stop wave
const RELEASE_DURATION_MS = 200; // How long below release threshold before stopping

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioLevel,
  className = '',
  mode = 'listening',
  dotCount = 5,
  maxAmplitudePx = 16, // Increased by ~30% (12 * 1.33 ≈ 16)
  dotDelaySec = 0.08, // 80ms between dots
  omega = 7.5, // radians/sec (half speed = slower, more visible oscillation)
  dotRadius = 3, // Halved from 6px to 3px
  color = '#4a4a4a',
  reseedMs = 500 // Increased to allow full propagation (5 dots × 80ms = 400ms minimum)
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasSoundDetected, setHasSoundDetected] = useState(false);

  // Animation state refs
  const rafRef = useRef<number>(0);
  const rmsRef = useRef(0);

  // Voice activity detection
  const speakingRef = useRef(false);
  const belowReleaseTimeRef = useRef(0);

  // Wave management - single continuous wave
  const waveStartTimeRef = useRef<number | null>(null);
  const targetAmplitudeRef = useRef(0); // Target amplitude for smooth decay
  const currentAmplitudeRef = useRef(0); // Current amplitude with smoothing

  // Track if we've detected any sound yet
  useEffect(() => {
    if (!hasSoundDetected && audioLevel > SOUND_THRESHOLD) {
      setHasSoundDetected(true);
    }
  }, [audioLevel, hasSoundDetected]);

  // Animation loop
  useEffect(() => {
    if (!hasSoundDetected) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const centerY = height / 2;
    const spacing = width / dotCount; // Spread evenly across full width

    // Use the prop amplitude, but cap it to fit within canvas if needed
    const maxFit = (height / 2) - dotRadius - 2; // Max that fits in canvas
    const effectiveMaxAmplitude = Math.min(maxAmplitudePx, maxFit); // Use smaller of prop vs fit

    const animate = (currentTime: number) => {
      const now = currentTime / 1000; // Convert to seconds

      // Smooth RMS (lerp)
      const targetRms = audioLevel;
      rmsRef.current = rmsRef.current + (targetRms - rmsRef.current) * 0.15;

      // Voice activity detection with hysteresis
      if (!speakingRef.current) {
        // Attack: silence → speech
        if (rmsRef.current > ATTACK_THRESHOLD) {
          speakingRef.current = true;
          // Start continuous wave
          if (waveStartTimeRef.current === null) {
            waveStartTimeRef.current = now;
          }

          // Set target amplitude - very sensitive: whisper = 80%, loud = 100%
          // Use aggressive curve: any sound above threshold quickly jumps to ~80%
          const rawNorm = Math.max(0, Math.min(1, (rmsRef.current - 0.02) / 0.18));
          const boostedNorm = 0.8 + (rawNorm * 0.2); // Map 0-1 to 0.8-1.0
          targetAmplitudeRef.current = boostedNorm * effectiveMaxAmplitude;

        }
      } else {
        // Release: speech → silence
        if (rmsRef.current < RELEASE_THRESHOLD) {
          belowReleaseTimeRef.current += (1 / 60); // Approximate frame time
          if (belowReleaseTimeRef.current >= RELEASE_DURATION_MS / 1000) {
            speakingRef.current = false;
            belowReleaseTimeRef.current = 0;
            // Start amplitude decay to zero
            targetAmplitudeRef.current = 0;
          }
        } else {
          belowReleaseTimeRef.current = 0;

          // Continuously update target amplitude - very sensitive: whisper = 80%, loud = 100%
          const rawNorm = Math.max(0, Math.min(1, (rmsRef.current - 0.02) / 0.18));
          const boostedNorm = 0.8 + (rawNorm * 0.2); // Map 0-1 to 0.8-1.0
          targetAmplitudeRef.current = boostedNorm * effectiveMaxAmplitude;
        }
      }

      // Start wave if not started yet (for initial animation)
      if (waveStartTimeRef.current === null) {
        waveStartTimeRef.current = now;
      }

      // Smooth amplitude transitions (lerp toward target)
      currentAmplitudeRef.current = currentAmplitudeRef.current + (targetAmplitudeRef.current - currentAmplitudeRef.current) * 0.1;

      const amplitudePx = currentAmplitudeRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw dots with continuous wave propagation
      for (let i = 0; i < dotCount; i++) {
        const x = (i + 0.5) * spacing; // Center dots in their segments

        // Calculate time since wave started with per-dot delay
        const t_i = now - waveStartTimeRef.current - i * dotDelaySec;

        let yOffset = 0;

        if (t_i >= 0) {
          // Wave has reached this dot - continuous oscillation
          // Use -cos to start at peak (going up first)
          // -cos oscillates from -1 to +1
          // We want: silence (amplitude=0) → stays at -1 (bottom)
          //          sound (amplitude>0) → oscillates from -1 to +1 (or beyond)
          // Formula: yOffset = -cos(t) * amplitude - (maxAmplitude - amplitude)
          // This shifts baseline down so at amplitude=0, dot sits at -maxAmplitude
          const waveValue = -Math.cos(omega * t_i); // -1 to +1
          yOffset = waveValue * amplitudePx + (effectiveMaxAmplitude - amplitudePx);
        } else {
          // Wave hasn't reached this dot yet - start at bottom
          yOffset = effectiveMaxAmplitude;
        }

        const y = centerY + yOffset;

        // Draw dot with constant color
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [hasSoundDetected, audioLevel, dotCount, maxAmplitudePx, dotDelaySec, omega, dotRadius, color, reseedMs]);

  // Determine text to display based on mode
  const placeholderText = mode === 'processing' ? 'Processing...' : 'Listening...';

  // In processing mode, always show text (never show dots)
  // In listening mode, show text until sound is detected, then show dots
  const showText = mode === 'processing' || !hasSoundDetected;

  return (
    <span className={`audio-visualizer ${className}`}>
      {showText ? (
        <span className="audio-visualizer-listening">{placeholderText}</span>
      ) : (
        <canvas
          ref={canvasRef}
          className="audio-visualizer-canvas"
          style={{ width: `${dotCount * 12}px`, height: '100%' }}
        />
      )}
    </span>
  );
};
