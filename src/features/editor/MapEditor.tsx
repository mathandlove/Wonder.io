/**
 * Map Editor Component
 *
 * Editor for drawing trail paths on maps.
 * 2-column layout matching ClueImageEditor:
 * - Left: Map thumbnails for selection
 * - Right: Map preview with path drawing and management
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Point, MapPath } from '@shared/types/hotspot';
import { pointsToPercent, pointsToPixels, screenToImageCoords, findLongestVisibleSegmentMidpoint } from '@shared/utils/coordinateUtils';
import './MapEditor.css';
import { API_URL } from '../../config';

// ============================================================================
// Types
// ============================================================================

interface MapInfo {
  path: string;
  name: string;
}

interface MapEditorProps {
  isActive: boolean;
  storyId: string;
  onClose?: () => void;
}

type MapEditorTool = 'draw' | 'hide' | null;

const BACKEND_URL = API_URL;

// ============================================================================
// Icons
// ============================================================================

const Icons = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
      <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 9m0 8V9m0 0l-6-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  path: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
      <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="7" r="2" />
      <circle cx="3" cy="17" r="2" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  spinner: (
    <svg className="map-editor-spinner" viewBox="0 0 24 24" fill="none" width="20" height="20">
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
};

// ============================================================================
// Main MapEditor Component
// ============================================================================

// Eraser radius in pixels for the hide-path tool
const ERASER_RADIUS = 15;

const MapEditor: React.FC<MapEditorProps> = ({
  isActive,
  storyId,
  onClose,
}) => {
  // Internal tool state
  const [activeTool, setActiveTool] = useState<MapEditorTool>('draw');

  // Data state
  const [maps, setMaps] = useState<MapInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Selection state
  const [selectedMap, setSelectedMap] = useState<MapInfo | null>(null);
  const [paths, setPaths] = useState<MapPath[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  // Erasing state
  const [isErasing, setIsErasing] = useState(false);
  const [eraserPosition, setEraserPosition] = useState<Point | null>(null);

  // Image bounds for coordinate conversion
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // ============================================================================
  // Data Loading
  // ============================================================================

  // Load maps
  useEffect(() => {
    if (!isActive) return;

    const loadMaps = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/bundle/maps?bundle=gingerbread.bundle`);
        if (!response.ok) throw new Error(`Failed to load maps: ${response.status}`);
        const data = await response.json();

        setMaps(data.maps || []);
        // Auto-select the first map
        if (data.maps && data.maps.length > 0) {
          setSelectedMap(data.maps[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load maps');
      } finally {
        setIsLoading(false);
      }
    };

    loadMaps();
  }, [isActive]);

  // Load paths when map is selected
  useEffect(() => {
    if (!selectedMap) {
      setPaths([]);
      return;
    }

    const loadData = async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/bundle/map-paths?map=${encodeURIComponent(selectedMap.path)}`
        );
        if (response.ok) {
          const data = await response.json();
          setPaths(data.paths || []);
        }
      } catch (err) {
        console.error('Failed to load paths:', err);
      }
    };

    loadData();
  }, [selectedMap]);

  // ============================================================================
  // Auto-save paths
  // ============================================================================

  useEffect(() => {
    if (!selectedMap) return;

    const saveData = async () => {
      setIsSaving(true);
      try {
        await fetch(`${BACKEND_URL}/api/bundle/map-paths`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            map: selectedMap.path,
            paths
          })
        });
      } catch (err) {
        console.error('Failed to save paths:', err);
      } finally {
        setIsSaving(false);
      }
    };

    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [paths, selectedMap]);

  // ============================================================================
  // Image bounds tracking
  // ============================================================================

  const updateImageBounds = useCallback(() => {
    if (!imageRef.current || !imageContainerRef.current) return;
    const img = imageRef.current;

    setImageBounds({
      width: img.clientWidth,
      height: img.clientHeight,
      left: img.offsetLeft,
      top: img.offsetTop
    });
  }, []);

  useEffect(() => {
    updateImageBounds();
    window.addEventListener('resize', updateImageBounds);
    return () => window.removeEventListener('resize', updateImageBounds);
  }, [updateImageBounds, selectedMap]);

  // ============================================================================
  // Drawing handlers
  // ============================================================================

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (!imageContainerRef.current || imageBounds.width === 0) return;
    e.preventDefault();

    const container = imageContainerRef.current;
    const containerRect = container.getBoundingClientRect();

    const imagePoint = screenToImageCoords(e.clientX, e.clientY, {
      left: containerRect.left + imageBounds.left,
      top: containerRect.top + imageBounds.top,
      width: imageBounds.width,
      height: imageBounds.height
    });

    setIsDrawing(true);
    setDrawingPoints([imagePoint]);
    setCurrentPoint(imagePoint);
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !imageContainerRef.current) return;

    const container = imageContainerRef.current;
    const containerRect = container.getBoundingClientRect();

    const imagePoint = screenToImageCoords(e.clientX, e.clientY, {
      left: containerRect.left + imageBounds.left,
      top: containerRect.top + imageBounds.top,
      width: imageBounds.width,
      height: imageBounds.height
    });

    setCurrentPoint(imagePoint);

    if (drawingPoints.length > 0) {
      const lastPoint = drawingPoints[drawingPoints.length - 1];
      const distance = Math.sqrt(
        Math.pow(imagePoint.x - lastPoint.x, 2) + Math.pow(imagePoint.y - lastPoint.y, 2)
      );
      if (distance > 5) {
        setDrawingPoints(prev => [...prev, imagePoint]);
      }
    }
  };

  const handleImageMouseUp = async () => {
    if (!isDrawing || drawingPoints.length < 2) {
      setIsDrawing(false);
      setDrawingPoints([]);
      setCurrentPoint(null);
      return;
    }

    // Create path
    const percentPoints = pointsToPercent(drawingPoints, imageBounds.width, imageBounds.height);

    const timestamp = Date.now();
    const newPath: MapPath = {
      id: `path-${timestamp}`,
      points: percentPoints,
      orderNumber: paths.length + 1,
      createdAt: new Date().toISOString(),
      mapId: selectedMap?.coloredPath
    };

    setPaths(prev => [...prev, newPath]);
    setSelectedPathId(newPath.id);

    setIsDrawing(false);
    setDrawingPoints([]);
    setCurrentPoint(null);
  };

  // ============================================================================
  // Erasing handlers (hide-path tool)
  // ============================================================================

  const handleEraserMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== 'hide' || !imageContainerRef.current || imageBounds.width === 0) return;
    e.preventDefault();
    setIsErasing(true);
    handleEraserMove(e);
  };

  const handleEraserMove = (e: React.MouseEvent) => {
    if (!imageContainerRef.current || imageBounds.width === 0) return;

    const container = imageContainerRef.current;
    const containerRect = container.getBoundingClientRect();

    const imagePoint = screenToImageCoords(e.clientX, e.clientY, {
      left: containerRect.left + imageBounds.left,
      top: containerRect.top + imageBounds.top,
      width: imageBounds.width,
      height: imageBounds.height
    });

    setEraserPosition(imagePoint);

    // If erasing, apply eraser to nearby path points
    if (isErasing) {
      applyEraser(imagePoint);
    }
  };

  const handleEraserMouseUp = () => {
    setIsErasing(false);
  };

  const applyEraser = (eraserPoint: Point) => {
    // Convert eraser position to percentage coordinates
    const eraserPercentX = (eraserPoint.x / imageBounds.width) * 100;
    const eraserPercentY = (eraserPoint.y / imageBounds.height) * 100;
    const eraserRadiusPercentX = (ERASER_RADIUS / imageBounds.width) * 100;
    const eraserRadiusPercentY = (ERASER_RADIUS / imageBounds.height) * 100;

    setPaths(prevPaths => prevPaths.map(path => {
      // Initialize opacities array if not present
      const opacities = path.pointOpacities
        ? [...path.pointOpacities]
        : path.points.map(() => 1);

      // Check each point and set opacity to 0 if within eraser radius
      let modified = false;
      path.points.forEach((point, index) => {
        const dx = (point.x - eraserPercentX) / eraserRadiusPercentX;
        const dy = (point.y - eraserPercentY) / eraserRadiusPercentY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= 1 && opacities[index] > 0) {
          opacities[index] = 0;
          modified = true;
        }
      });

      if (modified) {
        return { ...path, pointOpacities: opacities };
      }
      return path;
    }));
  };

  // ============================================================================
  // Path management
  // ============================================================================

  const handleDeletePath = (pathId: string) => {
    setPaths(prev => {
      const filtered = prev.filter(p => p.id !== pathId);
      // Renumber remaining paths
      return filtered.map((p, index) => ({ ...p, orderNumber: index + 1 }));
    });
    if (selectedPathId === pathId) {
      setSelectedPathId(null);
    }
  };

  // ============================================================================
  // SVG path creation
  // ============================================================================

  const createPathD = (pathPoints: Point[]) => {
    if (pathPoints.length < 2) return '';
    let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 1; i < pathPoints.length; i++) {
      d += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
    }
    return d;
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (!isActive) return null;

  if (isLoading) {
    return (
      <div className="map-editor-loading">
        <div className="map-editor-loading-content">
          <div className="icon">{Icons.map}</div>
          <p>Loading maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-editor">
      {/* Header */}
      <div className="map-editor-header">
        <div className="map-editor-header-left">
          <button onClick={onClose} className="map-editor-back-btn">
            {Icons.back}
            <span>Back to Editor</span>
          </button>
          <div className="map-editor-divider" />
          <div className="map-editor-title">
            <span className="map-editor-title-icon">{Icons.map}</span>
            <h1>Map Editor</h1>
          </div>
        </div>
        <div className="map-editor-header-right">
          {isSaving ? (
            <span className="map-editor-status saving">
              {Icons.spinner}
              Saving...
            </span>
          ) : (
            <span className="map-editor-status saved">
              {Icons.check}
              All changes saved
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="map-editor-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>{Icons.x}</button>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="map-editor-main">
        {/* LEFT COLUMN: Map Thumbnails */}
        <div className="map-editor-left">
          <div className="map-editor-section-header">
            <span className="map-editor-section-title">Maps</span>
            <span className="map-editor-section-count">{maps.length}</span>
          </div>
          <div className="map-editor-thumb-list">
            {maps.map(map => (
              <div
                key={map.path}
                onClick={() => setSelectedMap(map)}
                className={`map-editor-thumb ${selectedMap?.path === map.path ? 'selected' : ''}`}
              >
                <div className="map-editor-thumb-img">
                  <img
                    src={map.path}
                    alt={map.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f5f7f8" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%235a6a6c" font-family="sans-serif" font-size="12"%3ENo Map%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                <div className="map-editor-thumb-label">{map.name}</div>
                {selectedMap?.path === map.path && (
                  <div className="map-editor-thumb-check">{Icons.check}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER + RIGHT: Map Preview and Path Management */}
        <div className="map-editor-content">
          {selectedMap ? (
            <>
              {/* Header with Drawing Hint and Tool Selection */}
              <div className="map-editor-image-header">
                <h2>{selectedMap.name}</h2>
                <div className="map-editor-tool-buttons">
                  <button
                    className={`map-editor-tool-btn ${activeTool === 'draw' ? 'active' : ''}`}
                    onClick={() => setActiveTool('draw')}
                    title="Draw paths between locations"
                  >
                    <span className="icon">{Icons.path}</span>
                    <span>Draw Path</span>
                  </button>
                  <button
                    className={`map-editor-tool-btn ${activeTool === 'hide' ? 'active' : ''}`}
                    onClick={() => setActiveTool('hide')}
                    title="Hide parts of paths behind objects"
                  >
                    <span className="icon">🧽</span>
                    <span>Hide Path</span>
                  </button>
                </div>
                <div className="map-editor-drawing-hint">
                  <span className="icon">{activeTool === 'hide' ? '🧽' : Icons.path}</span>
                  <span>
                    {activeTool === 'hide'
                      ? 'Click and drag to hide parts of paths'
                      : 'Click and drag to draw a path'}
                  </span>
                </div>
              </div>

              {/* Content Area: Preview + Right Panel */}
              <div className="map-editor-content-area">
                {/* Map Preview */}
                <div
                  ref={imageContainerRef}
                  className={`map-editor-preview ${activeTool === 'hide' ? 'eraser-mode' : ''}`}
                  onMouseDown={activeTool === 'hide' ? handleEraserMouseDown : handleImageMouseDown}
                  onMouseMove={activeTool === 'hide' ? handleEraserMove : handleImageMouseMove}
                  onMouseUp={activeTool === 'hide' ? handleEraserMouseUp : handleImageMouseUp}
                  onMouseLeave={() => {
                    if (isDrawing) handleImageMouseUp();
                    if (isErasing) handleEraserMouseUp();
                    setEraserPosition(null);
                  }}
                >
                  <img
                    ref={imageRef}
                    src={selectedMap.path}
                    alt={selectedMap.name}
                    onLoad={updateImageBounds}
                    draggable={false}
                  />
                  {/* SVG overlay for paths and drawing */}
                  {imageBounds.width > 0 && (
                    <svg
                      className="map-editor-svg-overlay"
                      style={{
                        left: imageBounds.left,
                        top: imageBounds.top,
                        width: imageBounds.width,
                        height: imageBounds.height
                      }}
                      viewBox={`0 0 ${imageBounds.width} ${imageBounds.height}`}
                    >
                      {/* Existing paths */}
                      {paths.map(mapPath => {
                        const pixelPoints = pointsToPixels(mapPath.points, imageBounds.width, imageBounds.height);
                        if (pixelPoints.length < 2) return null;

                        const isSelected = selectedPathId === mapPath.id;
                        const opacities = mapPath.pointOpacities;

                        // Find the midpoint of the longest visible segment for label placement
                        const midIndex = findLongestVisibleSegmentMidpoint(mapPath.points, opacities);
                        const midpoint = pixelPoints[midIndex];

                        // Create path segments with different opacities
                        const pathSegments: { d: string; opacity: number }[] = [];
                        let currentSegmentPoints: Point[] = [];
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

                        return (
                          <g
                            key={mapPath.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPathId(mapPath.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {/* Render each segment with its opacity */}
                            {pathSegments.map((segment, segIdx) => (
                              <path
                                key={segIdx}
                                d={segment.d}
                                fill="none"
                                stroke={isSelected ? '#5ba3a0' : '#87CEEB'}
                                strokeWidth={isSelected ? 8 : 6}
                                strokeDasharray="12,8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={segment.opacity}
                              />
                            ))}
                            {/* Number label - only show if midpoint is visible */}
                            {(opacities?.[midIndex] ?? 1) > 0 && (
                              <>
                                <circle
                                  cx={midpoint.x}
                                  cy={midpoint.y}
                                  r={isSelected ? 18 : 16}
                                  fill={isSelected ? '#5ba3a0' : '#87CEEB'}
                                />
                                <text
                                  x={midpoint.x}
                                  y={midpoint.y}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill="#ffffff"
                                  fontSize={isSelected ? 16 : 14}
                                  fontWeight="bold"
                                >
                                  {mapPath.orderNumber}
                                </text>
                              </>
                            )}
                          </g>
                        );
                      })}

                      {/* Current drawing */}
                      {isDrawing && drawingPoints.length > 0 && (
                        <path
                          d={createPathD(currentPoint ? [...drawingPoints, currentPoint] : drawingPoints)}
                          fill="none"
                          stroke="#5ba3a0"
                          strokeWidth="4"
                          strokeDasharray="8,4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Eraser cursor indicator */}
                      {activeTool === 'hide' && eraserPosition && (
                        <circle
                          cx={eraserPosition.x}
                          cy={eraserPosition.y}
                          r={ERASER_RADIUS}
                          fill="rgba(255, 100, 100, 0.3)"
                          stroke="#ff6464"
                          strokeWidth="2"
                          strokeDasharray="4,4"
                          style={{ pointerEvents: 'none' }}
                        />
                      )}
                    </svg>
                  )}
                </div>

                {/* Right Panel: Paths */}
                <div className="map-editor-right">
                  <div className="map-editor-section-header">
                    <span className="map-editor-section-title">Paths</span>
                    <span className="map-editor-section-count">{paths.length}</span>
                  </div>

                  <div className="map-editor-item-list">
                    {paths.length === 0 ? (
                      <div className="map-editor-empty-panel">
                        <p>No paths yet</p>
                        <p className="hint">Draw on the map to create a trail</p>
                      </div>
                    ) : (
                      paths.map((mapPath) => {
                        const isSelected = selectedPathId === mapPath.id;

                        return (
                          <div
                            key={mapPath.id}
                            className={`map-editor-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedPathId(mapPath.id)}
                          >
                            <div className="map-editor-item-index path">{mapPath.orderNumber}</div>
                            <div className="map-editor-item-content">
                              <span className="map-editor-path-label">
                                Path {mapPath.orderNumber}
                              </span>
                              <span className="map-editor-path-points">
                                {mapPath.points.length} points
                              </span>
                            </div>
                            <button
                              className="map-editor-item-delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePath(mapPath.id);
                              }}
                              title="Delete path"
                            >
                              {Icons.trash}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="map-editor-empty">
              <div className="icon">{Icons.map}</div>
              <p>Select a map from the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapEditor;
