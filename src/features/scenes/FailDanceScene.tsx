/**
 * FailDanceScene - Elaborate failure animation
 *
 * Shows an angry character jumping across the screen with a wooden dowel from below.
 *
 * Animation sequence (3.5 seconds total):
 * - Phase 1 (0-3.5s): Character makes 3 jumps from off-screen right to 50vw, flips, then 3 jumps back
 * - Phase 2 (3.5s+): Character stays hidden off-screen
 */

import { useEffect, useState } from 'react';
import type { SceneProps } from './registry';
import type { FailDanceScene as FailDanceSceneType } from '@core/types/scene';
import { useSceneManager } from '@core/scenes/SceneManager';
import './FailDanceScene.css';

export default function FailDanceScene({ scene }: SceneProps<FailDanceSceneType>) {
  const [animationPhase, setAnimationPhase] = useState<'dancing' | 'exiting'>('dancing');
  const [storyId] = useState(() => {
    // Extract storyId from current URL or use default
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1] || 'gingerbread';
  });

  const { advanceNavigation } = useSceneManager();
  const side = scene.side || 'right';

  useEffect(() => {
    // Phase timing - start dancing immediately, then navigate back after animation completes
    const timers = [
      setTimeout(() => setAnimationPhase('exiting'), 3500), // Hide after 3.5s dancing animation
      setTimeout(() => {
        // Navigate back one step
        advanceNavigation('backward');
      }, 3600) // 100ms after exiting phase starts
    ];

    return () => timers.forEach(clearTimeout);
  }, [advanceNavigation]);

  // Image paths with cache busting
  const version = `v${Date.now()}`;
  const getCharacterImage = (characterName: string) => {
    return `/stories/${storyId}.bundle/images/characters/${characterName}.sticker-cardboard-3d.webp?${version}`;
  };

  const getFallbackImage = (characterName: string) => {
    return `/assets.core/images/characters/${characterName}.sticker-cardboard-3d.webp?${version}`;
  };

  return (
    <div className="fail-dance-scene" style={{
      height: '100vh',
      width: '100vw',
      position: 'relative',
      overflow: 'hidden',
      pointerEvents: 'none', // Let clicks pass through
      background: 'transparent' // Transparent so Leo underneath shows through
    }}>
      {/* NO LEFT CHARACTER - Leo stays in his panel from the previous scene */}

      {/* Animated character container - ONLY the right side character that moves */}
      {/* The container itself moves with the dowel and character as one unit */}
      <div
        className={`fail-dance-character-container fail-dance-${side} fail-dance-phase-${animationPhase}`}
        style={{
          position: 'absolute',
          top: '30vh',
          'right': '-35vw',
          width: '22vw',
          height: '400px',
          transform: 'translateX(0)',
          transformOrigin: 'left bottom',
          zIndex: 100 // Above normal character panels
        }}
      >
        {/* Wooden dowel - moves with the container */}
        <div className="fail-dance-dowel" />

        {/* Angry character - shows only during dancing phase */}
        {animationPhase === 'dancing' && (
          <img
            src={getCharacterImage(scene.angryCharacter)}
            alt={`${scene.angryCharacter} Character`}
            className="fail-dance-character fail-dance-angry-character"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes(`${storyId}.bundle`)) {
                target.src = getFallbackImage(scene.angryCharacter);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
