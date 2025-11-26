/**
 * Map Selector Component
 *
 * Displays a gallery of available maps from story bundles.
 * Allows users to select which map to annotate with trail locations.
 * Shows the colored version of each map for selection.
 */
import React, { useState, useEffect } from 'react';

interface MapInfo {
  path: string;           // Path to B&W map (e.g., /stories/gingerbread.bundle/maps/cityMap.png)
  coloredPath: string;    // Path to colored map (e.g., /stories/gingerbread.bundle/maps/cityMapColored.png)
  name: string;
  bundle: string;
}

interface MapSelectorProps {
  onMapSelect: (mapPath: string, coloredMapPath: string) => void;
  currentMap: string | null;
}

const MapSelector: React.FC<MapSelectorProps> = ({ onMapSelect, currentMap }) => {
  const [maps, setMaps] = useState<MapInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadMaps = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:3001/api/bundle/maps?bundle=gingerbread.bundle`);
        if (!response.ok) {
          throw new Error(`Failed to load maps: ${response.status}`);
        }
        const data = await response.json();

        setMaps(data.maps || []);
        console.log(`Loaded ${data.maps?.length || 0} maps`);
      } catch (err) {
        console.error('Failed to load maps:', err);
        setMaps([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMaps();
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-semibold text-gray-900">Select a Map</h1>
        <p className="text-sm text-gray-500 mt-1">Choose a map from the Gingerbread bundle to mark trail locations</p>
      </div>

      {/* Map Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 opacity-40">⏳</div>
            <p className="text-sm font-medium text-gray-900">Loading maps...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {maps.map((map) => (
            <div
              key={map.path}
              onClick={() => onMapSelect(map.path, map.coloredPath)}
              className={`group relative bg-white rounded-lg overflow-hidden cursor-pointer transition-all border-2 ${
                currentMap === map.path
                  ? 'border-green-500 ring-2 ring-green-200'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {/* Map Preview - show colored version */}
              <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={map.coloredPath}
                  alt={map.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="12"%3ENo Map%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>

              {/* Info */}
              <div className="p-3 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-900 truncate">{map.name}</h3>
              </div>

              {/* Selected Indicator */}
              {currentMap === map.path && (
                <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg text-sm font-bold">
                  ✓
                </div>
              )}
            </div>
          ))}
          </div>
        )}

        {!isLoading && maps.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 opacity-40">🗺️</div>
            <p className="text-sm font-medium text-gray-900">No maps found</p>
            <p className="text-xs text-gray-500 mt-1">Make sure maps folder exists in the bundle</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapSelector;
