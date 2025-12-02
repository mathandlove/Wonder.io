/**
 * Config Highlights Sidebar
 *
 * Displays a list of all hotspots with editing capabilities.
 * Professional Fluent-style design with clean typography and subtle interactions.
 */
import React, { useState } from 'react';
import type { Hotspot } from '@shared/types/hotspot';

// SVG Icons
const Icons = {
  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

interface ConfigHighlightsProps {
  isActive: boolean;
  hotspots: Hotspot[];
  onHotspotsChange: (hotspots: Hotspot[]) => void;
  onHotspotUpdate?: (id: string, updates: Partial<Hotspot>) => Promise<void>;
  onHotspotDelete?: (id: string) => Promise<void>;
  onHotspotHover?: (id: string | null) => void;
  hoveredHotspot?: string | null;
  onClose?: () => void;
}

const ConfigHighlights: React.FC<ConfigHighlightsProps> = ({
  isActive,
  hotspots,
  onHotspotsChange,
  onHotspotUpdate,
  onHotspotDelete,
  onHotspotHover,
  hoveredHotspot,
  onClose
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
    <div className="fixed left-0 top-[176px] w-80 h-[calc(100vh-176px-24px)] bg-white border-r border-gray-200 z-30 flex flex-col shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-blue-600">{Icons.target}</div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Hotspot Manager</h2>
              <p className="text-xs text-gray-500">{hotspots.length} annotation{hotspots.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Close panel"
            >
              {Icons.close}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {hotspots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <div className="text-gray-400">{Icons.target}</div>
            </div>
            <p className="text-sm font-medium text-gray-900">No hotspots yet</p>
            <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
              Use the Lasso tool to draw regions on your image
            </p>
          </div>
        ) : (
          <div className="p-2">
            {hotspots.map((hotspot, index) => (
              <div
                key={hotspot.id}
                className={`group relative mb-1 rounded-lg transition-all cursor-pointer ${
                  selectedHotspot === hotspot.id
                    ? 'bg-blue-50 ring-1 ring-blue-200'
                    : hoveredHotspot === hotspot.id
                    ? 'bg-blue-50/50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedHotspot(hotspot.id)}
                onMouseEnter={() => onHotspotHover?.(hotspot.id)}
                onMouseLeave={() => onHotspotHover?.(null)}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Index badge */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    selectedHotspot === hotspot.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {hotspot.label}
                    </h3>
                    {hotspot.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {hotspot.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditHotspot(hotspot);
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                      title="Edit hotspot"
                    >
                      {Icons.edit}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHotspot(hotspot.id);
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"
                      title="Delete hotspot"
                    >
                      {Icons.trash}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Panel */}
      {editingHotspot && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Edit Hotspot</h3>
            <button
              onClick={handleCancelEdit}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              {Icons.close}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={editingHotspot.label}
                onChange={(e) => setEditingHotspot({
                  ...editingHotspot,
                  label: e.target.value
                })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                placeholder="Enter hotspot name..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Description
              </label>
              <textarea
                value={editingHotspot.description || ''}
                onChange={(e) => setEditingHotspot({
                  ...editingHotspot,
                  description: e.target.value
                })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-shadow"
                placeholder="Add a description..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveHotspot}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              Save Changes
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
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
