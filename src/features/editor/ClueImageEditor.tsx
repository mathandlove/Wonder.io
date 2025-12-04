/**
 * Clue Image Editor Component
 *
 * AI-generation-style interface for annotating clue images with hotspots.
 * 3-column layout:
 * - Left: Clue image thumbnails for selection
 * - Center: Large image preview with click-to-create hotspots
 * - Right: Hotspot list with name dropdown and delete
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Hotspot, Point } from '@shared/types/hotspot';
import { pointsToPercent, pointsToPixels, screenToImageCoords } from '@shared/utils/coordinateUtils';
import './ClueImageEditor.css';

// ============================================================================
// Types
// ============================================================================

interface ClueImage {
  path: string;
  name: string;
  coloredPath?: string;
  hasColoredVersion: boolean;
}

interface ClueDescription {
  hotspotName: string;
  description: string;
  image: string;
  dialog: string;
}

interface ClueImageEditorProps {
  isActive: boolean;
  storyId: string;
  onClose?: () => void;
}

const BACKEND_URL = 'http://localhost:3001';

// ============================================================================
// Icons
// ============================================================================

const Icons = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  lasso: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
      <path d="M15 8a3 3 0 1 0-6 0c0 1.657 1.5 3 3 5s3 3.343 3 5a3 3 0 1 1-6 0" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13c-1.5-2-3-3.343-3-5a3 3 0 0 1 6 0c0 1.657-1.5 3-3 5z" strokeLinecap="round" strokeLinejoin="round" />
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
    <svg className="clue-editor-spinner" viewBox="0 0 24 24" fill="none" width="20" height="20">
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
};

// ============================================================================
// Main ClueImageEditor Component
// ============================================================================

const ClueImageEditor: React.FC<ClueImageEditorProps> = ({
  isActive,
  storyId,
  onClose,
}) => {
  // Data state
  const [images, setImages] = useState<ClueImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Selection state
  const [selectedImage, setSelectedImage] = useState<ClueImage | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  // Available hotspot names from story.json
  const [availableNames, setAvailableNames] = useState<ClueDescription[]>([]);
  const [usedNames, setUsedNames] = useState<Set<string>>(new Set());

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  // Image bounds for coordinate conversion
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Thumbnail generation state
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);

  // ============================================================================
  // Data Loading
  // ============================================================================

  // Load clue images
  useEffect(() => {
    if (!isActive) return;

    const loadImages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/bundle/images?bundle=gingerbread.bundle`);
        if (!response.ok) throw new Error(`Failed to load images: ${response.status}`);
        const data = await response.json();

        // Get all clues images (B&W versions)
        const clueImages = data.images.filter((path: string) =>
          path.includes('/clues/') && !path.includes('/cluesColored/') && !path.includes('/hotspotImages/')
        );

        // Get all cluesColored images for lookup
        const coloredImages = new Set(
          data.images
            .filter((path: string) => path.includes('/cluesColored/'))
            .map((path: string) => (path.split('/').pop() || '').toLowerCase())
        );

        const imageInfos: ClueImage[] = clueImages.map((path: string) => {
          const filename = path.split('/').pop() || '';
          const name = filename.replace(/\.(png|jpg|jpeg|webp)$/i, '').replace(/[_-]/g, ' ');
          const hasColoredVersion = coloredImages.has(filename.toLowerCase());
          const coloredPath = hasColoredVersion ? path.replace('/clues/', '/cluesColored/') : undefined;

          return { path, name, coloredPath, hasColoredVersion };
        });

        setImages(imageInfos);
        // Auto-select the first image to go directly to the editor
        if (imageInfos.length > 0) {
          setSelectedImage(imageInfos[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load images');
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, [isActive]);

  // Load hotspots and available names when image is selected
  useEffect(() => {
    if (!selectedImage) {
      setHotspots([]);
      setAvailableNames([]);
      return;
    }

    const loadData = async () => {
      try {
        // Load hotspots
        const hotspotResponse = await fetch(
          `${BACKEND_URL}/api/bundle/hotspots?image=${encodeURIComponent(selectedImage.coloredPath || selectedImage.path)}`
        );
        if (hotspotResponse.ok) {
          const data = await hotspotResponse.json();
          setHotspots(data.hotspots || []);
        }

        // Load available names from story.json
        const storyResponse = await fetch(`/stories/gingerbread.bundle/story.json`);
        if (storyResponse.ok) {
          const storyData = await storyResponse.json();
          // Find clue-image scene matching this image
          // Remove spaces from name and compare without extension
          const imageName = selectedImage.name.replace(/ /g, '').toLowerCase();
          const clueScene = storyData.scenes.find((scene: any) => {
            if (scene.type !== 'clue-image') return false;
            // Remove extension from scene.image for comparison
            const sceneImageName = scene.image.replace(/\.(png|jpg|jpeg|webp)$/i, '').toLowerCase();
            return sceneImageName === imageName;
          });
          if (clueScene?.clueDescriptions) {
            setAvailableNames(clueScene.clueDescriptions);
          } else {
            setAvailableNames([]);
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };

    loadData();
  }, [selectedImage]);

  // Update used names when hotspots change
  useEffect(() => {
    const used = new Set(hotspots.map(h => h.label).filter(Boolean));
    setUsedNames(used);
  }, [hotspots]);

  // ============================================================================
  // Auto-save hotspots
  // ============================================================================

  useEffect(() => {
    if (!selectedImage || hotspots.length === 0) return;

    const saveHotspots = async () => {
      setIsSaving(true);
      try {
        await fetch(`${BACKEND_URL}/api/bundle/hotspots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: selectedImage.coloredPath || selectedImage.path,
            hotspots
          })
        });
      } catch (err) {
        console.error('Failed to save hotspots:', err);
      } finally {
        setIsSaving(false);
      }
    };

    const timeoutId = setTimeout(saveHotspots, 1000);
    return () => clearTimeout(timeoutId);
  }, [hotspots, selectedImage]);

  // ============================================================================
  // Image bounds tracking
  // ============================================================================

  const updateImageBounds = useCallback(() => {
    if (!imageRef.current || !imageContainerRef.current) return;
    const img = imageRef.current;
    const container = imageContainerRef.current;
    const containerRect = container.getBoundingClientRect();

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
  }, [updateImageBounds, selectedImage]);

  // ============================================================================
  // Drawing handlers
  // ============================================================================

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
      if (distance > 3) {
        setDrawingPoints(prev => [...prev, imagePoint]);
      }
    }
  };

  const handleImageMouseUp = async () => {
    if (!isDrawing || drawingPoints.length < 3) {
      setIsDrawing(false);
      setDrawingPoints([]);
      setCurrentPoint(null);
      return;
    }

    const closedPixelSelection = [...drawingPoints, drawingPoints[0]];
    const closedPercentSelection = pointsToPercent(closedPixelSelection, imageBounds.width, imageBounds.height);
    const bounds = calculateBounds(closedPercentSelection);

    // Find next available name
    const unusedName = availableNames.find(n => !usedNames.has(n.hotspotName));

    const timestamp = Date.now();
    const newHotspot: Hotspot = {
      id: `hotspot-${timestamp}`,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      label: unusedName?.hotspotName || `Hotspot ${hotspots.length + 1}`,
      description: unusedName?.description || `Created on ${new Date().toLocaleDateString()}`,
      points: closedPercentSelection,
      createdAt: new Date().toISOString(),
      mapId: selectedImage?.coloredPath || selectedImage?.path,
      imageUrl: selectedImage?.coloredPath || selectedImage?.path
    };

    setHotspots(prev => [...prev, newHotspot]);
    setSelectedHotspotId(newHotspot.id);

    // Generate thumbnail for the new hotspot
    if (selectedImage) {
      generateThumbnailForHotspot(newHotspot);
    }

    setIsDrawing(false);
    setDrawingPoints([]);
    setCurrentPoint(null);
  };

  // ============================================================================
  // Hotspot management
  // ============================================================================

  const handleNameChange = async (hotspotId: string, newName: string) => {
    setHotspots(prev => prev.map(h =>
      h.id === hotspotId
        ? {
            ...h,
            label: newName,
            description: availableNames.find(n => n.hotspotName === newName)?.description || h.description
          }
        : h
    ));

    // Generate new thumbnail when name changes
    const hotspot = hotspots.find(h => h.id === hotspotId);
    if (hotspot && selectedImage) {
      generateThumbnailForHotspot({ ...hotspot, label: newName });
    }
  };

  const handleDeleteHotspot = (hotspotId: string) => {
    setHotspots(prev => prev.filter(h => h.id !== hotspotId));
    if (selectedHotspotId === hotspotId) {
      setSelectedHotspotId(null);
    }
  };

  const generateThumbnailForHotspot = async (hotspot: Hotspot) => {
    if (!selectedImage) return;

    try {
      await fetch(`${BACKEND_URL}/api/bundle/hotspots/generate-thumbnails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage.coloredPath || selectedImage.path,
          hotspotId: hotspot.id
        })
      });
    } catch (err) {
      console.error('Failed to generate thumbnail:', err);
    }
  };

  const handleGenerateAllThumbnails = async () => {
    if (!selectedImage) return;

    setIsGeneratingThumbnails(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/bundle/hotspots/generate-thumbnails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: selectedImage.coloredPath || selectedImage.path })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Generated ${data.count} thumbnails`);
      }
    } catch (err) {
      console.error('Failed to generate thumbnails:', err);
    } finally {
      setIsGeneratingThumbnails(false);
    }
  };

  // ============================================================================
  // SVG path creation
  // ============================================================================

  const createPath = (pathPoints: Point[], isClosed: boolean = false) => {
    if (pathPoints.length < 2) return '';
    let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 1; i < pathPoints.length; i++) {
      path += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
    }
    if (isClosed) path += ' Z';
    return path;
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (!isActive) return null;

  if (isLoading) {
    return (
      <div className="clue-editor-loading">
        <div className="clue-editor-loading-content">
          <div className="icon">{Icons.target}</div>
          <p>Loading clue images...</p>
        </div>
      </div>
    );
  }

  const getUnusedNames = () => {
    return availableNames.filter(n => !usedNames.has(n.hotspotName));
  };

  return (
    <div className="clue-editor">
      {/* Header */}
      <div className="clue-editor-header">
        <div className="clue-editor-header-left">
          <button onClick={onClose} className="clue-editor-back-btn">
            {Icons.back}
            <span>Back to Editor</span>
          </button>
          <div className="clue-editor-divider" />
          <div className="clue-editor-title">
            <span className="clue-editor-title-icon">{Icons.target}</span>
            <h1>Clue Image Editor</h1>
          </div>
        </div>
        <div className="clue-editor-header-right">
          {isSaving ? (
            <span className="clue-editor-status saving">
              {Icons.spinner}
              Saving...
            </span>
          ) : (
            <span className="clue-editor-status saved">
              {Icons.check}
              All changes saved
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="clue-editor-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>{Icons.x}</button>
        </div>
      )}

      {/* Main 3-Column Layout */}
      <div className="clue-editor-main">
        {/* LEFT COLUMN: Image Thumbnails */}
        <div className="clue-editor-left">
          <div className="clue-editor-section-header">
            <span className="clue-editor-section-title">Clue Images</span>
            <span className="clue-editor-section-count">{images.length}</span>
          </div>
          <div className="clue-editor-thumb-list">
            {images.map(image => (
              <div
                key={image.path}
                onClick={() => setSelectedImage(image)}
                className={`clue-editor-thumb ${selectedImage?.path === image.path ? 'selected' : ''}`}
              >
                <div className="clue-editor-thumb-img">
                  <img
                    src={image.coloredPath || image.path}
                    alt={image.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f5f7f8" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%235a6a6c" font-family="sans-serif" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                <div className="clue-editor-thumb-label">{image.name}</div>
                {selectedImage?.path === image.path && (
                  <div className="clue-editor-thumb-check">{Icons.check}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER COLUMN: Image Preview with Drawing */}
        <div className="clue-editor-center">
          {selectedImage ? (
            <>
              <div className="clue-editor-image-header">
                <h2>{selectedImage.name}</h2>
                <div className="clue-editor-drawing-hint">
                  <span className="icon">{Icons.lasso}</span>
                  <span>Click and drag to create a hotspot</span>
                </div>
              </div>
              <div
                ref={imageContainerRef}
                className="clue-editor-preview"
                onMouseDown={handleImageMouseDown}
                onMouseMove={handleImageMouseMove}
                onMouseUp={handleImageMouseUp}
                onMouseLeave={() => {
                  if (isDrawing) handleImageMouseUp();
                }}
              >
                <img
                  ref={imageRef}
                  src={selectedImage.coloredPath || selectedImage.path}
                  alt={selectedImage.name}
                  onLoad={updateImageBounds}
                  draggable={false}
                />
                {/* SVG overlay for hotspots and drawing */}
                {imageBounds.width > 0 && (
                  <svg
                    className="clue-editor-svg-overlay"
                    style={{
                      left: imageBounds.left,
                      top: imageBounds.top,
                      width: imageBounds.width,
                      height: imageBounds.height
                    }}
                    viewBox={`0 0 ${imageBounds.width} ${imageBounds.height}`}
                  >
                    {/* Existing hotspots */}
                    {hotspots.filter(h => h.points && h.points.length > 0).map(hotspot => {
                      const pixelPoints = pointsToPixels(hotspot.points!, imageBounds.width, imageBounds.height);
                      const isSelected = selectedHotspotId === hotspot.id;

                      return (
                        <g
                          key={hotspot.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHotspotId(hotspot.id);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <path
                            d={createPath(pixelPoints, true)}
                            fill={isSelected ? 'rgba(91, 163, 160, 0.3)' : 'rgba(59, 130, 246, 0.15)'}
                            stroke={isSelected ? '#5ba3a0' : '#3b82f6'}
                            strokeWidth={isSelected ? 3 : 2}
                          />
                        </g>
                      );
                    })}

                    {/* Current drawing */}
                    {isDrawing && drawingPoints.length > 0 && (
                      <>
                        <path
                          d={createPath(currentPoint ? [...drawingPoints, currentPoint] : drawingPoints, false)}
                          fill="none"
                          stroke="#5ba3a0"
                          strokeWidth="3"
                          strokeDasharray="8,4"
                        />
                        {currentPoint && drawingPoints.length > 2 && (
                          <line
                            x1={currentPoint.x}
                            y1={currentPoint.y}
                            x2={drawingPoints[0].x}
                            y2={drawingPoints[0].y}
                            stroke="rgba(91, 163, 160, 0.6)"
                            strokeWidth="2"
                            strokeDasharray="4,4"
                          />
                        )}
                      </>
                    )}
                  </svg>
                )}
              </div>
            </>
          ) : (
            <div className="clue-editor-empty">
              <div className="icon">{Icons.target}</div>
              <p>Select a clue image from the left</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Hotspot List */}
        <div className="clue-editor-right">
          <div className="clue-editor-section-header">
            <div className="clue-editor-section-title-row">
              <span className="clue-editor-section-title">Hotspots</span>
              <span className="clue-editor-section-count">{hotspots.length}</span>
            </div>
            {hotspots.length > 0 && (
              <button
                className="clue-editor-gen-thumbs-btn"
                onClick={handleGenerateAllThumbnails}
                disabled={isGeneratingThumbnails}
                title="Generate all thumbnails"
              >
                {isGeneratingThumbnails ? Icons.spinner : 'Gen Thumbs'}
              </button>
            )}
          </div>

          <div className="clue-editor-hotspot-list">
            {hotspots.length === 0 ? (
              <div className="clue-editor-hotspot-empty">
                <p>No hotspots yet</p>
                <p className="hint">Draw on the image to create one</p>
              </div>
            ) : (
              hotspots.map((hotspot, index) => {
                const isSelected = selectedHotspotId === hotspot.id;
                const currentNameUsed = usedNames.has(hotspot.label);

                return (
                  <div
                    key={hotspot.id}
                    className={`clue-editor-hotspot-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedHotspotId(hotspot.id)}
                  >
                    <div className="clue-editor-hotspot-index">{index + 1}</div>
                    <div className="clue-editor-hotspot-content">
                      <select
                        value={hotspot.label}
                        onChange={(e) => handleNameChange(hotspot.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="clue-editor-hotspot-select"
                      >
                        {/* Current value */}
                        <option value={hotspot.label}>{hotspot.label}</option>
                        {/* Unused names from story.json */}
                        {availableNames
                          .filter(n => n.hotspotName !== hotspot.label && !usedNames.has(n.hotspotName))
                          .map(n => (
                            <option key={n.hotspotName} value={n.hotspotName}>
                              {n.hotspotName}
                            </option>
                          ))
                        }
                      </select>
                      {hotspot.description && (
                        <div className="clue-editor-hotspot-desc">{hotspot.description}</div>
                      )}
                    </div>
                    <button
                      className="clue-editor-hotspot-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHotspot(hotspot.id);
                      }}
                      title="Delete hotspot"
                    >
                      {Icons.trash}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Available names info */}
          {availableNames.length > 0 && (
            <div className="clue-editor-available-names">
              <div className="clue-editor-available-header">
                Available names ({getUnusedNames().length} remaining)
              </div>
              <div className="clue-editor-available-list">
                {availableNames.map(n => (
                  <span
                    key={n.hotspotName}
                    className={`clue-editor-name-tag ${usedNames.has(n.hotspotName) ? 'used' : ''}`}
                  >
                    {n.hotspotName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClueImageEditor;
