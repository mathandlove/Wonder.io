/**
 * BackgroundOrchestrator - Node-based background system that shows the current scene's background
 * No longer depends on array indices, making it immune to node insertions/deletions
 */
import { useMemo, useState, useEffect } from 'react';
import { resolveBackgroundUrl } from './resolveBackgroundUrl';

interface Scene {
  type: string;
  background?: string;
  [key: string]: any;
}

interface BackgroundOrchestratorProps {
  storyId?: string;
  currentScene: Scene | null;
  navigationDirection?: 'forward' | 'backward' | 'force-forward' | 'force-backward' | 'initial' | 'scene-change';
}

export function BackgroundOrchestrator({ storyId, currentScene, navigationDirection }: BackgroundOrchestratorProps) {
  // Get the current scene's background directly - no indices needed!
  // Memoize based on actual background properties, not the entire scene object
  const currentBackground = useMemo(() => {
    if (!currentScene) return null;

    // Image scenes get comicBackground
    if (currentScene.type === 'image') {
      return {
        background: 'comicBackground',
        isImage: true
      };
    }

    // Other scenes use their background property
    if (currentScene.background) {
      return {
        background: currentScene.background,
        isImage: false
      };
    }

    return null;
  }, [currentScene?.type, currentScene?.background]);

  // Track previous and current backgrounds for cross-slide animation
  const [backgrounds, setBackgrounds] = useState<{
    previous: { background: string; isImage: boolean } | null;
    current: { background: string; isImage: boolean } | null;
    direction: 'forward' | 'backward';
  }>({
    previous: null,
    current: currentBackground,
    direction: 'forward'
  });

  // Update backgrounds when currentBackground changes
  useEffect(() => {
    // Use functional update to avoid stale closure and ensure we read latest state
    setBackgrounds(prev => {
      // Only update if background actually changed
      if (!currentBackground || currentBackground.background === prev.current?.background) {
        return prev; // No change needed
      }

      // Background changed - determine direction and update
      const isBackward = navigationDirection === 'backward' || navigationDirection === 'force-backward';

      return {
        previous: prev.current,
        current: currentBackground,
        direction: isBackward ? 'backward' : 'forward'
      };
    });
  }, [currentBackground, navigationDirection]);

  // Resolve background URLs
  const currentBackgroundImage = useMemo(() => {
    if (!backgrounds.current) return null;
    return resolveBackgroundUrl(backgrounds.current.background, backgrounds.current.isImage, storyId);
  }, [backgrounds.current, storyId]);

  const previousBackgroundImage = useMemo(() => {
    if (!backgrounds.previous) return null;
    return resolveBackgroundUrl(backgrounds.previous.background, backgrounds.previous.isImage, storyId);
  }, [backgrounds.previous, storyId]);

  // If no background, don't render anything
  if (!currentBackgroundImage) {
    return null;
  }

  return (
    <div className="story-background-layer" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -10,
      overflow: 'hidden'
    }}>
      {/* Previous background - slides out in opposite direction */}
      {previousBackgroundImage && backgrounds.previous?.background !== backgrounds.current?.background && (
        <div
          key={`prev-${backgrounds.previous?.background}`}
          className="story-background-image"
          style={{
            backgroundImage: previousBackgroundImage,
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            animation: backgrounds.direction === 'forward'
              ? 'bgSlideOutToTop 0.6s ease-out both'      // Forward: old slides up
              : 'bgSlideOutToBottom 0.6s ease-out both',  // Backward: old slides down
            zIndex: 1, // Previous background on top during exit
          }}
          data-debug={`prev-${backgrounds.previous?.background}-${backgrounds.direction}`}
        />
      )}

      {/* Current background - slides in from opposite direction (or appears instantly if first scene) */}
      <div
        key={`current-${backgrounds.current?.background}`}
        className="story-background-image"
        style={{
          backgroundImage: currentBackgroundImage,
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: !backgrounds.previous // First scene - no animation
            ? 'none'
            : (backgrounds.previous?.background !== backgrounds.current?.background
                ? (backgrounds.direction === 'forward'
                    ? 'bgSlideInFromBottom 0.6s ease-out both'   // Forward: new from bottom
                    : 'bgSlideInFromTop 0.6s ease-out both')     // Backward: new from top
                : 'none'),
          zIndex: 0, // Current background behind during transition
        }}
        data-debug={`current-${backgrounds.current?.background}-${backgrounds.direction}-first:${!backgrounds.previous}`}
      />

      <style>{`
        /* Forward navigation: new slides up from bottom, old slides up to top */
        @keyframes bgSlideInFromBottom {
          from {
            transform: translateY(100vh);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes bgSlideOutToTop {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-100vh);
          }
        }

        /* Backward navigation: new slides down from top, old slides down to bottom */
        @keyframes bgSlideInFromTop {
          from {
            transform: translateY(-100vh);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes bgSlideOutToBottom {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(100vh);
          }
        }
      `}</style>
    </div>
  );
}