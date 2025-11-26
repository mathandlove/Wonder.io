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
}

function LocationHighlight({ coloredImageSrc, hotspot, imageBounds }: LocationHighlightProps) {
  if (imageBounds.width === 0) {
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
 */
interface PathLineProps {
  path: MapPath;
  imageBounds: { width: number; height: number; left: number; top: number };
  isHighlighted: boolean; // true for the most recent path, false for older paths
}

function PathLine({ path, imageBounds, isHighlighted }: PathLineProps) {
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
      <g opacity={pathOpacity}>
        {/* Path stroke - thick pale blue dotted line */}
        <path
          d={pathData}
          fill="none"
          stroke="#87CEEB"
          strokeWidth="8"
          strokeDasharray="14,10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Number label background */}
        <circle
          cx={midpoint.x}
          cy={midpoint.y}
          r="18"
          fill="#87CEEB"
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
        >
          {path.orderNumber}
        </text>
      </g>
    </svg>
  );
}

export default function MapScene({ scene, sceneIndex }: SceneProps<MapSceneType>) {
  const [hotspotData, setHotspotData] = useState<MapHotspotData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0, left: 0, top: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      {visiblePaths.map((path) => (
        <PathLine
          key={path.id}
          path={path}
          imageBounds={imageBounds}
          isHighlighted={path.orderNumber === highlightedPathOrder}
        />
      ))}

      {/* Highlighted locations using colored version */}
      {visitedHotspots.map((hotspot) => (
        <LocationHighlight
          key={hotspot.id}
          coloredImageSrc={coloredImageSrc}
          hotspot={hotspot}
          imageBounds={imageBounds}
        />
      ))}

    </div>
  );
}
