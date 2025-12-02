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

  // SVG Icons
  const MapIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12">
      <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 9m0 8V9m0 0l-6-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const CheckIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="text-green-600">{MapIcon}</div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Select a Map</h1>
            <p className="text-sm text-gray-500">Choose a map to mark trail locations</p>
          </div>
        </div>
      </div>

      {/* Map Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 animate-pulse">
              <div className="text-gray-400">{MapIcon}</div>
            </div>
            <p className="text-sm font-medium text-gray-600">Loading maps...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {maps.map((map) => (
            <div
              key={map.path}
              onClick={() => onMapSelect(map.path, map.coloredPath)}
              className={`group relative bg-white rounded-lg overflow-hidden cursor-pointer transition-all shadow-sm ${
                currentMap === map.path
                  ? 'ring-2 ring-green-500 shadow-md'
                  : 'hover:shadow-md border border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Map Preview - show colored version */}
              <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={map.coloredPath}
                  alt={map.name}
                  className="w-full h-full object-contain transition-transform group-hover:scale-105"
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
                <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                  {CheckIcon}
                </div>
              )}
            </div>
          ))}
          </div>
        )}

        {!isLoading && maps.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <div className="text-gray-400">{MapIcon}</div>
            </div>
            <p className="text-sm font-medium text-gray-900">No maps found</p>
            <p className="text-xs text-gray-500 mt-1">Make sure maps folder exists in the bundle</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapSelector;
