/**
 * FailDanceScene - Elaborate failure animation
 *
 * Shows an angry character jumping across the screen with a wooden dowel from below.
 *
 * Animation sequence (3.5 seconds total):
 * - Phase 1 (0-3.5s): Character makes 3 jumps from off-screen right to 50vw, flips, then 3 jumps back
 * - Phase 2 (3.5s+): Character stays hidden off-screen
 */

import { useCallback, useState, useRef } from 'react';
import type { SceneProps } from './registry';
import type { FailDanceScene as FailDanceSceneType } from '@core/types/scene';
import { getCurrentNode, getCurrentNodeId } from '@core/navigation/navigationHelpers';
import * as navigationBus from '@core/navigation/events/navigationBus';
import './FailDanceScene.css';

export default function FailDanceScene({ scene }: SceneProps<FailDanceSceneType>) {
  const [storyId] = useState(() => {
    // Extract storyId from current URL or use default
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1] || 'gingerbread';
  });

  const side = scene.side || 'right';
  const currentNode = getCurrentNode();
  const currentNodeId = getCurrentNodeId();
  const currentSceneId = currentNode?.sceneId;

  // Track deletion state across renders
  const pendingDeletionRef = useRef<{
    failDanceNodeId: string;
    deleted: boolean;
  } | null>(null);

  // Handle animation completion - emit event to navigation machine
  const handleAnimationEnd = useCallback((e: React.AnimationEvent) => {
    // Only respond to the character container's animation ending (not sub-elements)
    if (!e.currentTarget.classList.contains('fail-dance-character-container')) return;

    // Only act if we're still on THIS fail-dance scene (prevents double-trigger if user navigated away)
    if (currentSceneId !== scene.sceneId) {
      return;
    }

    // Only act if we have a current node ID
    if (!currentNodeId) return;

    // Remember our current node for deletion tracking
    const failDanceNodeId = currentNodeId;

    // Set up pending deletion tracking
    pendingDeletionRef.current = {
      failDanceNodeId,
      deleted: false
    };

    // Emit VIDEO_COMPLETE event to navigation machine
    // Machine will handle navigation back and phase reset
    console.log('[FailDanceScene] 🎬 Animation complete - emitting VIDEO_COMPLETE event');
    navigationBus.emit({
      type: 'VIDEO_COMPLETE',
      nodeId: failDanceNodeId,
      videoType: 'fail-dance'
    });

    // Note: fail-dance scene deletion is now handled by the machine
    // The scene can be safely deleted after user navigates away
  }, [currentSceneId, scene.sceneId, currentNodeId]);

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
        className={`fail-dance-character-container fail-dance-${side} fail-dance-phase-dancing`}
        onAnimationEnd={handleAnimationEnd}
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

        {/* Angry character */}
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
      </div>
    </div>
  );
}
