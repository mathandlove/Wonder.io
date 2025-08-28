import React, { useState, useRef, useEffect } from 'react';
import InteractiveMap from './components/InteractiveMap';
import CharacterIcon from './components/CharacterIcon';
import EditToolbar from './components/EditToolbar';
import ConfigHighlights from './components/ConfigHighlights';
import StoryPanel from './components/StoryPanel';
import RightEditPanel from './components/RightEditPanel';
import { selectionAPI } from './services/api';

function App() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const lassoRef = useRef<{ clearAllSelections: () => void }>(null);

  const handleClearAllSelections = async () => {
    if (window.confirm('Are you sure you want to delete all saved selections? This cannot be undone.')) {
      try {
        await selectionAPI.clearAllSelections();
        // Notify the LassoSelection component to refresh
        if (lassoRef.current) {
          lassoRef.current.clearAllSelections();
        }
        console.log('All selections cleared');
      } catch (error) {
        console.error('Error clearing selections:', error);
        alert('Failed to clear selections. Please try again.');
      }
    }
  };

  const [hotspots, setHotspots] = useState<any[]>([]);

  // Load hotspots on component mount
  useEffect(() => {
    const loadHotspots = async () => {
      try {
        const savedHotspots = await selectionAPI.getAllHotspots();
        setHotspots(savedHotspots);
        console.log('Loaded', savedHotspots.length, 'saved hotspots');
      } catch (error) {
        console.error('Error loading hotspots:', error);
      }
    };
    loadHotspots();
  }, []);

  const handleHotspotCreated = async (newHotspot: any) => {
    try {
      // Check if we're replacing an existing hotspot
      const replacingHotspot = (window as any).replacingHotspot;
      let hotspotData = {
        x: newHotspot.x,
        y: newHotspot.y,
        width: newHotspot.width,
        height: newHotspot.height,
        label: replacingHotspot ? replacingHotspot.label : newHotspot.label,
        description: replacingHotspot ? replacingHotspot.description : newHotspot.description,
        lassoSelectionId: newHotspot.lassoSelectionId,
        points: newHotspot.points,
        mapId: newHotspot.mapId || 'default'
      };
      
      // Save to backend
      const savedHotspot = await selectionAPI.saveHotspot(hotspotData);
      
      // Update state with saved hotspot, preserving order if replacing
      if (replacingHotspot && typeof replacingHotspot.originalIndex === 'number') {
        // Insert the new hotspot at the original position
        setHotspots(prev => {
          const newHotspots = [...prev];
          newHotspots.splice(replacingHotspot.originalIndex, 0, savedHotspot);
          return newHotspots;
        });
        console.log('Hotspot replaced at original position:', replacingHotspot.originalIndex);
      } else {
        // Add new hotspot at the end
        setHotspots(prev => [...prev, savedHotspot]);
        console.log('New hotspot added:', savedHotspot);
      }
      
      // Clear the replacement flag
      if (replacingHotspot) {
        delete (window as any).replacingHotspot;
      }
      
      // Deactivate lasso tool after successful creation
      setActiveTool('config-highlights');
      
    } catch (error) {
      console.error('Error saving hotspot:', error);
      // Still add to local state if save fails
      setHotspots(prev => [...prev, newHotspot]);
      // Still deactivate lasso tool even if save fails
      setActiveTool('config-highlights');
    }
  };

  const characters = [
    {
      id: 'guard',
      x: 30,
      y: 55,
      name: 'City Guard',
      description: 'A vigilant guard watching over the city streets',
      emoji: '💂'
    },
    {
      id: 'merchant',
      x: 60,
      y: 45,
      name: 'Traveling Merchant',
      description: 'A merchant with rare and mysterious goods',
      emoji: '🧙'
    }
  ];

  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  
  return (
    <div className="h-screen w-screen bg-gray-900 flex overflow-hidden">
      <div 
        style={{ 
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: isPanelExpanded ? '256px' : '8px',
          transition: 'margin-right 0.3s'
        }}
      >
        <InteractiveMap
          mapImage="/cityMap.png"
          mapAlt="A fantasy city map with various locations to explore"
          hotspots={hotspots}
          activeTool={activeTool}
          onHotspotCreated={handleHotspotCreated}
          onHotspotHover={setHoveredHotspot}
          hoveredHotspot={hoveredHotspot}
        />
      </div>
      
      <RightEditPanel
        activeTool={activeTool}
        onToolSelect={setActiveTool}
        onClearSelections={handleClearAllSelections}
        onExpandChange={setIsPanelExpanded}
        hotspots={hotspots}
        onHotspotsChange={setHotspots}
        onHotspotUpdate={async (id: string, updates: any) => {
          try {
            await selectionAPI.updateHotspot(id, updates);
            console.log('Hotspot updated:', id);
          } catch (error) {
            console.error('Error updating hotspot:', error);
          }
        }}
        onHotspotDelete={async (id: string) => {
          try {
            await selectionAPI.deleteHotspot(id);
            setHotspots(prev => prev.filter(h => h.id !== id));
            console.log('Hotspot deleted:', id);
          } catch (error) {
            console.error('Error deleting hotspot:', error);
          }
        }}
        onHotspotHover={setHoveredHotspot}
        hoveredHotspot={hoveredHotspot}
      />
    </div>
  );
}

export default App;