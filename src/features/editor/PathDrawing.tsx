/**
 * Path Drawing Component
 *
 * Allows users to draw freehand paths on maps.
 * Creates numbered paths that show the trail between locations.
 * Coordinates are stored as percentages (0-100%) relative to image dimensions.
 */
import React, { useState, useEffect, useRef } from 'react';
import type { Point, MapPath } from '@shared/types/hotspot';
import { pointsToPercent, pointsToPixels, screenToImageCoords } from '@shared/utils/coordinateUtils';

interface PathDrawingProps {
  isActive: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  imageBounds: { width: number; height: number; left: number; top: number };
  onPathCreated?: (path: Partial<MapPath>) => void;
  paths?: MapPath[];
}

const PathDrawing: React.FC<PathDrawingProps> = ({
  isActive,
  containerRef,
  imageRef,
  imageBounds,
  onPathCreated,
  paths = []
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

      console.log('Starting path at:', imagePoint);
      setIsDrawing(true);
      setPoints([imagePoint]);
      setCurrentPoint(imagePoint);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;

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

        if (distance > 5) { // Slightly larger threshold for smoother paths
          setPoints(prev => [...prev, imagePoint]);
        }
      }
    };

    const handleMouseUp = async () => {
      console.log('Ending path with', points.length, 'points');
      if (isDrawing && points.length > 1) {
        try {
          // Convert pixel coordinates to percentages for storage
          const percentPoints = pointsToPercent(
            points,
            imageBounds.width,
            imageBounds.height
          );

          // Create a path
          if (onPathCreated) {
            const nextOrderNumber = paths.length + 1;
            const mapPath: Partial<MapPath> = {
              id: `path-${Date.now()}`,
              points: percentPoints,
              orderNumber: nextOrderNumber,
              createdAt: new Date().toISOString()
            };
            onPathCreated(mapPath);
          }
        } catch (err) {
          console.error('Error creating path:', err);
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
  }, [isActive, isDrawing, points, containerRef, imageBounds, onPathCreated, paths.length]);

  const createPathD = (pathPoints: Point[]) => {
    if (pathPoints.length < 2) return '';

    let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 1; i < pathPoints.length; i++) {
      path += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
    }

    return path;
  };

  // Calculate midpoint of a path for label placement
  const getPathMidpoint = (pathPoints: Point[]): Point => {
    if (pathPoints.length === 0) return { x: 0, y: 0 };
    const midIndex = Math.floor(pathPoints.length / 2);
    return pathPoints[midIndex];
  };

  if (!isActive) return null;

  return (
    <>
      {/* Path count */}
      {paths.length > 0 && (
        <div className="absolute top-2 right-2 bg-gray-800 text-white p-2 rounded text-xs z-50">
          {paths.length} path{paths.length !== 1 ? 's' : ''}
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
        {/* Existing paths */}
        {paths.map((mapPath) => {
          const pixelPoints = pointsToPixels(
            mapPath.points,
            imageBounds.width,
            imageBounds.height
          );
          const midpoint = getPathMidpoint(pixelPoints);

          return (
            <g key={`path-${mapPath.id}`}>
              {/* Path stroke - thick black dotted line */}
              <path
                d={createPathD(pixelPoints)}
                fill="none"
                stroke="#000000"
                strokeWidth="6"
                strokeDasharray="12,8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Number label background */}
              <circle
                cx={midpoint.x}
                cy={midpoint.y}
                r="16"
                fill="#000000"
              />
              {/* Number label */}
              <text
                x={midpoint.x}
                y={midpoint.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize="14"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {mapPath.orderNumber}
              </text>
            </g>
          );
        })}

        {/* Current drawing path */}
        {isDrawing && points.length > 0 && (
          <path
            d={createPathD(
              currentPoint ? [...points, currentPoint] : points
            )}
            fill="none"
            stroke="#000000"
            strokeWidth="6"
            strokeDasharray="12,8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
        )}
      </svg>
    </>
  );
};

export default PathDrawing;
