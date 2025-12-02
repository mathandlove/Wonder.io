/**
 * Hotspot Image Editor Application
 *
 * Main component for the image hotspot editor interface.
 * Professional Word-style UI with ribbon toolbar, sidebars, and status bar.
 */
import React, { useState, useEffect } from 'react';
import InteractiveMap from '../features/editor/InteractiveMap';
import EditorRibbon from '../features/editor/EditorRibbon';
import EditorStatusBar from '../features/editor/EditorStatusBar';
import ConfigHighlights from '../features/editor/ConfigHighlights';
import PathManager from '../features/editor/PathManager';
import ImageSelector from '../features/editor/ImageSelector';
import MapSelector from '../features/editor/MapSelector';
import ImageGeneratorPanel from '../features/editor/ImageGeneratorPanel';
import type { Hotspot, MapPath } from '@shared/types/hotspot';

const EditorApp: React.FC = () => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [showImageSelector, setShowImageSelector] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);

  // Map trail mode state
  const [currentMap, setCurrentMap] = useState<string | null>(null);
  const [currentMapColored, setCurrentMapColored] = useState<string | null>(null);
  const [mapHotspots, setMapHotspots] = useState<Hotspot[]>([]);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [isMapMode, setIsMapMode] = useState(false);

  // Map paths state
  const [mapPaths, setMapPaths] = useState<MapPath[]>([]);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Load hotspots from bundle when image changes
  useEffect(() => {
    if (!currentImage) return;

    const loadHotspots = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/bundle/hotspots?image=${encodeURIComponent(currentImage)}`);
        if (!response.ok) {
          throw new Error(`Failed to load hotspots: ${response.status}`);
        }
        const data = await response.json();
        setHotspots(data.hotspots || []);
        console.log(`✅ Loaded ${data.hotspots?.length || 0} hotspots for ${currentImage}`);
      } catch (err) {
        console.error('Failed to load hotspots:', err);
        setHotspots([]);
      }
    };

    loadHotspots();
  }, [currentImage]);

  // Auto-save hotspots to bundle when they change (debounced)
  useEffect(() => {
    if (!currentImage) return;

    const saveHotspots = async () => {
      setIsSaving(true);
      try {
        const response = await fetch('http://localhost:3001/api/bundle/hotspots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: currentImage,
            hotspots
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to save hotspots: ${response.status}`);
        }

        const data = await response.json();
        console.log(`💾 Saved ${data.count} hotspots to bundle`);
      } catch (err) {
        console.error('Failed to save hotspots:', err);
      } finally {
        setIsSaving(false);
      }
    };

    // Debounce saves - wait 1 second after last change
    const timeoutId = setTimeout(saveHotspots, 1000);
    return () => clearTimeout(timeoutId);
  }, [hotspots, currentImage]);

  const handleHotspotCreated = (newHotspot: Partial<Hotspot>) => {
    const hotspot: Hotspot = {
      id: `hotspot-${Date.now()}`,
      x: newHotspot.x || 0,
      y: newHotspot.y || 0,
      width: newHotspot.width || 10,
      height: newHotspot.height || 10,
      label: newHotspot.label || `Hotspot ${hotspots.length + 1}`,
      description: newHotspot.description || '',
      points: newHotspot.points || [],
      createdAt: new Date().toISOString(),
      mapId: currentImage || undefined,
      imageUrl: currentImage || undefined
    };

    setHotspots(prev => [...prev, hotspot]);
    console.log('Hotspot created:', hotspot);

    // Keep the current tool active (stay in lasso mode for multiple selections)
    // User can manually switch to config-highlights when ready to manage hotspots
  };

  const handleHotspotUpdate = async (id: string, updates: Partial<Hotspot>) => {
    setHotspots(prev => prev.map(h =>
      h.id === id ? { ...h, ...updates } : h
    ));
  };

  const handleHotspotDelete = async (id: string) => {
    setHotspots(prev => prev.filter(h => h.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all hotspots? This will save an empty file to the bundle.')) {
      setHotspots([]);
    }
  };

  const handleImageSelect = (imagePath: string) => {
    setCurrentImage(imagePath);
    setShowImageSelector(false);
    setActiveTool(null);
    setIsMapMode(false);
  };

  const handleMapSelect = (mapPath: string, coloredMapPath: string) => {
    setCurrentMap(mapPath);
    setCurrentMapColored(coloredMapPath);
    setShowMapSelector(false);
    setIsMapMode(true);
    // Stay in map-trail mode but switch to lasso for drawing
    setActiveTool('lasso');
  };

  const handleToolSelect = (tool: string | null) => {
    if (tool === 'map-trail') {
      // Enter map mode - show map selector
      setShowMapSelector(true);
      setIsMapMode(true);
      setActiveTool(tool);
    } else {
      setActiveTool(tool);
      if (tool === 'lasso' || tool === 'config-highlights') {
        // If switching back to clue editing tools, exit map mode
        if (!isMapMode || !currentMap) {
          setIsMapMode(false);
        }
      }
    }
  };

  // Load map hotspots and paths when map changes
  useEffect(() => {
    if (!currentMap) return;

    const loadMapData = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/bundle/hotspots?image=${encodeURIComponent(currentMap)}`);
        if (!response.ok) {
          throw new Error(`Failed to load map data: ${response.status}`);
        }
        const data = await response.json();
        setMapHotspots(data.hotspots || []);
        setMapPaths(data.paths || []);
        console.log(`Loaded ${data.hotspots?.length || 0} hotspots and ${data.paths?.length || 0} paths for map ${currentMap}`);
      } catch (err) {
        console.error('Failed to load map data:', err);
        setMapHotspots([]);
        setMapPaths([]);
      }
    };

    loadMapData();
  }, [currentMap]);

  // Auto-save map hotspots and paths when they change
  useEffect(() => {
    if (!currentMap) return;

    const saveMapData = async () => {
      setIsSaving(true);
      try {
        const response = await fetch('http://localhost:3001/api/bundle/hotspots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: currentMap,
            hotspots: mapHotspots,
            paths: mapPaths
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to save map data: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Saved ${data.count} map hotspots and ${mapPaths.length} paths to bundle`);
      } catch (err) {
        console.error('Failed to save map data:', err);
      } finally {
        setIsSaving(false);
      }
    };

    const timeoutId = setTimeout(saveMapData, 1000);
    return () => clearTimeout(timeoutId);
  }, [mapHotspots, mapPaths, currentMap]);

  const handleMapHotspotCreated = (newHotspot: Partial<Hotspot>) => {
    const hotspot: Hotspot = {
      id: `map-hotspot-${Date.now()}`,
      x: newHotspot.x || 0,
      y: newHotspot.y || 0,
      width: newHotspot.width || 10,
      height: newHotspot.height || 10,
      label: newHotspot.label || `Location ${mapHotspots.length + 1}`,
      description: newHotspot.description || '',
      points: newHotspot.points || [],
      createdAt: new Date().toISOString(),
      mapId: currentMap || undefined,
      imageUrl: currentMap || undefined
    };

    setMapHotspots(prev => [...prev, hotspot]);
    console.log('Map location created:', hotspot);
  };

  const handleMapHotspotUpdate = async (id: string, updates: Partial<Hotspot>) => {
    setMapHotspots(prev => prev.map(h =>
      h.id === id ? { ...h, ...updates } : h
    ));
  };

  const handleMapHotspotDelete = async (id: string) => {
    setMapHotspots(prev => prev.filter(h => h.id !== id));
  };

  const handleClearAllMapHotspots = () => {
    if (window.confirm('Are you sure you want to delete all map locations? This will save an empty file to the bundle.')) {
      setMapHotspots([]);
    }
  };

  // Path handlers
  const handlePathCreated = (newPath: Partial<MapPath>) => {
    const path: MapPath = {
      id: newPath.id || `path-${Date.now()}`,
      points: newPath.points || [],
      orderNumber: newPath.orderNumber || mapPaths.length + 1,
      createdAt: newPath.createdAt || new Date().toISOString(),
      mapId: currentMap || undefined
    };

    setMapPaths(prev => [...prev, path]);
    console.log('Path created:', path);
  };

  const handleClearAllPaths = () => {
    if (window.confirm('Are you sure you want to delete all paths?')) {
      setMapPaths([]);
    }
  };

  const handleGenerateThumbnails = async () => {
    if (!currentImage) return;

    setIsGeneratingThumbnails(true);
    try {
      const response = await fetch('http://localhost:3001/api/bundle/hotspots/generate-thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: currentImage })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate thumbnails');
      }

      const data = await response.json();
      alert(`✅ Successfully generated ${data.count} thumbnail(s)!`);
      console.log('Thumbnail generation result:', data);
    } catch (err) {
      console.error('Failed to generate thumbnails:', err);
      alert(`❌ Error: ${err instanceof Error ? err.message : 'Failed to generate thumbnails'}`);
    } finally {
      setIsGeneratingThumbnails(false);
    }
  };

  // Determine which hotspots and handlers to use based on mode
  const activeHotspots = isMapMode ? mapHotspots : hotspots;
  const activeImage = isMapMode ? currentMapColored : currentImage;
  const activeHotspotCreated = isMapMode ? handleMapHotspotCreated : handleHotspotCreated;
  const activeHotspotUpdate = isMapMode ? handleMapHotspotUpdate : handleHotspotUpdate;
  const activeHotspotDelete = isMapMode ? handleMapHotspotDelete : handleHotspotDelete;
  const activeClearAll = isMapMode ? handleClearAllMapHotspots : handleClearAll;
  const activeSetHotspots = isMapMode ? setMapHotspots : setHotspots;

  // Check if a side panel is open
  const hasSidePanel = activeTool === 'config-highlights' || activeTool === 'manage-paths' || activeTool === 'image-generator';

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Top Ribbon Toolbar */}
      <EditorRibbon
        activeTool={activeTool}
        onToolSelect={handleToolSelect}
        onClearAll={activeClearAll}
        onChangeImage={() => isMapMode ? setShowMapSelector(true) : setShowImageSelector(true)}
        onGenerateThumbnails={isMapMode ? undefined : handleGenerateThumbnails}
        hotspotCount={activeHotspots.length}
        currentImage={activeImage}
        isSaving={isSaving}
        isGeneratingThumbnails={isGeneratingThumbnails}
        isMapMode={isMapMode}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden" style={{ marginTop: '176px', marginBottom: '24px' }}>
        {/* Config Highlights Sidebar (shows when config tool is active) */}
        {activeTool === 'config-highlights' && (
          <ConfigHighlights
            isActive={true}
            hotspots={activeHotspots}
            onHotspotsChange={activeSetHotspots}
            onHotspotUpdate={activeHotspotUpdate}
            onHotspotDelete={activeHotspotDelete}
            onHotspotHover={setHoveredHotspot}
            hoveredHotspot={hoveredHotspot}
            onClose={() => setActiveTool(null)}
          />
        )}

        {/* Path Manager Sidebar (shows when manage-paths tool is active) */}
        {activeTool === 'manage-paths' && isMapMode && (
          <PathManager
            isActive={true}
            paths={mapPaths}
            onPathsChange={setMapPaths}
            onPathHover={setHoveredPath}
            hoveredPath={hoveredPath}
            onClose={() => setActiveTool(null)}
          />
        )}

        {/* Image Generator Panel (shows when image-generator tool is active) */}
        {activeTool === 'image-generator' && (
          <ImageGeneratorPanel
            isActive={true}
            storyId="gingerbread"
            onImageUpdated={(sceneIndex, newImagePath) => {
              console.log(`Scene ${sceneIndex} updated with: ${newImagePath}`);
            }}
          />
        )}

        {/* Main Canvas Area */}
        <div
          className="flex-1 flex items-center justify-center p-6 bg-gray-100"
          style={{ marginLeft: hasSidePanel ? '320px' : '0' }}
        >
          {/* Map Selector */}
          {showMapSelector ? (
            <MapSelector
              onMapSelect={handleMapSelect}
              currentMap={currentMap}
            />
          ) : /* Image Selector for clue mode */
          (!isMapMode && (!currentImage || showImageSelector)) ? (
            <ImageSelector
              onImageSelect={handleImageSelect}
              currentImage={currentImage}
            />
          ) : /* Map editing mode */
          (isMapMode && currentMapColored) ? (
            <div className="relative w-full h-full flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200">
              <InteractiveMap
                mapImage={currentMapColored}
                mapAlt="Map being annotated"
                hotspots={mapHotspots}
                paths={mapPaths}
                activeTool={activeTool}
                onHotspotCreated={handleMapHotspotCreated}
                onPathCreated={handlePathCreated}
                onHotspotHover={setHoveredHotspot}
                onPathHover={setHoveredPath}
                hoveredHotspot={hoveredHotspot}
                hoveredPath={hoveredPath}
              />
            </div>
          ) : /* Clue editing mode */
          (
            <div className="relative w-full h-full flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200">
              <InteractiveMap
                mapImage={currentImage!}
                mapAlt="Image being annotated"
                hotspots={hotspots}
                activeTool={activeTool}
                onHotspotCreated={handleHotspotCreated}
                onHotspotHover={setHoveredHotspot}
                hoveredHotspot={hoveredHotspot}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <EditorStatusBar
        hotspotCount={activeHotspots.length}
        pathCount={mapPaths.length}
        currentImage={activeImage}
        isMapMode={isMapMode}
        activeTool={activeTool}
        isSaving={isSaving}
      />
    </div>
  );
};

export default EditorApp;
