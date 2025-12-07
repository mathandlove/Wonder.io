import React, { useMemo } from 'react';
import type { Hotspot } from '../../../shared/types/hotspot';

// ===== CONFIGURABLE SPARKLE SETTINGS =====
// Note: This is a plain object export (not a component), placed before component exports for Fast Refresh compatibility
const SPARKLE_CONFIG = {
  // Particle appearance
  particleCount: 5,                // Number of sparkles per hotspot (less is more!)
  particleMinSize: 1,              // Minimum particle size in pixels
  particleMaxSize: 3,             // Maximum particle size in pixels
  particleColor: '#FFD700',        // Soft warm yellow (or '#FFD700' for brighter gold)
  particleOpacity: 0.7,            // Base opacity (subtle, not overpowering)

  // Animation settings
  enableTwinkle: true,             // Enable twinkle animation
  twinkleDuration: 1,              // Duration of twinkle in seconds (slow = magical)
  enableFloat: true,               // Enable floating animation
  floatDistance: 3,                // Distance to float in pixels (gentle bobbing)
  enableDrift: true,               // Enable position drift animation
  driftDuration: 8,                // Duration of drift cycle in seconds (slow = smooth)
  enableRevealCycle: true,         // Enable show/hide cycle
  revealCycleDuration: 12,         // Total duration of one show/hide cycle (seconds)
  revealVisibleRatio: 0.25,        // Fraction of time sparkles are visible (0.25 = 25% visible, 75% hidden)

  // Visual effects
  glowEffect: true,                // Add glow around particles
  glowBlur: 10,                    // Blur amount for glow effect (soft, not halo-of-doom)
  glowVariabilityMin: .5,         // Minimum glow intensity multiplier (70% of base)
  glowVariabilityMax: 2,         // Maximum glow intensity multiplier (130% of base)

  // Global toggle
  enabled: true,                   // Master switch to enable/disable all sparkles
};

interface HotspotSparklesProps {
  hotspot: Hotspot;
  hotspotIndex: number;
  totalHotspots: number;
  containerWidth: number;
  containerHeight: number;
  found?: boolean;
  initialDelaySeconds?: number; // Additional delay before sparkles start (e.g., 10 seconds at scene start or after click)
}

// Check if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(x: number, y: number, polygon: Array<{ x: number; y: number }>) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Generate random sparkle positions within polygon boundaries
function generateSparkles(
  count: number,
  containerWidth: number,
  containerHeight: number,
  hotspot: Hotspot,
  boundsX: number,
  boundsY: number,
  boundsWidth: number,
  boundsHeight: number
) {
  const sparkles = [];
  const maxAttempts = count * 10; // Prevent infinite loop
  let attempts = 0;

  // Convert polygon points from percentages of CONTAINER to absolute positions
  // Then convert to relative positions within the bounds
  const polygon = hotspot.points.map(p => {
    const absX = (p.x / 100) * containerWidth;
    const absY = (p.y / 100) * containerHeight;
    return {
      x: absX - boundsX,  // Make relative to bounds
      y: absY - boundsY,
    };
  });

  while (sparkles.length < count && attempts < maxAttempts) {
    attempts++;
    const x = Math.random() * boundsWidth;
    const y = Math.random() * boundsHeight;

    // Only add sparkle if it's inside the polygon
    if (isPointInPolygon(x, y, polygon)) {
      sparkles.push({
        id: sparkles.length,
        x,
        y,
        size: SPARKLE_CONFIG.particleMinSize +
          Math.random() * (SPARKLE_CONFIG.particleMaxSize - SPARKLE_CONFIG.particleMinSize),
        delay: Math.random() * SPARKLE_CONFIG.twinkleDuration, // Random start delay (prevents sync)
        twinkleOffset: Math.random() * SPARKLE_CONFIG.twinkleDuration, // Random twinkle phase offset
        floatOffset: Math.random() * 3, // Random float phase offset
        scale: 0.8 + Math.random() * 0.4, // Random scale variation (0.8 to 1.2)
        glowIntensity: SPARKLE_CONFIG.glowVariabilityMin +
          Math.random() * (SPARKLE_CONFIG.glowVariabilityMax - SPARKLE_CONFIG.glowVariabilityMin), // Random glow intensity
        driftVariant: Math.floor(Math.random() * 4) + 1, // Random drift animation (1-4)
      });
    }
  }

  return sparkles;
}

export const HotspotSparkles: React.FC<HotspotSparklesProps> = ({
  hotspot,
  hotspotIndex,
  totalHotspots,
  containerWidth,
  containerHeight,
  found = false,
  initialDelaySeconds = 0,
}) => {
  // Calculate hotspot bounds from bounding box
  const bounds = useMemo(() => {
    const x = (hotspot.x / 100) * containerWidth;
    const y = (hotspot.y / 100) * containerHeight;
    const width = (hotspot.width / 100) * containerWidth;
    const height = (hotspot.height / 100) * containerHeight;

    return { x, y, width, height };
  }, [hotspot, containerWidth, containerHeight]);

  // Generate sparkle positions
  const sparkles = useMemo(() =>
    generateSparkles(
      SPARKLE_CONFIG.particleCount,
      containerWidth,
      containerHeight,
      hotspot,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    ),
    [containerWidth, containerHeight, hotspot, bounds.x, bounds.y, bounds.width, bounds.height]
  );

  // Don't render sparkles if found or disabled
  if (found || !SPARKLE_CONFIG.enabled) {
    return null;
  }

  // Calculate the reveal delay for this hotspot group
  // Dynamic timing based on current unfound hotspots
  // Pattern: 1s fade in + 2s visible + 1s fade out + 2s gap = 6s per hotspot
  // Example: 4 unfound → 0s, 6s, 12s, 18s (24s cycle)
  //          3 unfound → 0s, 6s, 12s (18s cycle)
  //          2 unfound → 0s, 6s (12s cycle)
  //          1 unfound → 0s (6s cycle)
  const fadeInDuration = 1; // seconds to fade in
  const visibleDuration = 2; // seconds fully visible
  const fadeOutDuration = 1; // seconds to fade out
  const gapDuration = 2; // seconds of no sparkles between hotspots
  const totalPerHotspot = fadeInDuration + visibleDuration + fadeOutDuration + gapDuration;

  // Use current indices for dynamic timing
  const hotspotRevealDelay = hotspotIndex * totalPerHotspot;
  const cycleDuration = totalHotspots * totalPerHotspot; // Dynamic cycle duration

  // Calculate dynamic keyframe percentages based on actual time intervals
  const fadeInEndPercent = (fadeInDuration / cycleDuration) * 100;
  const visibleEndPercent = ((fadeInDuration + visibleDuration) / cycleDuration) * 100;
  const fadeOutEndPercent = ((fadeInDuration + visibleDuration + fadeOutDuration) / cycleDuration) * 100;

  // Generate unique animation name for this cycle duration
  const animationName = `sparkle-reveal-cycle-${totalHotspots}`;

  // Generate dynamic keyframes
  const keyframes = `
    @keyframes ${animationName} {
      0% {
        opacity: 0;
      }
      ${fadeInEndPercent}% {
        opacity: 1;
      }
      ${visibleEndPercent}% {
        opacity: 1;
      }
      ${fadeOutEndPercent}% {
        opacity: 0;
      }
      100% {
        opacity: 0;
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <div
        className="hotspot-sparkles"
        style={{
          position: 'absolute',
          left: `${bounds.x}px`,
          top: `${bounds.y}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
          pointerEvents: 'none',
          zIndex: 5, // Above colored clues but below hotspot overlay and dialog
        }}
      >
        {sparkles.map((sparkle) => {
          // Re-enable twinkle - now on inner div
          const twinkleAnimation = SPARKLE_CONFIG.enableTwinkle
            ? `sparkle-twinkle ${SPARKLE_CONFIG.twinkleDuration}s ease-in-out infinite`
            : 'none';

          const driftAnimation = SPARKLE_CONFIG.enableDrift
            ? `sparkle-drift-${sparkle.driftVariant} ${SPARKLE_CONFIG.driftDuration}s ease-in-out infinite`
            : 'none';

          // Inner animations (twinkle + drift)
          const innerAnimations = [twinkleAnimation, driftAnimation].filter(a => a !== 'none').join(', ');

          // Inner animation delays
          let innerAnimationDelay = '';
          if (SPARKLE_CONFIG.enableTwinkle && SPARKLE_CONFIG.enableDrift) {
            innerAnimationDelay = `${sparkle.delay}s, ${sparkle.twinkleOffset}s`;
          } else if (SPARKLE_CONFIG.enableTwinkle) {
            innerAnimationDelay = `${sparkle.delay}s`;
          } else if (SPARKLE_CONFIG.enableDrift) {
            innerAnimationDelay = `${sparkle.twinkleOffset}s`;
          }

          // Calculate variable glow based on glowIntensity
          const glowBlur = SPARKLE_CONFIG.glowBlur * sparkle.glowIntensity;
          const glowBlurInner = glowBlur / 2;
          const glowBlurOuter = glowBlur * 2;

          // Outer container style - controls reveal cycle opacity
          const containerStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${sparkle.x}px`,
            top: `${sparkle.y}px`,
            opacity: SPARKLE_CONFIG.enableRevealCycle ? 0 : 1, // Start hidden when reveal cycle is enabled
            animationName: SPARKLE_CONFIG.enableRevealCycle ? animationName : 'none',
            animationDuration: SPARKLE_CONFIG.enableRevealCycle ? `${cycleDuration}s` : undefined,
            animationTimingFunction: SPARKLE_CONFIG.enableRevealCycle ? 'linear' : undefined,
            animationIterationCount: SPARKLE_CONFIG.enableRevealCycle ? 'infinite' : undefined,
            animationDelay: SPARKLE_CONFIG.enableRevealCycle ? `${hotspotRevealDelay + initialDelaySeconds}s` : undefined,
          };

          // Inner sparkle style - controls twinkle and visual appearance
          const sparkleStyle: React.CSSProperties = {
            width: `${sparkle.size * sparkle.scale}px`,
            height: `${sparkle.size * sparkle.scale}px`,
            backgroundColor: SPARKLE_CONFIG.particleColor,
            borderRadius: '50%',
            opacity: SPARKLE_CONFIG.particleOpacity,
            boxShadow: SPARKLE_CONFIG.glowEffect
              ? `0 0 ${glowBlur}px ${glowBlurInner}px ${SPARKLE_CONFIG.particleColor}, 0 0 ${glowBlurOuter}px ${SPARKLE_CONFIG.particleColor}`
              : 'none',
            filter: SPARKLE_CONFIG.glowEffect
              ? `drop-shadow(0 0 ${glowBlur}px ${SPARKLE_CONFIG.particleColor})`
              : 'none',
            animation: innerAnimations || 'none',
            animationDelay: innerAnimationDelay,
          };

          return (
            <div
              key={sparkle.id}
              className="sparkle-container"
              style={containerStyle}
            >
              <div
                className="sparkle"
                style={sparkleStyle}
              />
            </div>
          );
        })}
      </div>
    </>
  );
};

// Export config for external modification
export { SPARKLE_CONFIG };
