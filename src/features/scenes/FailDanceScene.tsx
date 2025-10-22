/**
 * FailDanceScene - Elaborate failure animation
 *
 * Shows an angry character jumping across the screen with a wooden dowel from below.
 *
 * Animation sequence (3.5 seconds total):
 * - Phase 1 (0-3.5s): Character makes 3 jumps from off-screen right to 50vw, flips, then 3 jumps back
 * - Phase 2 (3.5s+): Character stays hidden off-screen
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import type { SceneProps } from './registry';
import type { FailDanceScene as FailDanceSceneType } from '@core/types/scene';
import { useSceneManager } from '@core/scenes/SceneManager';
import './FailDanceScene.css';

export default function FailDanceScene({ scene }: SceneProps<FailDanceSceneType>) {
  const [storyId] = useState(() => {
    // Extract storyId from current URL or use default
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1] || 'gingerbread';
  });

  const { advanceNavigation, deleteNavigationItem, navigationIndex, getCurrentSceneId } = useSceneManager();
  const side = scene.side || 'right';
  const currentSceneId = getCurrentSceneId();

  // Track deletion state across renders
  const pendingDeletionRef = useRef<{
    failDanceIndex: number;
    navigatedBackTo: number;
    deleted: boolean;
  } | null>(null);

  // Handle animation completion - navigate back and schedule deletion
  const handleAnimationEnd = useCallback((e: React.AnimationEvent) => {
    // Only respond to the character container's animation ending (not sub-elements)
    if (!e.currentTarget.classList.contains('fail-dance-character-container')) return;

    console.log('[FailDance] 🎬 Animation ended', {
      currentSceneId,
      sceneSceneId: scene.sceneId,
      navigationIndex
    });

    // Only act if we're still on THIS fail-dance scene (prevents double-trigger if user navigated away)
    if (currentSceneId !== scene.sceneId) {
      console.log('[FailDance] ⏭️  Skipping - already navigated away');
      return;
    }

    // Remember our current position before navigating
    const failDanceIndex = navigationIndex;
    const previousSceneIndex = navigationIndex - 1;

    console.log('[FailDance] ⬅️  Navigating backward', {
      from: failDanceIndex,
      to: previousSceneIndex
    });

    // Navigate back first
    advanceNavigation('backward');

    // Set up pending deletion tracking
    pendingDeletionRef.current = {
      failDanceIndex,
      navigatedBackTo: previousSceneIndex,
      deleted: false
    };

    console.log('[FailDance] 📋 Deletion tracking set up', pendingDeletionRef.current);

    // Schedule deletion after 3 seconds
    setTimeout(() => {
      if (pendingDeletionRef.current && !pendingDeletionRef.current.deleted) {
        console.log('[FailDance] ⏰ DELETING via timeout (3s)', {
          deletingIndex: failDanceIndex
        });
        pendingDeletionRef.current.deleted = true;
        deleteNavigationItem(failDanceIndex);
      }
    }, 3000);
  }, [currentSceneId, scene.sceneId, navigationIndex, advanceNavigation, deleteNavigationItem]);

  // Watch for user scrolling forward - immediate deletion
  useEffect(() => {
    if (!pendingDeletionRef.current || pendingDeletionRef.current.deleted) return;

    const { failDanceIndex, navigatedBackTo } = pendingDeletionRef.current;

    console.log('[FailDance] 📊 Navigation change detected', {
      currentNavigationIndex: navigationIndex,
      navigatedBackTo,
      shouldDelete: navigationIndex > navigatedBackTo
    });

    // If user scrolled forward PAST where we navigated back to, delete immediately
    if (navigationIndex > navigatedBackTo) {
      console.log('[FailDance] ✅ DELETING via forward scroll', {
        deletingIndex: failDanceIndex,
        userScrolledTo: navigationIndex,
        wasWaitingAt: navigatedBackTo
      });
      pendingDeletionRef.current.deleted = true;
      deleteNavigationItem(failDanceIndex);
    }
  }, [navigationIndex, deleteNavigationItem]);

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
