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
import { useMachine } from '@xstate/react';
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
import { clueImageSceneMachine } from './clueImageSceneMachine';
import { calculateImageBounds, pointsToPixels } from '@shared/utils/coordinateUtils';
import './ClueImageScene.css';

/**
 * Dialog Bubble Component
 * Shows clue description text positioned relative to hotspot
 */
interface DialogBubbleProps {
  text: string;
  hotspot: Hotspot;
  onDismiss: () => void;
}

function DialogBubble({ text, hotspot, onDismiss }: DialogBubbleProps) {
  // Fixed position - always show bubble below the hotspot
  const position = 'bottom';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bubbling to background
    onDismiss();
  };

  // Calculate position based on hotspot center - this is static based on hotspot data
  const center = getHotspotCenter(hotspot);
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${center.x}%`,
    top: `${center.y}%`,
  };

  return (
    <div
      className={`dialog-bubble dialog-bubble--${position}`}
      style={style}
      onClick={handleClick}
    >
      <p className="dialog-bubble__text">{text}</p>
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
    console.log('[ColoredClueReveal] Not rendering - foundClues:', foundClues.length, 'imageBounds.width:', imageBounds.width);
    return null;
  }

  console.log('[ColoredClueReveal] Rendering colored overlays for:', foundClues);

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
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if scene was previously completed (for backward navigation)
  const wasPreviouslyCompleted = scene.phase === 'complete';

  // Initialize state machine
  const [state, send] = useMachine(clueImageSceneMachine, {
    input: {
      totalClues: hotspotData?.hotspots.length || 0,
      foundClues: wasPreviouslyCompleted ? (hotspotData?.hotspots.length || 0) : foundClues.length,
    },
  });

  const isComplete = state.matches('complete') || wasPreviouslyCompleted;

  // Update dimensions helper function
  const updateDimensions = useCallback(() => {
    if (imgRef.current && containerRef.current) {
      const natural = {
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight
      };

      // Skip if image hasn't loaded yet
      if (natural.width === 0 || natural.height === 0) {
        console.log('[ClueImageScene] Skipping bounds calculation - image not loaded yet');
        return;
      }

      const container = {
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      };

      // Calculate where the image will render with object-contain behavior
      const bounds = calculateImageBounds(
        container.width,
        container.height,
        natural.width,
        natural.height
      );

      console.log('[ClueImageScene] Updating image bounds:', bounds);
      setNaturalDimensions(natural);
      setImageBounds(bounds);
    }
  }, []);

  // Calculate image bounds on window resize
  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Derive image name from scene data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        // Extract image name from scene.image or derive from hotspot data
        // For insideBakery example: /stories/gingerbread.bundle/images/clues/insideBakery.png
        const imageName = scene.image
          ? scene.image.split('/').pop()?.replace(/\.(jpg|png|webp)$/, '') || 'insideBakery'
          : 'insideBakery';

        console.log('[ClueImageScene] Loading hotspot data for:', imageName);

        const data = await loadHotspotData(imageName);
        console.log('[ClueImageScene] Hotspot data loaded:', data);

        setHotspotData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('[ClueImageScene] Failed to load hotspot data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load hotspot data');
        setIsLoading(false);
      }
    }

    loadData();
  }, [scene.image]);

  // Check if all clues are found and notify state machine
  useEffect(() => {
    if (hotspotData && foundClues.length === hotspotData.hotspots.length && foundClues.length > 0) {
      send({ type: 'ALL_CLUES_FOUND' });
    }
  }, [foundClues, hotspotData, send]);

  const handleHotspotClick = (label: string) => {
    console.log('[ClueImageScene] Hotspot clicked:', label);
    const hotspot = hotspotData?.hotspots.find(h => h.label === label);
    if (!hotspot) {
      console.warn('[ClueImageScene] Hotspot not found in data:', label);
      return;
    }

    // Find matching clue description
    const clueDesc = scene.clueDescriptions.find(
      c => c.hotspot.toLowerCase() === label.toLowerCase()
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
      setFoundClues(prev => {
        const newFound = [...prev, label];
        console.log('[ClueImageScene] Updated foundClues:', newFound);
        return newFound;
      });
      // Notify state machine
      send({ type: 'CLUE_FOUND', clueLabel: label });
    } else {
      console.log('[ClueImageScene] Clue already found:', label);
    }

    // Show dialog (or switch to this one if another is active)
    setActiveDialog({ hotspot, text: clueDesc.dialog });
  };

  const handleDismissDialog = () => {
    setActiveDialog(null);
  };

  const handleBackgroundClick = () => {
    // Dismiss dialog when clicking the background
    setActiveDialog(null);
  };

  const handleContinue = () => {
    // Send CONTINUE event to state machine
    send({ type: 'CONTINUE' });
  };

  // Listen to navigation events and forward to state machine
  useEffect(() => {
    const unsubscribe = navigationBus.subscribe((event) => {
      if (event.type === 'SCROLL_DOWN_STEP' || event.type === 'SCROLL_UP_STEP') {
        // Forward scroll events to state machine
        send(event);
      }
    });

    return unsubscribe;
  }, [send]);

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
  // e.g., "insideBakery" becomes "/stories/gingerbread.bundle/images/clues/insideBakery.png"
  const baseImageSrc = scene.image
    ? resolveStoryImage(`clues/${scene.image}.png`)
    : resolveStoryImage('clues/insideBakery.png');

  const coloredImageSrc = baseImageSrc.replace('/clues/', '/cluesColored/');

  console.log('[ClueImageScene] Image paths:', {
    sceneImage: scene.image,
    baseImageSrc,
    coloredImageSrc,
    wasPreviouslyCompleted
  });

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
      className="clue-image-scene"
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
            console.log('[ClueImageScene] Image loaded, calculating bounds');
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

      {/* Hotspot overlay (disabled if completed) */}
      {!wasPreviouslyCompleted && (
        <HotspotOverlay
          hotspots={hotspotData.hotspots}
          foundClues={displayFoundClues}
          onHotspotClick={handleHotspotClick}
          imageBounds={imageBounds}
        />
      )}

      {/* Dialog bubble (disabled if completed) */}
      {!wasPreviouslyCompleted && activeDialog && (
        <DialogBubble
          key={activeDialog.hotspot.id}
          text={activeDialog.text}
          hotspot={activeDialog.hotspot}
          onDismiss={handleDismissDialog}
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

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
          }}
        >
          <div>Found: {foundClues.length} / {hotspotData.hotspots.length}</div>
          <div>Clues: {foundClues.join(', ')}</div>
          <div>Complete: {isComplete ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
}
