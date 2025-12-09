/**
 * ClueImageScene - Interactive clue-finding scene
 *
 * Displays a grayscale image with clickable hotspots. When clicked, hotspots reveal
 * colored versions and show dialog bubbles with clue descriptions.
 *
 * Flow:
 * 1. Load base grayscale image + hotspot data
 * 2. Render invisible clickable polygon overlays
 * 3. On click: reveal colored clue + show dialog
 * 4. Track found clues via clue counter
 * 5. Enable Continue button when all clues found
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SceneProps } from '@features/scenes/registry';
import type { ClueImageScene as ClueImageSceneType } from '@core/types/scene';
import { resolveStoryImage } from '@core/data/imageResolver';
import {
  loadHotspotData,
  getHotspotCenter,
  type Hotspot,
  type HotspotData,
} from '@core/data/hotspotLoader';
import { ClueCounter, type ClueCounterState } from '@core/recording/ClueCounter';
import * as navigationBus from '@core/navigation/events/navigationBus';
import { calculateImageBounds, pointsToPixels } from '@shared/utils/coordinateUtils';
import { HotspotSparkles } from './HotspotSparkles';
import { useClueStore } from '@core/data/ClueStore';
import { useSceneVisibility } from '@core/scroll/useSceneVisibility';
import { hasShown, markShown } from '@core/toast';
import { useIsMobile } from '@core/uiLayout/useIsMobile';
import './ClueImageScene.css';

/**
 * Dialog Bubble Component
 * Shows clue description text positioned relative to hotspot
 */
interface DialogBubbleProps {
  text: string;
  hotspot: Hotspot;
  onDismiss: () => void;
  imageBounds: { width: number; height: number; left: number; top: number };
}

function DialogBubble({ text, hotspot, onDismiss, imageBounds }: DialogBubbleProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bubbling to background
    onDismiss();
  };

  // Calculate position based on hotspot center - this is static based on hotspot data
  const center = getHotspotCenter(hotspot);

  // Determine best position based on hotspot location to avoid going off-screen
  // Priority: bottom 25% forces top position, then horizontal for edge hotspots
  let position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

  // Calculate actual pixel position of hotspot to check viewport bounds
  const hotspotYPixels = imageBounds.top + (center.y / 100) * imageBounds.height;
  const bubbleHeight = 150; // Approximate bubble height in pixels (increased for safety)
  const bubbleWidth = 320; // Approximate bubble width in pixels
  const hotspotXPixels = imageBounds.left + (center.x / 100) * imageBounds.width;

  // For left/right positioned bubbles, check if the bubble center would go off top of viewport
  // The bubble is vertically centered on the hotspot, so check if top half would overflow
  const wouldOverflowTop = hotspotYPixels - (bubbleHeight / 2) < 0;

  // FIRST PRIORITY: If hotspot is in bottom 25%, bubble MUST go above (north)
  if (center.y > 75) {
    position = 'top';
  }
  // Check horizontal position for left/right edge hotspots
  else if (center.x > 60) {
    // Hotspot on right side - show bubble to the left
    // But check if bubble would go off left edge OR top edge
    if (hotspotXPixels - bubbleWidth - 40 < 0 || wouldOverflowTop) {
      position = 'bottom'; // Fall back to bottom if would overflow
    } else {
      position = 'left';
    }
  } else if (center.x < 40) {
    // Hotspot on left side - show bubble to the right
    // But check if bubble would go off right edge OR top edge
    if (hotspotXPixels + bubbleWidth + 40 > window.innerWidth || wouldOverflowTop) {
      position = 'bottom'; // Fall back to bottom if would overflow
    } else {
      position = 'right';
    }
  } else if (center.y < 30) {
    // Hotspot in top 30% (and center horizontally) - show bubble below
    position = 'bottom';
  } else if (center.y > 50) {
    // Hotspot in bottom 50% (and center horizontally) - show bubble above
    // But check if bubble would go off top of viewport
    if (hotspotYPixels - bubbleHeight - 40 < 0) {
      position = 'bottom'; // Fall back to bottom if top would overflow
    } else {
      position = 'top';
    }
  }
  // Otherwise default to bottom for center hotspots

  // Always point to the center of the hotspot for all positions
  const bubbleXPercent = center.x;
  const bubbleYPercent = center.y;

  // Convert percentage positions to pixel positions relative to the image
  const bubbleX = imageBounds.left + (bubbleXPercent / 100) * imageBounds.width;
  const bubbleY = imageBounds.top + (bubbleYPercent / 100) * imageBounds.height;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${bubbleX}px`,
    top: `${bubbleY}px`,
  };

  return (
    <div
      className={`dialog-bubble dialog-bubble--${position}`}
      style={style}
      onClick={handleClick}
    >
      <div className="dialog-bubble__inner">
        <p className="dialog-bubble__text">{text}</p>
      </div>
    </div>
  );
}

/**
 * Hotspot Overlay Component
 * Renders clickable SVG polygons over the image
 */
interface HotspotOverlayProps {
  hotspots: Hotspot[];
  foundClues: string[];
  onHotspotClick: (label: string) => void;
  imageBounds: { width: number; height: number; left: number; top: number };
}

function HotspotOverlay({ hotspots, foundClues, onHotspotClick, imageBounds }: HotspotOverlayProps) {
  const handleClick = (e: React.MouseEvent, label: string) => {
    e.stopPropagation(); // Prevent event from bubbling to background
    onHotspotClick(label);
  };

  if (imageBounds.width === 0 || imageBounds.height === 0) {
    return null;
  }

  return (
    <svg
      className="hotspot-overlay"
      style={{
        position: 'absolute',
        left: imageBounds.left,
        top: imageBounds.top,
        width: imageBounds.width,
        height: imageBounds.height,
        pointerEvents: 'none',
        zIndex: 200, // Above CharacterOrchestrator (z-index: 60) and ClueCounter (z-index: 50)
      }}
    >
      {hotspots.map((hotspot) => {
        const isFound = foundClues.includes(hotspot.label);

        // Convert percentage points to pixel coordinates for rendering
        const pixelPoints = pointsToPixels(
          hotspot.points,
          imageBounds.width,
          imageBounds.height
        );

        const pathData = pixelPoints.map((point, index) =>
          `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
        ).join(' ') + ' Z';

        return (
          <path
            key={hotspot.id}
            d={pathData}
            className={`hotspot-region ${isFound ? 'hotspot-region--found' : ''}`}
            onClick={(e) => handleClick(e, hotspot.label)}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
          />
        );
      })}
    </svg>
  );
}

/**
 * Colored Clue Reveal Component
 * Shows the colored version of found clues using CSS clip-path
 * Pre-renders all hotspots as hidden overlays, then reveals them via opacity
 * This avoids image decode delay on iOS when clicking clues
 */
interface ColoredClueRevealProps {
  coloredImageSrc: string;
  foundClues: string[];
  hotspots: Hotspot[];
  imageBounds: { width: number; height: number; left: number; top: number };
}

function ColoredClueReveal({ coloredImageSrc, foundClues, hotspots, imageBounds }: ColoredClueRevealProps) {
  if (imageBounds.width === 0) {
    return null;
  }

  // Pre-render ALL hotspots as overlays, toggle visibility based on foundClues
  // This ensures the colored image is already decoded and ready
  return (
    <>
      {hotspots.map((hotspot) => {
        const isFound = foundClues.includes(hotspot.label);

        // Build clip-path for this specific hotspot
        const points = hotspot.points
          .map(p => `${p.x}% ${p.y}%`)
          .join(', ');
        const clipPath = `polygon(${points})`;

        return (
          <img
            key={`colored-${hotspot.id}`}
            src={coloredImageSrc}
            alt={`Colored clue: ${hotspot.label}`}
            style={{
              position: 'absolute',
              left: `${imageBounds.left}px`,
              top: `${imageBounds.top}px`,
              width: `${imageBounds.width}px`,
              height: `${imageBounds.height}px`,
              pointerEvents: 'none',
              userSelect: 'none',
              clipPath: clipPath,
              opacity: isFound ? 1 : 0,
              transition: 'opacity 0.15s ease-out',
            }}
          />
        );
      })}
    </>
  );
}

export default function ClueImageScene({ scene }: SceneProps<ClueImageSceneType>) {
  const [hotspotData, setHotspotData] = useState<HotspotData | null>(null);
  const [foundClues, setFoundClues] = useState<string[]>([]);
  const [activeDialog, setActiveDialog] = useState<{ hotspot: Hotspot; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0, left: 0, top: 0 });
  // Track sparkle delay - resets to 10 seconds at scene start and after each clue click
  const [sparkleDelayKey, setSparkleDelayKey] = useState(0); // Increment to force re-render with fresh delay
  // Toast state for first-time guidance
  const [showDiscoveryToast, setShowDiscoveryToast] = useState(false);
  // Toast state for "scroll down to continue" on mobile after all clues found
  const [showScrollDownToast, setShowScrollDownToast] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track when the scene becomes visible (user scrolls to it)
  // The 10-second sparkle delay should only start after visibility
  const isVisible = useSceneVisibility(containerRef, { threshold: 0.5 });

  // Get ClueStore to register clues by map name
  const { registerClues } = useClueStore();

  // Detect mobile for left-side clue panel layout
  const isMobile = useIsMobile();

  // Check if scene was previously completed (for backward navigation)
  const wasPreviouslyCompleted = scene.phase === 'complete';

  // Determine if all clues are found - use scene.clueDescriptions.length as the source of truth
  // (hotspotData may have more hotspots than the scene uses)
  const isComplete = wasPreviouslyCompleted || (foundClues.length === scene.clueDescriptions.length);

  // Update dimensions - same pattern as MapScene
  const updateDimensions = useCallback(() => {
    if (imgRef.current && containerRef.current) {
      const natural = {
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight
      };

      if (natural.width === 0 || natural.height === 0) {
        return;
      }

      const container = {
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      };

      // On desktop, leave 100px clearance for the clue panel at bottom
      const bounds = calculateImageBounds(
        container.width,
        isMobile ? container.height : container.height - 100,
        natural.width,
        natural.height
      );

      setImageBounds(bounds);
    }
  }, [isMobile]);

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    // Call immediately to handle isMobile changes
    updateDimensions();
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Derive image name from scene data and immediately save all clues to store
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        // Extract image name from scene.image or derive from hotspot data
        // For insideBakery example: /stories/gingerbread.bundle/images/clues/insideBakery.png
        const imageName = scene.image
          ? scene.image.split('/').pop()?.replace(/\.(jpg|jpeg|png|webp)$/i, '') || 'insideBakery'
          : 'insideBakery';

        const data = await loadHotspotData(imageName);

        setHotspotData(data);
        setIsLoading(false);

        // Register all clues to ClueStore under the map name for use in character-flow scenes
        // This happens regardless of whether user clicks on them
        // Strip file extension from scene.image to get just the map name (e.g., "insideBakery.jpg" -> "insideBakery")
        const mapName = (scene.image || 'insideBakery').replace(/\.(png|jpg|jpeg|webp)$/i, '');
        const clueData = scene.clueDescriptions.map(desc => ({
          hotspotName: desc.hotspotName,
          description: desc.description,
          image: desc.image,
          mapName: mapName
        }));
        console.log('[ClueImageScene] Registering clues for map:', mapName, clueData);
        // Use setTimeout to avoid setState during render cycle
        setTimeout(() => registerClues(mapName, clueData), 0);
      } catch (err) {
        console.error('[ClueImageScene] Failed to load hotspot data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load hotspot data');
        setIsLoading(false);
      }
    }

    loadData();
  }, [scene.image, scene.clueDescriptions, registerClues]);


  const handleHotspotClick = (label: string) => {
    console.log('[ClueImageScene] Hotspot clicked:', label);
    const hotspot = hotspotData?.hotspots.find(h => h.label === label);
    if (!hotspot) {
      console.warn('[ClueImageScene] Hotspot not found in data:', label);
      return;
    }

    // Find matching clue description
    const clueDesc = scene.clueDescriptions.find(
      c => c.hotspotName.toLowerCase() === label.toLowerCase()
    );
    if (!clueDesc) {
      console.warn('[ClueImageScene] No clue description found for:', label);
      return;
    }

    // If clicking the same hotspot that's already showing, dismiss the dialog
    if (activeDialog && activeDialog.hotspot.label === label) {
      console.log('[ClueImageScene] Dismissing dialog for:', label);
      setActiveDialog(null);
      return;
    }

    // Mark as found if not already
    if (!foundClues.includes(label)) {
      console.log('[ClueImageScene] Marking clue as found:', label);
      // Reset sparkle delay to 10 seconds after each click
      setSparkleDelayKey(prev => prev + 1);
      setFoundClues(prev => {
        const newFound = [...prev, label];
        console.log('[ClueImageScene] Updated foundClues:', newFound);

        // Check if all clues are now found - use scene.clueDescriptions.length as source of truth
        if (newFound.length === scene.clueDescriptions.length) {
          console.log('[ClueImageScene] 🎯 All clues found! Emitting ALL_CLUES_FOUND event');
          // Emit event to navigation machine to update phase
          // Use setTimeout to avoid "Cannot update component while rendering" warning
          setTimeout(() => navigationBus.emit({ type: 'ALL_CLUES_FOUND' }), 0);
        }

        return newFound;
      });
    } else {
      console.log('[ClueImageScene] Clue already found:', label);
    }

    // Show dialog (or switch to this one if another is active)
    setActiveDialog({ hotspot, text: clueDesc.dialog || clueDesc.description });
  };

  const handleDismissDialog = () => {
    setActiveDialog(null);
  };

  const handleBackgroundClick = () => {
    // Dismiss dialog when clicking the background
    setActiveDialog(null);
  };

  // Watch for when all clues are found AND dialog is dismissed - show scroll toast on mobile
  useEffect(() => {
    if (isMobile && isComplete && !activeDialog && !wasPreviouslyCompleted) {
      setShowScrollDownToast(true);
      const timer = setTimeout(() => setShowScrollDownToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isMobile, isComplete, activeDialog, wasPreviouslyCompleted]);

  const handleContinue = () => {
    console.log('[ClueImageScene] Continue button clicked - advancing to next scene');
    // Emit navigation event to advance to next scene
    navigationBus.emit({ type: 'CONTINUE' });
  };

  // Show discovery toast when scene becomes visible (first time only)
  useEffect(() => {
    console.log('[ClueImageScene Toast] isVisible:', isVisible, '| wasPreviouslyCompleted:', wasPreviouslyCompleted, '| hasShown:', hasShown('clue-image:discovery'));

    if (isVisible && !wasPreviouslyCompleted && !hasShown('clue-image:discovery')) {
      console.log('[ClueImageScene Toast] Showing toast in 800ms');
      const showTimer = setTimeout(() => {
        markShown('clue-image:discovery');
        setShowDiscoveryToast(true);
        console.log('[ClueImageScene Toast] Toast shown!');
      }, 800);

      const hideTimer = setTimeout(() => {
        setShowDiscoveryToast(false);
        console.log('[ClueImageScene Toast] Toast hidden');
      }, 800 + 5000); // delay + duration

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [isVisible, wasPreviouslyCompleted]);

  if (isLoading) {
    return (
      <div ref={containerRef} className="clue-image-scene clue-image-scene--loading">
        <p>Loading clues...</p>
      </div>
    );
  }

  if (error || !hotspotData) {
    return (
      <div ref={containerRef} className="clue-image-scene clue-image-scene--error">
        <p>Error loading clues: {error}</p>
      </div>
    );
  }

  // Derive image paths
  // If scene.image is provided, it should be the path relative to images/ directory
  // The image name may or may not include the extension
  const imageName = scene.image || 'insideBakery.jpg';
  // Check if the image name already has an extension
  const hasExtension = /\.(png|jpg|jpeg|webp)$/i.test(imageName);
  const fullImageName = hasExtension ? imageName : `${imageName}.png`;

  const baseImageSrc = resolveStoryImage(`clues/${fullImageName}`);
  const coloredImageSrc = baseImageSrc.replace('/clues/', '/cluesColored/');

  // If previously completed, show all clues as found
  const displayFoundClues = wasPreviouslyCompleted
    ? hotspotData.hotspots.map(h => h.label)
    : foundClues;

  // Build clue counter state
  const clueCounterState: ClueCounterState = {
    hotspots: hotspotData.hotspots,
    foundClues: displayFoundClues,
    totalClues: hotspotData.hotspots.length,
    coloredImageSrc,
  };

  return (
    <div
      ref={containerRef}
      className="clue-image-scene construction-paper-bg"
      onClick={handleBackgroundClick}
      style={{
        position: 'relative',
        width: '100svw',
        height: '100svh',
        overflow: 'hidden',
      }}
    >
      {/* Image wrapper - positioned exactly where the image renders */}
      <div
        style={{
          position: 'absolute',
          left: `${imageBounds.left}px`,
          top: `${imageBounds.top}px`,
          width: `${imageBounds.width}px`,
          height: `${imageBounds.height}px`,
          pointerEvents: 'none',
        }}
      >
        {/* Base grayscale image (or colored if completed) */}
        <img
          ref={imgRef}
          src={wasPreviouslyCompleted ? coloredImageSrc : baseImageSrc}
          alt="Clue scene"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
          }}
          onLoad={() => {
            updateDimensions();
          }}
        />
      </div>

      {/* Colored clue reveals (only show if not fully colored) */}
      {!wasPreviouslyCompleted && (
        <ColoredClueReveal
          coloredImageSrc={coloredImageSrc}
          foundClues={displayFoundClues}
          hotspots={hotspotData.hotspots}
          imageBounds={imageBounds}
        />
      )}

      {/* Sparkle hints for unfound hotspots - positioned absolutely within viewport */}
      {/* Only render sparkles once the scene is visible (user has scrolled to it) */}
      {!wasPreviouslyCompleted && imageBounds.width > 0 && isVisible && (
        <div
          style={{
            position: 'absolute',
            left: `${imageBounds.left}px`,
            top: `${imageBounds.top}px`,
            width: `${imageBounds.width}px`,
            height: `${imageBounds.height}px`,
            pointerEvents: 'none',
          }}
        >
          {(() => {
            // Filter to only unfound hotspots - timing will dynamically adjust based on remaining clues
            const unfoundHotspots = hotspotData.hotspots
              .filter((hotspot) => !displayFoundClues.includes(hotspot.label));

            return unfoundHotspots.map((hotspot, unfoundIndex) => (
              <HotspotSparkles
                key={`sparkles-${hotspot.id}-${sparkleDelayKey}`}
                hotspot={hotspot}
                hotspotIndex={unfoundIndex}
                totalHotspots={unfoundHotspots.length}
                containerWidth={imageBounds.width}
                containerHeight={imageBounds.height}
                found={false}
                initialDelaySeconds={10}
              />
            ));
          })()}
        </div>
      )}

      {/* Hotspot overlay (disabled if completed) */}
      {!wasPreviouslyCompleted && (
        <HotspotOverlay
          hotspots={hotspotData.hotspots}
          foundClues={displayFoundClues}
          onHotspotClick={handleHotspotClick}
          imageBounds={imageBounds}
        />
      )}

      {/* Dialog bubble */}
      {activeDialog && (
        <DialogBubble
          key={activeDialog.hotspot.id}
          text={activeDialog.text}
          hotspot={activeDialog.hotspot}
          onDismiss={handleDismissDialog}
          imageBounds={imageBounds}
        />
      )}

      {/* Clue Counter Panel */}
      <div
        className={`clue-counter-container ${isMobile ? 'clue-counter-container--mobile-left' : ''}`}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 150, // Above dialog bubble (z-index: 100) so Continue button is always clickable
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ClueCounter
          state={clueCounterState}
          onContinue={handleContinue}
          disabled={!isComplete}
        />
      </div>

      {/* First-time toast: "Click on the clues hidden in the picture." */}
      {showDiscoveryToast && (
        <div
          className="discovery-toast"
          onClick={() => setShowDiscoveryToast(false)}
        >
          Click on the {scene.clueDescriptions.length} clues hidden in the picture.
        </div>
      )}

      {/* Scroll down toast for mobile after all clues found */}
      {showScrollDownToast && (
        <div
          className="scroll-down-toast"
          onClick={() => setShowScrollDownToast(false)}
        >
          <div className="scroll-down-content">
            <div className="scroll-finger-container">
              <svg
                className="scroll-finger-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2C10.9 2 10 2.9 10 4V12.5L8.35 10.85C7.76 10.26 6.81 10.26 6.22 10.85C5.63 11.44 5.63 12.39 6.22 12.98L10.58 17.34C11.36 18.12 12.64 18.12 13.42 17.34L17.78 12.98C18.37 12.39 18.37 11.44 17.78 10.85C17.19 10.26 16.24 10.26 15.65 10.85L14 12.5V4C14 2.9 13.1 2 12 2Z"
                  fill="currentColor"
                />
                <path
                  d="M12 20C12 20.55 12.45 21 13 21H11C11.55 21 12 20.55 12 20Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <span className="scroll-down-text">Scroll Down to Continue</span>
          </div>
        </div>
      )}
    </div>
  );
}
