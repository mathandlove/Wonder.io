/**
 * FailDanceScene - Elaborate failure animation
 *
 * Shows an angry character jumping up and down while moving across the screen,
 * as if being moved by a wooden dowel from below. After the tantrum, the regular
 * character returns.
 *
 * Animation sequence (3.5 seconds total):
 * - Phase 1 (0-0.5s): Switch to angry character
 * - Phase 2 (0.5-2.5s): Angry character jumps and moves across screen
 * - Phase 3 (2.5-3s): Character moves off-screen
 * - Phase 4 (3-3.5s): Regular character returns
 */

import { useEffect, useState } from 'react';
import type { SceneProps } from './registry';
import type { FailDanceScene as FailDanceSceneType } from '@core/types/scene';
import './FailDanceScene.css';

export default function FailDanceScene({ scene }: SceneProps<FailDanceSceneType>) {
  const [animationPhase, setAnimationPhase] = useState<'angry' | 'dancing' | 'exiting' | 'returning'>('angry');
  const [storyId] = useState(() => {
    // Extract storyId from current URL or use default
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1] || 'gingerbread';
  });

  const side = scene.side || 'right';

  useEffect(() => {
    // Phase timing
    const timers = [
      setTimeout(() => setAnimationPhase('dancing'), 500),
      setTimeout(() => setAnimationPhase('exiting'), 2500),
      setTimeout(() => setAnimationPhase('returning'), 3000)
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

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
          top: '60vh',
          [side === 'left' ? 'left' : 'right']: '22vw',
          width: '22vw',
          height: '400px',
          transform: 'translateY(-200px)',
          transformOrigin: 'center bottom',
          zIndex: 100 // Above normal character panels
        }}
      >
        {/* Wooden dowel - moves with the container */}
        <div className="fail-dance-dowel" />

        {/* Character images - swap between angry and regular */}
        {(animationPhase === 'angry' || animationPhase === 'dancing' || animationPhase === 'exiting') && (
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

        {animationPhase === 'returning' && (
          <img
            src={getCharacterImage(scene.character)}
            alt={`${scene.character} Character`}
            className="fail-dance-character fail-dance-regular-character"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes(`${storyId}.bundle`)) {
                target.src = getFallbackImage(scene.character);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
