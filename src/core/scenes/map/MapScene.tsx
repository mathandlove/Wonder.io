/**
 * MapScene - Displays a colored map image with animated trail paths
 *
 * Shows the colored map with paths/trails between locations:
 * - Older paths are shown faded
 * - The most recent path (leading to current location) is highlighted and animated
 *
 * Flow:
 * 1. Load colored map image + path data
 * 2. Get all map scenes from story up to current index
 * 3. Show paths with orderNumber <= visitedLocations.length - 1
 * 4. Tap to continue to next scene
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { SceneProps } from '@features/scenes/registry';
import type { MapScene as MapSceneType } from '@core/types/scene';
import { resolveStoryImage } from '@core/data/imageResolver';
import { calculateImageBounds, pointsToPixels, findLongestVisibleSegmentMidpoint } from '@shared/utils/coordinateUtils';
import * as navigationBus from '@core/navigation/events/navigationBus';
import { useNavigationStore, selectNavigationGraph } from '@core/navigation/navigationStore';
import './MapScene.css';

/**
 * Path data structure from paths JSON
 */
interface MapPath {
  id: string;
  points: { x: number; y: number }[];
  orderNumber: number;
  createdAt: string;
  mapId?: string;
  pointOpacities?: number[]; // Optional opacity per point (0-1), defaults to 1
}

/**
 * Map data that includes paths
 */
interface MapData {
  paths: MapPath[];
}

/**
 * Load path data for a map image
 */
async function loadMapPathData(
  mapName: string,
  storyPath: string = "/stories/gingerbread.bundle"
): Promise<MapData> {
  const baseName = mapName.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  const pathsFile = `${storyPath}/images/hotspots/maps_${baseName}.json`;

  try {
    const response = await fetch(pathsFile);
    if (!response.ok) {
      // Return empty paths if file doesn't exist
      console.log(`[MapScene] No paths file found at ${pathsFile}`);
      return { paths: [] };
    }

    const data = await response.json();
    return { paths: data.paths || [] };
  } catch (error) {
    console.error(`[MapScene] Error loading ${pathsFile}:`, error);
    return { paths: [] };
  }
}

/**
 * Path Line Component
 * Renders an SVG path line with optional animation
 */
interface PathLineProps {
  path: MapPath;
  imageBounds: { width: number; height: number; left: number; top: number };
  isHighlighted: boolean;
  shouldAnimate: boolean;
  hideUntilAnimated?: boolean; // Hide path completely until animation reveals it
  onAnimationComplete?: () => void;
}

function PathLine({ path, imageBounds, isHighlighted, shouldAnimate, hideUntilAnimated = false, onAnimationComplete }: PathLineProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  const ANIMATION_DURATION = 1500;

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
    const timeoutId = setTimeout(measurePath, 50);
    return () => clearTimeout(timeoutId);
  }, [imageBounds, path.points]);

  // Animate by incrementing progress
  useEffect(() => {
    if (!shouldAnimate || pathLength === 0 || animationStarted) {
      return;
    }

    setAnimationStarted(true);
    setAnimationProgress(0);

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimationComplete(true);
        onAnimationComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }, [shouldAnimate, pathLength, animationStarted, onAnimationComplete]);

  if (imageBounds.width === 0 || path.points.length < 2) {
    return null;
  }

  const pixelPoints = pointsToPixels(path.points, imageBounds.width, imageBounds.height);
  const opacities = path.pointOpacities;

  // Create helper function for path data
  const createPathD = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  // Full path data for measurement and animation mask
  const fullPathData = pixelPoints.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  // Create path segments with different opacities
  const pathSegments: { d: string; opacity: number }[] = [];
  let currentSegmentPoints: { x: number; y: number }[] = [];
  let currentOpacity = opacities?.[0] ?? 1;

  for (let i = 0; i < pixelPoints.length; i++) {
    const pointOpacity = opacities?.[i] ?? 1;

    if (i === 0) {
      currentSegmentPoints = [pixelPoints[i]];
      currentOpacity = pointOpacity;
    } else if (pointOpacity === currentOpacity) {
      currentSegmentPoints.push(pixelPoints[i]);
    } else {
      // Opacity changed - save current segment and start new one
      if (currentSegmentPoints.length >= 1) {
        // Add the current point to close the gap
        currentSegmentPoints.push(pixelPoints[i]);
        pathSegments.push({
          d: createPathD(currentSegmentPoints),
          opacity: currentOpacity
        });
      }
      currentSegmentPoints = [pixelPoints[i]];
      currentOpacity = pointOpacity;
    }
  }

  // Add final segment
  if (currentSegmentPoints.length >= 2) {
    pathSegments.push({
      d: createPathD(currentSegmentPoints),
      opacity: currentOpacity
    });
  }

  // Find midpoint in longest visible segment for label
  const midIndex = findLongestVisibleSegmentMidpoint(path.points, opacities);
  const midpoint = pixelPoints[midIndex];
  const midpointVisible = (opacities?.[midIndex] ?? 1) > 0;

  const baseOpacity = isHighlighted ? 1 : 0.35;

  const isAnimating = shouldAnimate && animationStarted && !animationComplete;
  const isWaitingToAnimate = shouldAnimate && !animationStarted;
  const displayLabel = animationComplete ? true : (!shouldAnimate && !isWaitingToAnimate);
  // Hide completely when waiting to animate or path not measured yet
  const shouldHide = (hideUntilAnimated && !shouldAnimate) || isWaitingToAnimate || (shouldAnimate && pathLength === 0);

  // Build animated path segments incrementally, respecting point opacities
  // Returns array of path segments (each is a continuous visible section)
  const getAnimatedPathSegments = (): { d: string; opacity: number }[] => {
    if (!pathRef.current || pathLength === 0 || animationProgress === 0) {
      return [];
    }

    const targetLength = pathLength * animationProgress;
    const numSamples = Math.max(2, Math.ceil(targetLength / 2)); // Sample every 2px

    // Sample points along the animated portion
    const sampledPoints: { x: number; y: number; opacity: number }[] = [];

    for (let i = 0; i <= numSamples; i++) {
      const length = (i / numSamples) * targetLength;
      const point = pathRef.current.getPointAtLength(length);

      // Find which original segment this point belongs to, to get its opacity
      // Calculate approximate index in original points based on length ratio
      const lengthRatio = length / pathLength;
      const approxIndex = Math.min(
        Math.floor(lengthRatio * (pixelPoints.length - 1)),
        pixelPoints.length - 1
      );
      const pointOpacity = opacities?.[approxIndex] ?? 1;

      sampledPoints.push({ x: point.x, y: point.y, opacity: pointOpacity });
    }

    // Group consecutive points with same opacity into segments
    const segments: { d: string; opacity: number }[] = [];
    let currentSegmentPoints: { x: number; y: number }[] = [];
    let currentOpacity = sampledPoints[0]?.opacity ?? 1;

    for (let i = 0; i < sampledPoints.length; i++) {
      const { x, y, opacity } = sampledPoints[i];

      if (i === 0) {
        currentSegmentPoints = [{ x, y }];
        currentOpacity = opacity;
      } else if (opacity === currentOpacity) {
        currentSegmentPoints.push({ x, y });
      } else {
        // Opacity changed - save current segment if visible and has enough points
        if (currentSegmentPoints.length >= 2 && currentOpacity > 0) {
          // Add current point to close the gap
          currentSegmentPoints.push({ x, y });
          const d = currentSegmentPoints.map((p, idx) =>
            `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
          ).join(' ');
          segments.push({ d, opacity: currentOpacity });
        }
        currentSegmentPoints = [{ x, y }];
        currentOpacity = opacity;
      }
    }

    // Add final segment if visible
    if (currentSegmentPoints.length >= 2 && currentOpacity > 0) {
      const d = currentSegmentPoints.map((p, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
      ).join(' ');
      segments.push({ d, opacity: currentOpacity });
    }

    return segments;
  };

  const animatedPathSegments = isAnimating ? getAnimatedPathSegments() : [];

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
      {/* Hidden path for measurement */}
      <path
        ref={pathRef}
        d={fullPathData}
        fill="none"
        stroke="transparent"
        strokeWidth="8"
      />
      <g opacity={shouldHide ? 0 : 1}>
        {/* Animated dashed path segments (respecting erased areas), or static segments after animation */}
        {isAnimating ? (
          /* Animated segments - only show visible parts (opacity > 0) */
          animatedPathSegments.map((segment, segIdx) => (
            <path
              key={segIdx}
              d={segment.d}
              fill="none"
              stroke="#87CEEB"
              strokeWidth="8"
              strokeDasharray="14,10"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={segment.opacity * baseOpacity}
            />
          ))
        ) : (
          /* Static dotted path segments with opacity */
          pathSegments.map((segment, segIdx) => (
            <path
              key={segIdx}
              d={segment.d}
              fill="none"
              stroke="#87CEEB"
              strokeWidth="8"
              strokeDasharray="14,10"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={segment.opacity * baseOpacity}
            />
          ))
        )}
        {displayLabel && midpointVisible && (
          <>
            <circle
              cx={midpoint.x}
              cy={midpoint.y}
              r="18"
              fill="#87CEEB"
              className={animationComplete && shouldAnimate ? "map-path-label-appear" : ""}
            />
            <text
              x={midpoint.x}
              y={midpoint.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#1a365d"
              fontSize="16"
              fontWeight="bold"
              fontFamily="sans-serif"
              className={animationComplete && shouldAnimate ? "map-path-label-appear" : ""}
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
  const [mapData, setMapData] = useState<MapData | null>(null);
  // Initialize error immediately if scene.image is missing
  const [isLoading, setIsLoading] = useState(!scene.image ? false : true);
  const [error, setError] = useState<string | null>(!scene.image ? 'Map scene is missing image property' : null);
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const [isInView, setIsInView] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect when map scrolls into view
  // Animation starts 600ms after the map becomes visible
  useEffect(() => {
    if (isLoading) return;
    if (imageBounds.width === 0) return; // Wait for image to load

    const container = containerRef.current;
    if (!container) return;

    let animationDelayTimeout: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          // Map is visible - wait 600ms before starting animation
          animationDelayTimeout = setTimeout(() => {
            setIsInView(true);
          }, 600);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
    return () => {
      if (animationDelayTimeout) {
        clearTimeout(animationDelayTimeout);
      }
      observer.disconnect();
    };
  }, [isLoading, imageBounds.width]);

  // Get navigation graph to access all scenes
  const navigationGraph = useNavigationStore(selectNavigationGraph);

  // Count visited locations from map scenes up to current index
  const visitedLocationCount = useMemo(() => {
    let count = 0;
    const currentIndex = sceneIndex ?? 0;

    for (let i = 0; i <= currentIndex && i < navigationGraph.order.length; i++) {
      const nodeId = navigationGraph.order[i];
      const node = navigationGraph.byId[nodeId];
      if (node?.scene?.type === 'map') {
        count++;
      }
    }

    return count;
  }, [navigationGraph, sceneIndex]);

  // Get paths to show based on visited locations count
  const visiblePaths = useMemo(() => {
    if (!mapData?.paths) return [];

    // For N visited locations, show paths with orderNumber 1 to N-1
    const maxPathOrder = visitedLocationCount - 1;

    return mapData.paths
      .filter(path => path.orderNumber <= maxPathOrder)
      .sort((a, b) => a.orderNumber - b.orderNumber);
  }, [mapData, visitedLocationCount]);

  // The highlighted path is the most recent one
  const highlightedPathOrder = visitedLocationCount - 1;

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

      const bounds = calculateImageBounds(
        container.width,
        container.height,
        natural.width,
        natural.height
      );

      setImageBounds(bounds);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Load path data for the map
  useEffect(() => {
    async function loadData() {
      // Check if scene.image exists before trying to use it
      if (!scene.image) {
        setError('Map scene is missing image property');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const mapName = scene.image.replace(/\.(jpg|jpeg|png|webp)$/i, '');
        const data = await loadMapPathData(mapName);
        setMapData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('[MapScene] Failed to load path data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map data');
        setIsLoading(false);
      }
    }

    loadData();
  }, [scene.image]);

  const handleContinue = () => {
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

  // Use map from maps folder
  const mapName = scene.image.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  const coloredImageSrc = resolveStoryImage(`maps/${scene.image}`);

  return (
    <div
      ref={containerRef}
      className="map-scene construction-paper-bg"
      onClick={handleContinue}
      style={{
        position: 'relative',
        width: '100svw',
        height: '100svh',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Image wrapper */}
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
        {/* Colored map image */}
        <img
          ref={imgRef}
          src={coloredImageSrc}
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

      {/* Paths/trails between locations */}
      {visiblePaths.map((path) => {
        const isHighlighted = path.orderNumber === highlightedPathOrder;
        const shouldAnimate = isHighlighted && highlightedPathOrder > 0 && isInView;
        // Hide highlighted paths until they animate (when map scrolls into view)
        const hideUntilAnimated = isHighlighted && highlightedPathOrder > 0;
        return (
          <PathLine
            key={path.id}
            path={path}
            imageBounds={imageBounds}
            isHighlighted={isHighlighted}
            shouldAnimate={shouldAnimate}
            hideUntilAnimated={hideUntilAnimated}
          />
        );
      })}
    </div>
  );
}
