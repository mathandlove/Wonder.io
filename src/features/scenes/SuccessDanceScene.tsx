/**
 * SuccessDanceScene - Celebration animation for correct answers
 *
 * Shows a happy character jumping across the screen with a wooden dowel from below.
 *
 * Animation sequence (3.5 seconds total):
 * - Phase 1 (0-3.5s): Character makes 3 jumps from off-screen right to 50vw, flips, then 3 jumps back
 * - Phase 2 (3.5s+): Character stays hidden off-screen
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import type { SceneProps } from './registry';
import type { SuccessDanceScene as SuccessDanceSceneType } from '@core/types/scene';
import { useSceneManager } from '@core/scenes/SceneManager';
import './FailDanceScene.css'; // Reuse the same CSS for now

export default function SuccessDanceScene({ scene }: SceneProps<SuccessDanceSceneType>) {
  const [storyId] = useState(() => {
    // Extract storyId from current URL or use default
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1] || 'gingerbread';
  });

  const { forceAdvanceNavigation, deleteNavigationItem, navigationIndex, getCurrentSceneId } = useSceneManager();
  const side = scene.side || 'right';
  const currentSceneId = getCurrentSceneId();

  // Track deletion state across renders
  const pendingDeletionRef = useRef<{
    successDanceIndex: number;
    navigatedForwardTo: number;
    deleted: boolean;
  } | null>(null);

  // Handle animation completion - navigate forward and schedule deletion
  const handleAnimationEnd = useCallback((e: React.AnimationEvent) => {
    // Only respond to the character container's animation ending (not sub-elements)
    if (!e.currentTarget.classList.contains('fail-dance-character-container')) return;

    console.log('[SuccessDance] 🎬 Animation ended', {
      currentSceneId,
      sceneSceneId: scene.sceneId,
      navigationIndex
    });

    // Only act if we're still on THIS success-dance scene (prevents double-trigger if user navigated away)
    if (currentSceneId !== scene.sceneId) {
      console.log('[SuccessDance] ⏭️  Skipping - already navigated away');
      return;
    }

    // Remember our current position before navigating
    const successDanceIndex = navigationIndex;
    const nextSceneIndex = navigationIndex + 1;

    console.log('[SuccessDance] ➡️  Navigating forward', {
      from: successDanceIndex,
      to: nextSceneIndex
    });

    // Navigate forward first (force to bypass navigation locks)
    forceAdvanceNavigation('forward');

    // Set up pending deletion tracking
    pendingDeletionRef.current = {
      successDanceIndex,
      navigatedForwardTo: nextSceneIndex,
      deleted: false
    };

    console.log('[SuccessDance] 📋 Deletion tracking set up', pendingDeletionRef.current);

    // Schedule deletion after 3 seconds
    setTimeout(() => {
      if (pendingDeletionRef.current && !pendingDeletionRef.current.deleted) {
        console.log('[SuccessDance] ⏰ DELETING via timeout (3s)', {
          deletingIndex: successDanceIndex
        });
        pendingDeletionRef.current.deleted = true;
        deleteNavigationItem(successDanceIndex);
      }
    }, 3000);
  }, [currentSceneId, scene.sceneId, navigationIndex, forceAdvanceNavigation, deleteNavigationItem]);

  // Watch for user scrolling backward - immediate deletion
  useEffect(() => {
    if (!pendingDeletionRef.current || pendingDeletionRef.current.deleted) return;

    const { successDanceIndex, navigatedForwardTo } = pendingDeletionRef.current;

    console.log('[SuccessDance] 📊 Navigation change detected', {
      currentNavigationIndex: navigationIndex,
      navigatedForwardTo,
      shouldDelete: navigationIndex < navigatedForwardTo
    });

    // If user scrolled backward BEFORE where we navigated forward to, delete immediately
    if (navigationIndex < navigatedForwardTo) {
      console.log('[SuccessDance] ✅ DELETING via backward scroll', {
        deletingIndex: successDanceIndex,
        userScrolledTo: navigationIndex,
        wasWaitingAt: navigatedForwardTo
      });
      pendingDeletionRef.current.deleted = true;
      deleteNavigationItem(successDanceIndex);
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

        {/* Happy character */}
        <img
          src={getCharacterImage(scene.happyCharacter)}
          alt={`${scene.happyCharacter} Character`}
          className="fail-dance-character fail-dance-angry-character"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src.includes(`${storyId}.bundle`)) {
              target.src = getFallbackImage(scene.happyCharacter);
            }
          }}
        />
      </div>
    </div>
  );
}
