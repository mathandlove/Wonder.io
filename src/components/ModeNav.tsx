import React from 'react';

interface ModeNavProps {
  currentMode: 'map' | 'story';
  onModeChange: (mode: 'map' | 'story') => void;
}

const ModeNav: React.FC<ModeNavProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200">
      <div className="flex gap-2 p-2">
        <button
          onClick={() => onModeChange('map')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            currentMode === 'map'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🗺️ Map v1.2
        </button>
        <button
          onClick={() => onModeChange('story')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            currentMode === 'story'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📖 Story v1.2
        </button>
      </div>
    </div>
  );
};

export default ModeNav;