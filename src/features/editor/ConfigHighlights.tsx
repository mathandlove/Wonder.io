/**
 * Config Highlights Sidebar
 *
 * Displays a list of all hotspots with editing capabilities.
 * Allows renaming, deleting, and managing hotspot metadata.
 */
import React, { useState } from 'react';
import type { Hotspot } from '@shared/types/hotspot';

interface ConfigHighlightsProps {
  isActive: boolean;
  hotspots: Hotspot[];
  onHotspotsChange: (hotspots: Hotspot[]) => void;
  onHotspotUpdate?: (id: string, updates: Partial<Hotspot>) => Promise<void>;
  onHotspotDelete?: (id: string) => Promise<void>;
  onHotspotHover?: (id: string | null) => void;
  hoveredHotspot?: string | null;
}

const ConfigHighlights: React.FC<ConfigHighlightsProps> = ({
  isActive,
  hotspots,
  onHotspotsChange,
  onHotspotUpdate,
  onHotspotDelete,
  onHotspotHover,
  hoveredHotspot
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
        await onHotspotUpdate(editingHotspot.id, {
          label: editingHotspot.label,
          description: editingHotspot.description
        });
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
    <div className="fixed left-24 top-0 w-80 h-full bg-white border-r border-gray-200 z-30 flex flex-col shadow-lg">
      <div className="p-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Hotspot Manager</h2>
        <p className="text-sm text-gray-500 mt-0.5">Edit and manage annotations</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {hotspots.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="text-5xl mb-3 opacity-40">🎯</div>
            <p className="text-sm font-medium text-gray-900">No hotspots yet</p>
            <p className="text-xs text-gray-500 mt-1">Use the lasso tool to create one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {hotspots.map((hotspot) => (
              <div
                key={hotspot.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedHotspot === hotspot.id
                    ? 'border-blue-500 bg-blue-50'
                    : hoveredHotspot === hotspot.id
                    ? 'border-blue-300 bg-blue-50/50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedHotspot(hotspot.id)}
                onMouseEnter={() => onHotspotHover?.(hotspot.id)}
                onMouseLeave={() => onHotspotHover?.(null)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-medium text-sm text-gray-900 truncate">{hotspot.label}</h3>
                    {hotspot.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{hotspot.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditHotspot(hotspot);
                      }}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHotspot(hotspot.id);
                      }}
                      className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors text-sm"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingHotspot && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <h3 className="font-medium text-sm text-gray-900 mb-3">Edit Hotspot</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
              <input
                type="text"
                value={editingHotspot.label}
                onChange={(e) => setEditingHotspot({
                  ...editingHotspot,
                  label: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="Enter hotspot name..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Description (optional)</label>
              <textarea
                value={editingHotspot.description || ''}
                onChange={(e) => setEditingHotspot({
                  ...editingHotspot,
                  description: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
                placeholder="Add a description..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveHotspot}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
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
