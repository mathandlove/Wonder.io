/**
 * Hotspot Image Editor Application
 *
 * Main component for the image hotspot editor interface.
 * Allows users to load images and annotate them with polygon hotspots.
 */
import React, { useState, useEffect } from 'react';
import InteractiveMap from '../features/editor/InteractiveMap';
import EditToolbar from '../features/editor/EditToolbar';
import ConfigHighlights from '../features/editor/ConfigHighlights';
import ImageSelector from '../features/editor/ImageSelector';
import type { Hotspot } from '@shared/types/hotspot';

const EditorApp: React.FC = () => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [showImageSelector, setShowImageSelector] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);

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

  return (
    <div className="h-screen w-screen bg-gray-100 flex overflow-hidden">
      {/* Left Toolbar */}
      <EditToolbar
        activeTool={activeTool}
        onToolSelect={setActiveTool}
        onClearAll={handleClearAll}
        onChangeImage={() => setShowImageSelector(true)}
        onGenerateThumbnails={handleGenerateThumbnails}
        hotspotCount={hotspots.length}
        currentImage={currentImage}
        isSaving={isSaving}
        isGeneratingThumbnails={isGeneratingThumbnails}
      />

      {/* Config Highlights Sidebar (shows when config tool is active) */}
      {activeTool === 'config-highlights' && (
        <ConfigHighlights
          isActive={true}
          hotspots={hotspots}
          onHotspotsChange={setHotspots}
          onHotspotUpdate={handleHotspotUpdate}
          onHotspotDelete={handleHotspotDelete}
          onHotspotHover={setHoveredHotspot}
          hoveredHotspot={hoveredHotspot}
        />
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-4" style={{ marginLeft: activeTool === 'config-highlights' ? '416px' : '96px' }}>
        {!currentImage || showImageSelector ? (
          <ImageSelector
            onImageSelect={handleImageSelect}
            currentImage={currentImage}
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <InteractiveMap
              mapImage={currentImage}
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
  );
};

export default EditorApp;
