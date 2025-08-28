import React, { useState } from 'react';

interface Hotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  description: string;
}

interface ConfigHighlightsProps {
  isActive: boolean;
  hotspots: Hotspot[];
  onHotspotsChange: (hotspots: Hotspot[]) => void;
  onHotspotUpdate?: (id: string, updates: any) => Promise<void>;
  onHotspotDelete?: (id: string) => Promise<void>;
}

const ConfigHighlights: React.FC<ConfigHighlightsProps> = ({
  isActive,
  hotspots,
  onHotspotsChange,
  onHotspotUpdate,
  onHotspotDelete
}) => {
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [editingHotspot, setEditingHotspot] = useState<Hotspot | null>(null);

  if (!isActive) return null;

  const handleEditHotspot = (hotspot: Hotspot) => {
    setEditingHotspot({ ...hotspot });
    setSelectedHotspot(hotspot.id);
  };

  const handleSaveHotspot = async () => {
    if (!editingHotspot) return;
    
    try {
      if (onHotspotUpdate) {
        await onHotspotUpdate(editingHotspot.id, { label: editingHotspot.label });
      }
      
      const updatedHotspots = hotspots.map(h => 
        h.id === editingHotspot.id ? editingHotspot : h
      );
      
      onHotspotsChange(updatedHotspots);
    } catch (error) {
      console.error('Failed to save hotspot:', error);
    }
    
    setEditingHotspot(null);
    setSelectedHotspot(null);
  };

  const handleCancelEdit = () => {
    setEditingHotspot(null);
    setSelectedHotspot(null);
  };

  const handleDeleteHotspot = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this hotspot?')) {
      try {
        if (onHotspotDelete) {
          await onHotspotDelete(id);
        } else {
          // Fallback to local state update if no backend handler
          const updatedHotspots = hotspots.filter(h => h.id !== id);
          onHotspotsChange(updatedHotspots);
        }
        
        if (selectedHotspot === id) {
          setSelectedHotspot(null);
          setEditingHotspot(null);
        }
      } catch (error) {
        console.error('Failed to delete hotspot:', error);
      }
    }
  };


  return (
    <div className="fixed left-0 top-0 w-80 h-full bg-white shadow-2xl border-r border-gray-300 z-40 flex flex-col">
      <div className="p-4 bg-gray-100 border-b">
        <h2 className="text-lg font-bold text-gray-800">Configure Highlights</h2>
        <p className="text-sm text-gray-600">Edit hotspot areas on the map</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {hotspots.map((hotspot) => (
            <div
              key={hotspot.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedHotspot === hotspot.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedHotspot(hotspot.id)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 bg-blue-100 rounded border border-blue-300 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21,15 16,10 5,21"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-800">{hotspot.label}</h3>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditHotspot(hotspot);
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded text-xs"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteHotspot(hotspot.id);
                    }}
                    className="p-1 text-red-600 hover:bg-red-100 rounded text-xs"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingHotspot && (
        <div className="border-t bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Edit Hotspot Name</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editingHotspot.label}
                onChange={(e) => setEditingHotspot({
                  ...editingHotspot,
                  label: e.target.value
                })}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                placeholder="Enter hotspot name..."
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveHotspot}
              className="flex-1 p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex-1 p-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigHighlights;