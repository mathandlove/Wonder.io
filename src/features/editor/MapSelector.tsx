/**
 * Map Selector Component
 *
 * Displays a gallery of available maps from story bundles.
 * Allows users to select which map to annotate with trail locations.
 * Shows the colored version of each map for selection.
 */
import React, { useState, useEffect } from 'react';
import './MapSelector.css';

interface MapInfo {
  path: string;           // Path to map (e.g., /stories/gingerbread.bundle/images/maps/cityMap.png)
  name: string;
  bundle: string;
}

interface MapSelectorProps {
  onMapSelect: (mapPath: string) => void;
  currentMap: string | null;
}

// Icons
const Icons = {
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 9m0 8V9m0 0l-6-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

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

  if (isLoading) {
    return (
      <div className="map-selector">
        <div className="map-selector-loading">
          <div className="map-selector-loading-content">
            <div className="map-selector-loading-icon">
              {Icons.map}
            </div>
            <p>Loading maps...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-selector">
      {/* Header */}
      <div className="map-selector-header">
        <div className="map-selector-header-left">
          <div className="map-selector-icon">{Icons.map}</div>
          <div className="map-selector-title">
            <h1>Select a Map</h1>
            <span className="map-selector-subtitle">Choose a map to mark trail locations</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="map-selector-main">
        {maps.length > 0 ? (
          <div className="map-selector-grid">
            {maps.map((map) => (
              <div
                key={map.path}
                onClick={() => onMapSelect(map.path)}
                className={`map-selector-card ${currentMap === map.path ? 'selected' : ''}`}
              >
                {/* Map Preview */}
                <div className="map-selector-preview">
                  <img
                    src={map.path}
                    alt={map.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f5f7f8" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%235a6a6c" font-family="sans-serif" font-size="12"%3ENo Map%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>

                {/* Info */}
                <div className="map-selector-info">
                  <span className="map-selector-name">{map.name}</span>
                </div>

                {/* Selected Indicator */}
                {currentMap === map.path && (
                  <div className="map-selector-check">
                    {Icons.check}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="map-selector-empty">
            <div className="map-selector-empty-icon">
              {Icons.map}
            </div>
            <p className="map-selector-empty-title">No maps found</p>
            <p className="map-selector-empty-subtitle">Make sure maps folder exists in the bundle</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapSelector;
