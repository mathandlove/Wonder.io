import React from 'react';

interface EditToolbarProps {
  activeTool: string | null;
  onToolSelect: (tool: string | null) => void;
  onClearSelections?: () => void;
}

const EditToolbar: React.FC<EditToolbarProps> = ({ activeTool, onToolSelect, onClearSelections }) => {
  const tools = [
    {
      id: 'lasso',
      name: 'Lasso',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7.5 7.5 L16.5 7.5 L16.5 16.5 L7.5 16.5 Z" strokeDasharray="2 2" />
          <circle cx="7.5" cy="7.5" r="2" fill="currentColor" />
          <circle cx="16.5" cy="7.5" r="2" fill="currentColor" />
          <circle cx="16.5" cy="16.5" r="2" fill="currentColor" />
          <circle cx="7.5" cy="16.5" r="2" fill="currentColor" />
        </svg>
      )
    },
    {
      id: 'config-highlights',
      name: 'Config',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeDasharray="1 2" strokeOpacity="0.5" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-16 h-full bg-gray-800 border-l border-gray-700 flex flex-col">
      <div className="p-2 border-b border-gray-700">
        <div className="text-xs text-gray-400 uppercase tracking-wider text-center">
          Tools
        </div>
      </div>
      
      <div className="flex-1 p-2 flex flex-col gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`
              p-2 rounded-lg transition-all duration-200 flex flex-col items-center gap-1
              ${activeTool === tool.id 
                ? 'bg-blue-600 text-white shadow-inner' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}
            `}
            onClick={() => onToolSelect(activeTool === tool.id ? null : tool.id)}
            aria-label={tool.name}
            title={tool.name}
          >
            {tool.icon}
            <span className="text-xs">{tool.name}</span>
          </button>
        ))}
      </div>
      
      <div className="p-2 border-t border-gray-700 space-y-2">
        <button
          className="w-full p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-all duration-200"
          onClick={() => onToolSelect(null)}
          aria-label="Clear Tool"
          title="Clear active tool"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        
        {onClearSelections && (
          <button
            className="w-full p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all duration-200"
            onClick={onClearSelections}
            aria-label="Clear All Selections"
            title="Delete all saved selections"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
              <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default EditToolbar;