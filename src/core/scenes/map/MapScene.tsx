/**
 * MapScene - Displays a map image with highlighted locations and paths
 *
 * Shows a black & white map image with locations highlighted via hotspot polygons
 * using the colored version of those regions. Also shows paths between locations:
 * - Older paths are shown faded
 * - The most recent path (leading to current location) is highlighted
 *
 * Flow:
 * 1. Load base grayscale map image + hotspot data (including paths)
 * 2. Get all map scenes from story up to current index
 * 3. Find hotspots matching all visited locations
 * 4. Show paths with orderNumber <= visitedLocations.length - 1
 * 5. Tap to continue to next scene
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { SceneProps } from '@features/scenes/registry';
import type { MapScene as MapSceneType, Scene } from '@core/types/scene';
import { resolveStoryImage } from '@core/data/imageResolver';
import {
  getHotspotByLabel,
  type Hotspot,
  type HotspotData,
  type HotspotPoint,
} from '@core/data/hotspotLoader';
import { calculateImageBounds, pointsToPixels } from '@shared/utils/coordinateUtils';
import * as navigationBus from '@core/navigation/events/navigationBus';
import { useNavigationStore, selectNavigationGraph } from '@core/navigation/navigationStore';
import './MapScene.css';

/**
 * Path data structure from hotspot JSON
 */
interface MapPath {
  id: string;
  points: HotspotPoint[];
  orderNumber: number;
  createdAt: string;
  mapId: string;
}

/**
 * Extended hotspot data that includes paths
 */
interface MapHotspotData extends HotspotData {
  paths?: MapPath[];
}

/**
 * Load hotspot data for a map image
 * @param mapName - The base name of the map (e.g., "cityMap")
 * @param storyPath - Path to story bundle
 * @returns Parsed hotspot data
 */
async function loadMapHotspotData(
  mapName: string,
  storyPath: string = "/stories/gingerbread.bundle"
): Promise<MapHotspotData> {
  // Remove file extension if present
  const baseName = mapName.replace(/\.(jpg|png|webp)$/, '');
  const hotspotPath = `${storyPath}/images/maps/hotspots/${baseName}.json`;

  try {
    const response = await fetch(hotspotPath);
    if (!response.ok) {
      throw new Error(`Failed to load map hotspot data: ${response.statusText}`);
    }

    const data: MapHotspotData = await response.json();

    if (!data.hotspots || !Array.isArray(data.hotspots)) {
      throw new Error('Invalid hotspot data: missing hotspots array');
    }

    return data;
  } catch (error) {
    console.error(`[MapScene] Error loading ${hotspotPath}:`, error);
    throw error;
  }
}

/**
 * Location Highlight Component
 * Shows the colored version of a specific location using CSS clip-path
 */
interface LocationHighlightProps {
  coloredImageSrc: string;
  hotspot: Hotspot;
  imageBounds: { width: number; height: number; left: number; top: number };
  isVisible: boolean; // controls whether the highlight is shown
  shouldAnimate: boolean; // true to fade in, false to show immediately
}

function LocationHighlight({ coloredImageSrc, hotspot, imageBounds, isVisible, shouldAnimate }: LocationHighlightProps) {
  if (imageBounds.width === 0 || !isVisible) {
    return null;
  }

  // Build clip-path for this hotspot
  const points = hotspot.points
    .map(p => `${p.x}% ${p.y}%`)
    .join(', ');
  const clipPath = `polygon(${points})`;

  return (
    <img
      src={coloredImageSrc}
      alt={`Highlighted location: ${hotspot.label}`}
      className={shouldAnimate ? "map-hotspot-reveal" : ""}
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
}

/**
 * Path Line Component
 * Renders an SVG path line between locations
 * Supports animated drawing for highlighted (newest) paths
 */
interface PathLineProps {
  path: MapPath;
  imageBounds: { width: number; height: number; left: number; top: number };
  isHighlighted: boolean; // true for the most recent path, false for older paths
  shouldAnimate: boolean; // true to animate drawing, false to show immediately
  onAnimationComplete?: () => void; // callback when animation finishes
}

function PathLine({ path, imageBounds, isHighlighted, shouldAnimate, onAnimationComplete }: PathLineProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showLabel, setShowLabel] = useState(false);

  // Animation duration in milliseconds
  const ANIMATION_DURATION = 1500;

  // Get path length after render - use useLayoutEffect for synchronous measurement
  useEffect(() => {
    const measurePath = () => {
      if (pathRef.current) {
        const length = pathRef.current.getTotalLength();
        if (length > 0) {
          setPathLength(length);
        }
      }
    };
    measurePath();
    // Also measure after a short delay in case the path isn't ready immediately
    const timeoutId = setTimeout(measurePath, 50);
    return () => clearTimeout(timeoutId);
  }, [imageBounds, path.points]);

  // Run the drawing animation when shouldAnimate becomes true and we have pathLength
  useEffect(() => {
    console.log('[PathLine] Animation effect:', { shouldAnimate, pathLength, animationStarted, pathId: path.id });

    if (!shouldAnimate || pathLength === 0 || animationStarted) return;

    console.log('[PathLine] Starting animation for path:', path.id);

    // Mark animation as started so it only runs once
    setAnimationStarted(true);
    setAnimationProgress(0);
    setShowLabel(false);

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

      // Easing function for smooth animation (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete - show the label and notify parent
        console.log('[PathLine] Animation complete for path:', path.id);
        setShowLabel(true);
        onAnimationComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }, [shouldAnimate, pathLength, animationStarted, onAnimationComplete, path.id]);

  if (imageBounds.width === 0 || path.points.length < 2) {
    return null;
  }

  // Convert percentage points to pixel coordinates
  const pixelPoints = pointsToPixels(path.points, imageBounds.width, imageBounds.height);

  // Build SVG path data
  const pathData = pixelPoints.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  // Calculate midpoint for number label
  const midIndex = Math.floor(pixelPoints.length / 2);
  const midpoint = pixelPoints[midIndex];

  // Opacity based on whether this is the highlighted (most recent) path
  const pathOpacity = isHighlighted ? 1 : 0.35;

  // Determine display state based on animation mode
  const isAnimating = shouldAnimate && animationStarted;
  const isWaitingToAnimate = shouldAnimate && !animationStarted;

  // Show label only after animation completes, or immediately if not animating
  const displayLabel = isAnimating ? showLabel : !isWaitingToAnimate;

  // If shouldAnimate but we don't have pathLength yet, hide everything with opacity
  const shouldHide = shouldAnimate && pathLength === 0;

  // Calculate how much of the path to reveal (for clip path)
  // During animation, reveal progressively; when waiting, hide completely; otherwise show all
  const revealLength = isWaitingToAnimate ? 0 : (isAnimating ? pathLength * animationProgress : pathLength);

  // Generate a unique ID for this path's mask
  const maskId = `path-mask-${path.id}`;

  return (
    <svg
      className="map-path-overlay"
      style={{
        position: 'absolute',
        left: imageBounds.left,
        top: imageBounds.top,
        width: imageBounds.width,
        height: imageBounds.height,
        pointerEvents: 'none',
        zIndex: 50,
      }}
      viewBox={`0 0 ${imageBounds.width} ${imageBounds.height}`}
    >
      <defs>
        {/* Mask that reveals the dotted line progressively using stroke animation */}
        <mask id={maskId}>
          <path
            d={pathData}
            fill="none"
            stroke="white"
            strokeWidth="20"
            strokeDasharray={pathLength}
            strokeDashoffset={pathLength - revealLength}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>
      <g opacity={shouldHide ? 0 : pathOpacity}>
        {/* Path stroke - thick pale blue dotted line, masked to reveal progressively */}
        <g mask={isAnimating || isWaitingToAnimate ? `url(#${maskId})` : undefined}>
          <path
            ref={pathRef}
            d={pathData}
            fill="none"
            stroke="#87CEEB"
            strokeWidth="8"
            strokeDasharray="14,10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        {/* Number label - shown after animation or immediately if not animating */}
        {displayLabel && (
          <>
            {/* Number label background */}
            <circle
              cx={midpoint.x}
              cy={midpoint.y}
              r="18"
              fill="#87CEEB"
              className={isAnimating ? "map-path-label-appear" : ""}
            />
            {/* Number label */}
            <text
              x={midpoint.x}
              y={midpoint.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#1a365d"
              fontSize="16"
              fontWeight="bold"
              fontFamily="sans-serif"
              className={isAnimating ? "map-path-label-appear" : ""}
            >
              {path.orderNumber}
            </text>
          </>
        )}
      </g>
    </svg>
  );
}

export default function MapScene({ scene, sceneIndex }: SceneProps<MapSceneType>) {
  const [hotspotData, setHotspotData] = useState<MapHotspotData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const [pathAnimationComplete, setPathAnimationComplete] = useState(false);
  const [isInView, setIsInView] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Callback when path animation finishes - reveals the new hotspot
  const handlePathAnimationComplete = useCallback(() => {
    setPathAnimationComplete(true);
  }, []);

  // Intersection Observer to detect when map scrolls into view
  // Depends on isLoading so it runs after the container is rendered
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[MapScene] IntersectionObserver effect:', { isLoading, hasContainer: !!containerRef.current });

    if (isLoading) return; // Wait until loading is complete

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // eslint-disable-next-line no-console
        console.log('[MapScene] IntersectionObserver callback:', { isIntersecting: entry.isIntersecting, ratio: entry.intersectionRatio });
        if (entry.isIntersecting) {
          setIsInView(true);
          // Once triggered, disconnect - we only want to animate once
          observer.disconnect();
        }
      },
      { threshold: 0.3 } // Trigger when 30% of the map is visible
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [isLoading]);

  // Get navigation graph to access all scenes
  const navigationGraph = useNavigationStore(selectNavigationGraph);

  // Derive all visited locations from map scenes up to and including current index
  const visitedLocations = useMemo(() => {
    const locations: string[] = [];
    const currentIndex = sceneIndex ?? 0;

    // Iterate through nodes up to current index
    for (let i = 0; i <= currentIndex && i < navigationGraph.order.length; i++) {
      const nodeId = navigationGraph.order[i];
      const node = navigationGraph.byId[nodeId];
      if (node?.scene?.type === 'map') {
        const mapScene = node.scene as MapSceneType;
        if (mapScene.location && !locations.includes(mapScene.location)) {
          locations.push(mapScene.location);
        }
      }
    }

    return locations;
  }, [navigationGraph, sceneIndex]);

  // Find hotspots for all visited locations
  const visitedHotspots = useMemo(() => {
    if (!hotspotData) return [];

    return visitedLocations
      .map(location => getHotspotByLabel(hotspotData.hotspots, location))
      .filter((h): h is Hotspot => h !== undefined);
  }, [hotspotData, visitedLocations]);

  // Get paths to show based on visited locations count
  // Path with orderNumber N leads to the (N+1)th location
  // So for N visited locations, we show paths with orderNumber 1 to N-1
  const visiblePaths = useMemo(() => {
    if (!hotspotData?.paths) return [];

    const numLocations = visitedLocations.length;
    // For 1 location: no paths (first location has no incoming path)
    // For 2 locations: show path 1 (leads to 2nd location)
    // For 3 locations: show paths 1, 2 (leads to 2nd and 3rd locations)
    const maxPathOrder = numLocations - 1;

    return hotspotData.paths
      .filter(path => path.orderNumber <= maxPathOrder)
      .sort((a, b) => a.orderNumber - b.orderNumber);
  }, [hotspotData, visitedLocations.length]);

  // The highlighted path is the one with the highest orderNumber (most recent)
  const highlightedPathOrder = visitedLocations.length - 1;

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

      const bounds = calculateImageBounds(
        container.width,
        container.height,
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

  // Load hotspot data for the map
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);

        // Extract map name from scene.image
        const mapName = scene.image.replace(/\.(jpg|png|webp)$/, '');

        const data = await loadMapHotspotData(mapName);
        setHotspotData(data);

        setIsLoading(false);
      } catch (err) {
        console.error('[MapScene] Failed to load hotspot data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map data');
        setIsLoading(false);
      }
    }

    loadData();
  }, [scene.image]);

  const handleContinue = () => {
    console.log('[MapScene] Continue - advancing to next scene');
    navigationBus.emit({ type: 'CONTINUE' });
  };

  if (isLoading) {
    return (
      <div className="map-scene map-scene--loading">
        <p>Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-scene map-scene--error">
        <p>Error loading map: {error}</p>
      </div>
    );
  }

  // Derive image paths
  // Map images are in /stories/gingerbread.bundle/images/maps/
  const mapName = scene.image.replace(/\.(jpg|png|webp)$/, '');
  const baseImageSrc = resolveStoryImage(`maps/${mapName}.jpg`);
  const coloredImageSrc = resolveStoryImage(`maps/${mapName}Colored.jpg`);

  return (
    <div
      ref={containerRef}
      className="map-scene"
      onClick={handleContinue}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        cursor: 'pointer',
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
        {/* Base grayscale map image */}
        <img
          ref={imgRef}
          src={baseImageSrc}
          alt={`Map showing ${scene.location}`}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
          }}
          onLoad={updateDimensions}
        />
      </div>

      {/* Paths between locations - rendered before locations so they appear underneath */}
      {visiblePaths.map((path) => {
        const isHighlighted = path.orderNumber === highlightedPathOrder;
        // Only animate the newest (highlighted) path, and only when in view
        const shouldAnimate = isHighlighted && highlightedPathOrder > 0 && isInView;
        return (
          <PathLine
            key={path.id}
            path={path}
            imageBounds={imageBounds}
            isHighlighted={isHighlighted}
            shouldAnimate={shouldAnimate}
            onAnimationComplete={shouldAnimate ? handlePathAnimationComplete : undefined}
          />
        );
      })}

      {/* Highlighted locations using colored version */}
      {visitedHotspots.map((hotspot, index) => {
        const isCurrentLocation = index === visitedHotspots.length - 1;
        const hasIncomingPath = highlightedPathOrder > 0;
        // Current location is hidden until path animation completes (if there's a path)
        // Previous locations are always visible
        const isVisible = !isCurrentLocation || !hasIncomingPath || pathAnimationComplete;
        // Animate fade-in only for current location after path animation
        const shouldAnimate = isCurrentLocation && hasIncomingPath && pathAnimationComplete;
        return (
          <LocationHighlight
            key={hotspot.id}
            coloredImageSrc={coloredImageSrc}
            hotspot={hotspot}
            imageBounds={imageBounds}
            isVisible={isVisible}
            shouldAnimate={shouldAnimate}
          />
        );
      })}

    </div>
  );
}
