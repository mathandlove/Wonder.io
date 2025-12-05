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
  getHotspotByLabel,
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
  // Prioritize horizontal positioning for left/right hotspots to prevent overlap
  let position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

  // Check horizontal position first - this takes priority
  if (center.x > 60) {
    // Hotspot on right side - show bubble to the left
    position = 'left';
  } else if (center.x < 40) {
    // Hotspot on left side - show bubble to the right
    position = 'right';
  } else if (center.y < 30) {
    // Hotspot in top 30% (and center horizontally) - show bubble below
    position = 'bottom';
  } else if (center.y > 50) {
    // Hotspot in bottom 50% (and center horizontally) - show bubble above
    position = 'top';
  }
  // Otherwise default to bottom for center hotspots

  // For left-positioned bubbles (bubble to left of hotspot), point to the left edge of the hotspot
  // For right-positioned bubbles (bubble to right of hotspot), point to the right edge of the hotspot
  // For top/bottom, use the horizontal center
  const bubbleXPercent = position === 'left'
    ? hotspot.x  // Left edge of hotspot (bubble appears to the left, pointing right)
    : position === 'right'
      ? hotspot.x + hotspot.width  // Right edge of hotspot (bubble appears to the right, pointing left)
      : center.x;  // Center for top/bottom

  // Always use the vertical center of the hotspot for the pointer target
  // Calculate from actual polygon bounds, clamped to visible area (0-100%)
  const minY = Math.max(0, Math.min(...hotspot.points.map(p => p.y)));
  const maxY = Math.min(100, Math.max(...hotspot.points.map(p => p.y)));
  const bubbleYPercent = (minY + maxY) / 2;

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
 * Renders a separate overlay for each found clue since CSS clip-path
 * doesn't support multiple polygons
 */
interface ColoredClueRevealProps {
  coloredImageSrc: string;
  foundClues: string[];
  hotspots: Hotspot[];
  imageBounds: { width: number; height: number; left: number; top: number };
}

function ColoredClueReveal({ coloredImageSrc, foundClues, hotspots, imageBounds }: ColoredClueRevealProps) {
  if (foundClues.length === 0 || imageBounds.width === 0) {
    return null;
  }

  // Render a separate colored overlay for each found clue
  return (
    <>
      {foundClues.map((label) => {
        const hotspot = getHotspotByLabel(hotspots, label);
        if (!hotspot) {
          console.warn('[ColoredClueReveal] Hotspot not found for label:', label);
          return null;
        }

        // Build clip-path for this specific hotspot
        const points = hotspot.points
          .map(p => `${p.x}% ${p.y}%`)
          .join(', ');
        const clipPath = `polygon(${points})`;

        console.log('[ColoredClueReveal] Rendering overlay for:', label, 'clipPath:', clipPath.substring(0, 100) + '...');

        return (
          <img
            key={`colored-${hotspot.id}`}
            src={coloredImageSrc}
            alt={`Colored clue: ${label}`}
            style={{
              position: 'absolute',
              left: `${imageBounds.left}px`,
              top: `${imageBounds.top}px`,
              width: `${imageBounds.width}px`,
              height: `${imageBounds.height}px`,
              pointerEvents: 'none',
              userSelect: 'none',
              clipPath: clipPath,
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

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track when the scene becomes visible (user scrolls to it)
  // The 10-second sparkle delay should only start after visibility
  const isVisible = useSceneVisibility(containerRef, { threshold: 0.5 });

  // Get ClueStore to save clues when all are found
  const { setClues } = useClueStore();

  // Check if scene was previously completed (for backward navigation)
  const wasPreviouslyCompleted = scene.phase === 'complete';

  // Determine if all clues are found
  const isComplete = wasPreviouslyCompleted || (hotspotData && foundClues.length === hotspotData.hotspots.length);

  // Height of the clue panel + 10px gap above it
  const CLUE_PANEL_CLEARANCE = 100;

  // Update dimensions helper function
  const updateDimensions = useCallback(() => {
    if (imgRef.current && containerRef.current) {
      const natural = {
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight
      };

      // Skip if image hasn't loaded yet
      if (natural.width === 0 || natural.height === 0) {
        return;
      }

      const container = {
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      };

      // Calculate bounds with clearance for the clue panel at the bottom
      const bounds = calculateImageBounds(
        container.width,
        container.height - CLUE_PANEL_CLEARANCE,
        natural.width,
        natural.height
      );

      setImageBounds(bounds);
    }
  }, []);

  // Calculate image bounds on window resize
  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
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

        // Immediately save all clues to ClueStore for use in character-flow scenes
        // This happens regardless of whether user clicks on them
        // Strip file extension from scene.image to get just the map name (e.g., "insideBakery.jpg" -> "insideBakery")
        const mapName = (scene.image || 'insideBakery').replace(/\.(png|jpg|jpeg|webp)$/i, '');
        const clueData = scene.clueDescriptions.map(desc => ({
          hotspotName: desc.hotspotName,
          description: desc.description,
          image: desc.image,
          mapName: mapName
        }));
        console.log('[ClueImageScene] Auto-saving all clues to store on mount:', clueData);
        setClues(clueData);
      } catch (err) {
        console.error('[ClueImageScene] Failed to load hotspot data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load hotspot data');
        setIsLoading(false);
      }
    }

    loadData();
  }, [scene.image, scene.clueDescriptions, setClues]);


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

        // Check if this is the 4th (last) clue
        if (hotspotData && newFound.length === hotspotData.hotspots.length) {
          console.log('[ClueImageScene] 🎯 All clues found! Emitting ALL_CLUES_FOUND event');

          // Save clues to ClueStore for use in subsequent character-flow scenes
          // Strip file extension from scene.image to get just the map name (e.g., "insideBakery.jpg" -> "insideBakery")
          const mapName = (scene.image || 'insideBakery').replace(/\.(png|jpg|jpeg|webp)$/i, '');
          const clueData = scene.clueDescriptions.map(desc => ({
            hotspotName: desc.hotspotName,
            description: desc.description,
            image: desc.image,
            mapName: mapName
          }));
          console.log('[ClueImageScene] Saving clues to store:', clueData);
          setClues(clueData);

          // Emit event to navigation machine to update phase
          navigationBus.emit({ type: 'ALL_CLUES_FOUND' });
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

  const handleContinue = () => {
    console.log('[ClueImageScene] Continue button clicked - advancing to next scene');
    // Emit navigation event to advance to next scene
    navigationBus.emit({ type: 'CONTINUE' });
  };



  if (isLoading) {
    return (
      <div className="clue-image-scene clue-image-scene--loading">
        <p>Loading clues...</p>
      </div>
    );
  }

  if (error || !hotspotData) {
    return (
      <div className="clue-image-scene clue-image-scene--error">
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
        width: '100vw',
        height: '100vh',
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
        className="clue-counter-container"
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
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


    </div>
  );
}
