/**
 * Interactive Map Component
 *
 * Displays an image with overlay hotspots that can be drawn using lasso selection.
 * Supports visual states (colored, glimmer) for highlighting selected regions.
 */
import React, { useState, useRef, useEffect } from 'react';
import LassoSelection from './LassoSelection';
import PathDrawing from './PathDrawing';
import type { Hotspot, HotspotState, MapPath } from '@shared/types/hotspot';
import { calculateImageBounds, pointsToPixels, findLongestVisibleSegmentMidpoint } from '@shared/utils/coordinateUtils';

interface InteractiveMapProps {
  mapImage: string;
  mapAlt: string;
  hotspots: Hotspot[];
  paths?: MapPath[];
  coloredMapImage?: string;
  activeTool?: string | null;
  onHotspotCreated?: (hotspot: Partial<Hotspot>) => void;
  onPathCreated?: (path: Partial<MapPath>) => void;
  onHotspotHover?: (hotspotId: string | null) => void;
  onPathHover?: (pathId: string | null) => void;
  hoveredHotspot?: string | null;
  hoveredPath?: string | null;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  mapImage,
  mapAlt,
  hotspots,
  paths = [],
  coloredMapImage,
  activeTool,
  onHotspotCreated,
  onPathCreated,
  onHotspotHover,
  onPathHover,
  hoveredHotspot,
  hoveredPath
}) => {
  const [hotspotStates, setHotspotStates] = useState<Map<string, HotspotState>>(new Map());
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (imgRef.current && containerRef.current) {
        const natural = {
          width: imgRef.current.naturalWidth,
          height: imgRef.current.naturalHeight
        };

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

        setNaturalDimensions(natural);
        setImageBounds(bounds);
        setImageDimensions({ width: bounds.width, height: bounds.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [mapImage]);

  const handleHotspotClick = (hotspot: Hotspot) => {
    setHotspotStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(hotspot.id) || 'none';

      // Cycle through states: none → colored → glimmer → none
      let nextState: HotspotState;
      switch (currentState) {
        case 'none':
          nextState = 'colored';
          break;
        case 'colored':
          nextState = 'glimmer';
          break;
        case 'glimmer':
          nextState = 'none';
          break;
        default:
          nextState = 'colored';
      }

      console.log(`Hotspot ${hotspot.id}: ${currentState} → ${nextState}`);
      newMap.set(hotspot.id, nextState);

      return newMap;
    });
  };

  const handleLassoComplete = (points: { x: number; y: number }[]) => {
    console.log('Lasso selection completed with points:', points);
  };

  return (
    <div className={`w-full h-full flex items-center justify-center ${activeTool === 'lasso' ? 'cursor-crosshair' : ''}`}>
      <div ref={containerRef} className="relative" style={{
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%'
      }}>

        {/* Image wrapper - positioned exactly where the image renders */}
        <div
          ref={imageWrapperRef}
          className="absolute"
          style={{
            left: `${imageBounds.left}px`,
            top: `${imageBounds.top}px`,
            width: `${imageBounds.width}px`,
            height: `${imageBounds.height}px`,
            pointerEvents: 'none'
          }}
        >
          {/* Base image */}
          <img
            ref={imgRef}
            src={mapImage}
            alt={mapAlt}
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              pointerEvents: 'none'
            }}
            onLoad={() => {
              if (imgRef.current && containerRef.current) {
                const natural = {
                  width: imgRef.current.naturalWidth,
                  height: imgRef.current.naturalHeight
                };

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

                setNaturalDimensions(natural);
                setImageBounds(bounds);
                setImageDimensions({ width: bounds.width, height: bounds.height });
              }
            }}
          />
        </div>

        {/* Overlay sections - colored and glimmer - positioned within image wrapper */}
        {imageBounds.width > 0 && hotspots.map((hotspot) => {
          const state = hotspotStates.get(hotspot.id) || 'none';

          if (state === 'none') return null;

          // Create clipPath from lasso points (stored as percentages)
          let clipPathValue = '';
          if (hotspot.points && hotspot.points.length > 0) {
            // Points are stored as percentages (0-100%), convert to pixel coordinates for rendering
            const pixelPoints = pointsToPixels(
              hotspot.points,
              imageBounds.width,
              imageBounds.height
            );
            const polygonPoints = pixelPoints.map(point =>
              `${point.x}px ${point.y}px`
            ).join(', ');
            clipPathValue = `polygon(${polygonPoints})`;
          } else {
            // Fallback to rectangle if no points available (using percentages)
            clipPathValue = `polygon(${hotspot.x}% ${hotspot.y}%, ${hotspot.x + hotspot.width}% ${hotspot.y}%, ${hotspot.x + hotspot.width}% ${hotspot.y + hotspot.height}%, ${hotspot.x}% ${hotspot.y + hotspot.height}%)`;
          }

          return (
            <div
              key={`overlay-${hotspot.id}`}
              className="absolute pointer-events-none"
              style={{
                left: `${imageBounds.left}px`,
                top: `${imageBounds.top}px`,
                width: `${imageBounds.width}px`,
                height: `${imageBounds.height}px`,
                zIndex: 10,
                clipPath: clipPathValue,
              }}
            >
              {state === 'colored' && coloredMapImage && (
                <img
                  src={coloredMapImage}
                  alt=""
                  className="absolute"
                  draggable={false}
                  style={{
                    left: `0px`,
                    top: `0px`,
                    width: `${imageBounds.width}px`,
                    height: `${imageBounds.height}px`,
                  }}
                />
              )}
              {state === 'glimmer' && (
                <div
                  className="absolute"
                  style={{
                    left: `0px`,
                    top: `0px`,
                    width: `${imageBounds.width}px`,
                    height: `${imageBounds.height}px`,
                    background: `linear-gradient(25deg, transparent 0%, transparent 37.5%, gold 50%, transparent 62.5%, transparent 100%)`,
                    backgroundSize: '300% 300%',
                    animation: 'diagonal-sweep 3s ease-in-out infinite',
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Config Highlights - Show hotspot outlines when config tool is active */}
        {(activeTool === 'config-highlights' || activeTool === 'lasso') && imageBounds.width > 0 && (
          <svg
            style={{
              position: 'absolute',
              left: imageBounds.left,
              top: imageBounds.top,
              width: imageBounds.width,
              height: imageBounds.height,
              zIndex: 50,
              pointerEvents: 'auto'
            }}
          >
            {hotspots.map((hotspot) => {
              if (!hotspot.points || hotspot.points.length === 0) return null;

              // Convert percentage points to pixel coordinates for rendering
              const pixelPoints = pointsToPixels(
                hotspot.points,
                imageBounds.width,
                imageBounds.height
              );

              const pathData = pixelPoints.map((point, index) =>
                `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
              ).join(' ') + ' Z';

              const isHovered = hoveredHotspot === hotspot.id;

              return (
                <path
                  key={hotspot.id}
                  d={pathData}
                  fill={isHovered ? "rgba(34, 197, 94, 0.2)" : "rgba(59, 130, 246, 0.2)"}
                  stroke={isHovered ? "#22c55e" : "#3b82f6"}
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.8"
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    onHotspotHover?.(hotspot.id);
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    onHotspotHover?.(null);
                  }}
                  onClick={() => handleHotspotClick(hotspot)}
                />
              );
            })}
          </svg>
        )}

        {/* Render existing paths - always visible when there are paths */}
        {imageBounds.width > 0 && paths.length > 0 && (
          <svg
            style={{
              position: 'absolute',
              left: imageBounds.left,
              top: imageBounds.top,
              width: imageBounds.width,
              height: imageBounds.height,
              zIndex: 15,
              pointerEvents: activeTool === 'manage-paths' ? 'auto' : 'none'
            }}
            viewBox={`0 0 ${imageBounds.width} ${imageBounds.height}`}
          >
            {paths.map((mapPath) => {
              const pixelPoints = pointsToPixels(
                mapPath.points,
                imageBounds.width,
                imageBounds.height
              );

              if (pixelPoints.length < 2) return null;

              const opacities = mapPath.pointOpacities;

              // Helper to create path data
              const createPathD = (points: { x: number; y: number }[]) => {
                if (points.length < 2) return '';
                let d = `M ${points[0].x} ${points[0].y}`;
                for (let i = 1; i < points.length; i++) {
                  d += ` L ${points[i].x} ${points[i].y}`;
                }
                return d;
              };

              // Create path string for full path (used for hover detection)
              let fullPathD = `M ${pixelPoints[0].x} ${pixelPoints[0].y}`;
              for (let i = 1; i < pixelPoints.length; i++) {
                fullPathD += ` L ${pixelPoints[i].x} ${pixelPoints[i].y}`;
              }

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
                  if (currentSegmentPoints.length >= 1) {
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

              if (currentSegmentPoints.length >= 2) {
                pathSegments.push({
                  d: createPathD(currentSegmentPoints),
                  opacity: currentOpacity
                });
              }

              // Calculate midpoint for label using longest visible segment
              const midIndex = findLongestVisibleSegmentMidpoint(mapPath.points, opacities);
              const midpoint = pixelPoints[midIndex];
              const midpointVisible = (opacities?.[midIndex] ?? 1) > 0;

              const isHovered = hoveredPath === mapPath.id;
              const pathColor = isHovered ? '#3b82f6' : '#000000';

              return (
                <g
                  key={`path-${mapPath.id}`}
                  style={{ cursor: activeTool === 'manage-paths' ? 'pointer' : 'default' }}
                  onMouseEnter={() => onPathHover?.(mapPath.id)}
                  onMouseLeave={() => onPathHover?.(null)}
                >
                  {/* Path stroke segments with opacity */}
                  {pathSegments.map((segment, segIdx) => (
                    <path
                      key={segIdx}
                      d={segment.d}
                      fill="none"
                      stroke={pathColor}
                      strokeWidth={isHovered ? 8 : 6}
                      strokeDasharray="12,8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={segment.opacity}
                    />
                  ))}
                  {/* Invisible wider path for easier hover detection */}
                  {activeTool === 'manage-paths' && (
                    <path
                      d={fullPathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="20"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {/* Number label - only show if midpoint is visible */}
                  {midpointVisible && (
                    <>
                      <circle
                        cx={midpoint.x}
                        cy={midpoint.y}
                        r={isHovered ? 18 : 16}
                        fill={pathColor}
                      />
                      <text
                        x={midpoint.x}
                        y={midpoint.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize={isHovered ? 16 : 14}
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {mapPath.orderNumber}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Lasso Selection Tool - positioned on top layer - only active when explicitly requested */}
        {activeTool === 'lasso' && imageBounds.width > 0 && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, pointerEvents: 'auto' }}>
            <LassoSelection
              isActive={true}
              containerRef={containerRef}
              imageRef={imgRef}
              imageBounds={imageBounds}
              onSelectionComplete={handleLassoComplete}
              onHotspotCreated={onHotspotCreated}
              hotspots={hotspots}
            />
          </div>
        )}

        {/* Path Drawing Tool - for drawing paths between locations */}
        {activeTool === 'create-path' && imageBounds.width > 0 && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, pointerEvents: 'auto' }}>
            <PathDrawing
              isActive={true}
              containerRef={containerRef}
              imageRef={imgRef}
              imageBounds={imageBounds}
              onPathCreated={onPathCreated}
              paths={paths}
            />
          </div>
        )}
      </div>

      {/* Add CSS for glimmer animation */}
      <style>{`
        @keyframes diagonal-sweep {
          0% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
          100% {
            background-position: 0% 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default InteractiveMap;
