/**
 * Lasso Selection Component
 *
 * Allows users to draw freehand polygon selections over images.
 * Creates hotspots from the drawn shapes with automatic bounding box calculation.
 * Coordinates are stored as percentages (0-100%) relative to image dimensions.
 */
import React, { useState, useEffect, useRef } from 'react';
import type { Point, Hotspot } from '@shared/types/hotspot';
import { pixelsToPercent, pointsToPercent, pointsToPixels, screenToImageCoords } from '@shared/utils/coordinateUtils';

interface LassoSelectionProps {
  isActive: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  imageBounds: { width: number; height: number; left: number; top: number };
  onSelectionComplete?: (points: Point[]) => void;
  onHotspotCreated?: (hotspot: Partial<Hotspot>) => void;
  hotspots?: Hotspot[];
}

const LassoSelection: React.FC<LassoSelectionProps> = ({
  isActive,
  containerRef,
  imageRef,
  imageBounds,
  onSelectionComplete,
  onHotspotCreated,
  hotspots = []
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]); // Points in pixel coordinates (for drawing)
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate bounding box from percentage-based points
  const calculateBounds = (percentPoints: Point[]) => {
    if (percentPoints.length === 0) return { x: 0, y: 0, width: 10, height: 10 };

    const xs = percentPoints.map(p => p.x);
    const ys = percentPoints.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: Math.max(0, Math.min(100, minX)),
      y: Math.max(0, Math.min(100, minY)),
      width: Math.max(1, Math.min(100 - minX, maxX - minX)),
      height: Math.max(1, Math.min(100 - minY, maxY - minY))
    };
  };

  useEffect(() => {
    if (!isActive) {
      setIsDrawing(false);
      setPoints([]);
      setCurrentPoint(null);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !containerRef.current || imageBounds.width === 0) return;

    const container = containerRef.current;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();

      // Convert screen coordinates to image-relative pixel coordinates
      const imagePoint = screenToImageCoords(
        e.clientX,
        e.clientY,
        {
          left: imageBounds.left + container.getBoundingClientRect().left,
          top: imageBounds.top + container.getBoundingClientRect().top,
          width: imageBounds.width,
          height: imageBounds.height
        }
      );

      console.log('Starting lasso at:', imagePoint);
      setIsDrawing(true);
      setPoints([imagePoint]);
      setCurrentPoint(imagePoint);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;

      // Convert screen coordinates to image-relative pixel coordinates
      const imagePoint = screenToImageCoords(
        e.clientX,
        e.clientY,
        {
          left: imageBounds.left + container.getBoundingClientRect().left,
          top: imageBounds.top + container.getBoundingClientRect().top,
          width: imageBounds.width,
          height: imageBounds.height
        }
      );

      setCurrentPoint(imagePoint);

      // Add point to path if moved enough distance
      if (points.length > 0) {
        const lastPoint = points[points.length - 1];
        const distance = Math.sqrt(
          Math.pow(imagePoint.x - lastPoint.x, 2) +
          Math.pow(imagePoint.y - lastPoint.y, 2)
        );

        if (distance > 3) {
          setPoints(prev => [...prev, imagePoint]);
        }
      }
    };

    const handleMouseUp = async () => {
      console.log('Ending lasso with', points.length, 'points');
      if (isDrawing && points.length > 2) {
        const closedPixelSelection = [...points, points[0]];

        try {
          // Convert pixel coordinates to percentages for storage
          const closedPercentSelection = pointsToPercent(
            closedPixelSelection,
            imageBounds.width,
            imageBounds.height
          );

          // Create a hotspot from the lasso selection
          if (onHotspotCreated) {
            const bounds = calculateBounds(closedPercentSelection);
            const timestamp = Date.now();
            const hotspot: Partial<Hotspot> = {
              id: `hotspot-${timestamp}`,
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
              label: `Hotspot ${timestamp}`,
              description: `Lasso selection created on ${new Date().toLocaleDateString()}`,
              points: closedPercentSelection, // Store as percentages
              createdAt: new Date().toISOString()
            };
            onHotspotCreated(hotspot);
          }

          if (onSelectionComplete) {
            onSelectionComplete(closedPercentSelection);
          }
        } catch (err) {
          console.error('Error creating hotspot:', err);
          setError('Failed to create hotspot');
        }
      }

      setIsDrawing(false);
      setPoints([]);
      setCurrentPoint(null);
    };

    container.addEventListener('mousedown', handleMouseDown, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isActive, isDrawing, points, containerRef, imageBounds, onSelectionComplete, onHotspotCreated]);

  const createPath = (pathPoints: Point[], isClosed: boolean = false) => {
    if (pathPoints.length < 2) return '';

    let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 1; i < pathPoints.length; i++) {
      path += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
    }

    if (isClosed) {
      path += ' Z';
    }

    return path;
  };

  if (!isActive) return null;

  return (
    <>
      {/* Status and error display */}
      {error && (
        <div className="absolute top-2 left-2 bg-black/80 text-white p-2 rounded text-xs z-50">
          <div className="text-red-300">⚠️ {error}</div>
        </div>
      )}

      {/* Hotspot count */}
      {hotspots.length > 0 && (
        <div className="absolute top-2 right-2 bg-green-600 text-white p-2 rounded text-xs z-50">
          {hotspots.length} hotspot{hotspots.length !== 1 ? 's' : ''}
        </div>
      )}

      <svg
        ref={svgRef}
        className="absolute z-20 pointer-events-none"
        style={{
          left: imageBounds.left,
          top: imageBounds.top,
          width: imageBounds.width,
          height: imageBounds.height
        }}
        viewBox={`0 0 ${imageBounds.width} ${imageBounds.height}`}
      >
        {/* Hotspots with lasso paths - convert percentage coords to pixels for display */}
        {hotspots.filter(h => h.points && h.points.length > 0).map((hotspot) => {
          // Convert percentage-based points to pixel coordinates for rendering
          const pixelPoints = pointsToPixels(
            hotspot.points!,
            imageBounds.width,
            imageBounds.height
          );

          return (
            <g key={`hotspot-${hotspot.id}`}>
              <path
                d={createPath(pixelPoints, true)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              <path
                d={createPath(pixelPoints, true)}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="none"
              />
            </g>
          );
        })}

        {/* Current drawing path */}
        {isDrawing && points.length > 0 && (
          <>
            <path
              d={createPath(
                currentPoint ? [...points, currentPoint] : points,
                false
              )}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeDasharray="8,4"
            />

            {/* Preview closing line */}
            {currentPoint && points.length > 2 && (
              <line
                x1={currentPoint.x}
                y1={currentPoint.y}
                x2={points[0].x}
                y2={points[0].y}
                stroke="rgba(59, 130, 246, 0.6)"
                strokeWidth="2"
                strokeDasharray="4,4"
              />
            )}
          </>
        )}
      </svg>
    </>
  );
};

export default LassoSelection;
