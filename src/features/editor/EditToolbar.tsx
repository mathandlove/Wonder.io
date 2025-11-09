/**
 * Edit Toolbar Component
 *
 * Provides tool selection buttons and utility actions for the hotspot editor.
 * Includes lasso tool, config mode, export, and clear functions.
 */
import React from 'react';

interface EditToolbarProps {
  activeTool: string | null;
  onToolSelect: (tool: string | null) => void;
  onClearAll?: () => void;
  onChangeImage?: () => void;
  hotspotCount: number;
  currentImage: string | null;
  isSaving?: boolean;
}

const EditToolbar: React.FC<EditToolbarProps> = ({
  activeTool,
  onToolSelect,
  onClearAll,
  onChangeImage,
  hotspotCount,
  currentImage,
  isSaving = false
}) => {
  const tools = [
    {
      id: 'lasso',
      name: 'Lasso Tool',
      icon: '✏️',
      description: 'Draw freehand hotspot regions'
    },
    {
      id: 'config-highlights',
      name: 'Manage',
      icon: '⚙️',
      description: 'View and edit hotspots'
    }
  ];

  return (
    <div className="fixed left-0 top-0 h-full bg-gradient-to-b from-indigo-50 to-white border-r-4 border-indigo-400 z-40 flex flex-col w-24 shadow-xl">
      {/* Logo/Title */}
      <div className="p-4 border-b border-purple-300 bg-gradient-to-b from-purple-50 to-pink-50">
        <div className="text-4xl text-center transform hover:scale-110 transition-transform">🎯</div>
        <div className="text-sm text-purple-700 text-center mt-2 font-bold tracking-wide uppercase">Editor</div>
      </div>

      {/* Tools */}
      <div className="flex-1 py-3 px-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolSelect(activeTool === tool.id ? null : tool.id)}
            className={`w-full p-3 mb-2 flex flex-col items-center justify-center transition-all group relative rounded-lg ${
              activeTool === tool.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
            title={tool.description}
          >
            <span className="text-2xl mb-1">{tool.icon}</span>
            <span className="text-[9px] font-medium">{tool.name}</span>

            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg z-50">
              {tool.description}
            </div>
          </button>
        ))}
      </div>

      {/* Hotspot Manager Section - Always visible when image is loaded */}
      {currentImage && (
        <div className="border-t border-indigo-200 bg-gradient-to-b from-blue-50 to-indigo-50">
          {/* Hotspot count */}
          <div className="px-3 py-3 border-b border-indigo-200">
            <div className="text-center">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-xl font-bold text-indigo-700">{hotspotCount}</div>
              <div className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wide">Hotspot{hotspotCount !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Change Image Button */}
          {onChangeImage && (
            <div className="px-2 py-3">
              <button
                onClick={onChangeImage}
                className="w-full p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-xs flex flex-col items-center font-medium shadow-sm"
                title="Change the current image"
              >
                <span className="text-lg mb-0.5">📁</span>
                <span>Change</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-gray-200 p-2 space-y-2 bg-white">
        {/* Auto-save indicator */}
        <div className="w-full p-2 bg-gray-50 rounded-lg text-xs flex flex-col items-center font-medium">
          <span className="text-lg mb-0.5">{isSaving ? '⏳' : '💾'}</span>
          <span className={isSaving ? 'text-blue-600' : 'text-green-600'}>
            {isSaving ? 'Saving...' : 'Saved'}
          </span>
        </div>

        {onClearAll && hotspotCount > 0 && (
          <button
            onClick={onClearAll}
            className="w-full p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-xs flex flex-col items-center font-medium"
            title="Clear all hotspots"
          >
            <span className="text-lg mb-0.5">🗑️</span>
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default EditToolbar;
