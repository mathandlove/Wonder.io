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
  }, [currentScene]);

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
    if (currentBackground && currentBackground.background !== backgrounds.current?.background) {
      // Determine direction: backward if navigationDirection contains 'backward', else forward
      const isBackward = navigationDirection === 'backward' || navigationDirection === 'force-backward';

      setBackgrounds({
        previous: backgrounds.current,
        current: currentBackground,
        direction: isBackward ? 'backward' : 'forward'
      });
    }
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
              ? 'slideOutToTop 0.6s ease-out forwards'      // Forward: old slides up
              : 'slideOutToBottom 0.6s ease-out forwards'   // Backward: old slides down
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
                    ? 'slideInFromBottom 0.6s ease-out forwards'   // Forward: new from bottom
                    : 'slideInFromTop 0.6s ease-out forwards')     // Backward: new from top
                : 'none')
        }}
        data-debug={`current-${backgrounds.current?.background}-${backgrounds.direction}-first:${!backgrounds.previous}`}
      />

      <style>{`
        /* Forward navigation: new slides up from bottom, old slides up to top */
        @keyframes slideInFromBottom {
          from {
            transform: translateY(100vh);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes slideOutToTop {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-100vh);
          }
        }

        /* Backward navigation: new slides down from top, old slides down to bottom */
        @keyframes slideInFromTop {
          from {
            transform: translateY(-100vh);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes slideOutToBottom {
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