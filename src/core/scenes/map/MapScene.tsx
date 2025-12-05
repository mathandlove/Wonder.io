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
import { calculateImageBounds, pointsToPixels } from '@shared/utils/coordinateUtils';
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
  onAnimationComplete?: () => void;
}

function PathLine({ path, imageBounds, isHighlighted, shouldAnimate, onAnimationComplete }: PathLineProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showLabel, setShowLabel] = useState(false);

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

  useEffect(() => {
    if (!shouldAnimate || pathLength === 0 || animationStarted) return;

    setAnimationStarted(true);
    setAnimationProgress(0);
    setShowLabel(false);

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setShowLabel(true);
        onAnimationComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }, [shouldAnimate, pathLength, animationStarted, onAnimationComplete]);

  if (imageBounds.width === 0 || path.points.length < 2) {
    return null;
  }

  const pixelPoints = pointsToPixels(path.points, imageBounds.width, imageBounds.height);

  const pathData = pixelPoints.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  const midIndex = Math.floor(pixelPoints.length / 2);
  const midpoint = pixelPoints[midIndex];

  const pathOpacity = isHighlighted ? 1 : 0.35;

  const isAnimating = shouldAnimate && animationStarted;
  const isWaitingToAnimate = shouldAnimate && !animationStarted;
  const displayLabel = isAnimating ? showLabel : !isWaitingToAnimate;
  const shouldHide = shouldAnimate && pathLength === 0;
  const revealLength = isWaitingToAnimate ? 0 : (isAnimating ? pathLength * animationProgress : pathLength);

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
        {displayLabel && (
          <>
            <circle
              cx={midpoint.x}
              cy={midpoint.y}
              r="18"
              fill="#87CEEB"
              className={isAnimating ? "map-path-label-appear" : ""}
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
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const [isInView, setIsInView] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect when map scrolls into view
  useEffect(() => {
    if (isLoading) return;

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [isLoading]);

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
        width: '100vw',
        height: '100vh',
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
        return (
          <PathLine
            key={path.id}
            path={path}
            imageBounds={imageBounds}
            isHighlighted={isHighlighted}
            shouldAnimate={shouldAnimate}
          />
        );
      })}
    </div>
  );
}
