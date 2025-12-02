/**
 * Path Manager Sidebar
 *
 * Displays a list of all paths with editing capabilities.
 * Professional Fluent-style design with drag-and-drop reordering.
 */
import React, { useState } from 'react';
import type { MapPath } from '@shared/types/hotspot';

// SVG Icons
const Icons = {
  path: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  drag: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <circle cx="8" cy="6" r="1.5" />
      <circle cx="16" cy="6" r="1.5" />
      <circle cx="8" cy="12" r="1.5" />
      <circle cx="16" cy="12" r="1.5" />
      <circle cx="8" cy="18" r="1.5" />
      <circle cx="16" cy="18" r="1.5" />
    </svg>
  ),
  chevronUp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

interface PathManagerProps {
  isActive: boolean;
  paths: MapPath[];
  onPathsChange: (paths: MapPath[]) => void;
  onPathDelete?: (id: string) => void;
  onPathHover?: (id: string | null) => void;
  hoveredPath?: string | null;
  onClose?: () => void;
}

const PathManager: React.FC<PathManagerProps> = ({
  isActive,
  paths,
  onPathsChange,
  onPathDelete,
  onPathHover,
  hoveredPath,
  onClose
}) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [draggedPath, setDraggedPath] = useState<string | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);

  if (!isActive) return null;

  const handleDeletePath = (id: string) => {
    if (window.confirm('Are you sure you want to delete this path?')) {
      if (onPathDelete) {
        onPathDelete(id);
      } else {
        const updatedPaths = paths.filter(p => p.id !== id);
        // Renumber remaining paths
        const renumberedPaths = updatedPaths.map((p, index) => ({
          ...p,
          orderNumber: index + 1
        }));
        onPathsChange(renumberedPaths);
      }

      if (selectedPath === id) {
        setSelectedPath(null);
      }
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newPaths = [...paths];
    [newPaths[index - 1], newPaths[index]] = [newPaths[index], newPaths[index - 1]];
    // Renumber after reorder
    const renumberedPaths = newPaths.map((p, i) => ({
      ...p,
      orderNumber: i + 1
    }));
    onPathsChange(renumberedPaths);
  };

  const handleMoveDown = (index: number) => {
    if (index === paths.length - 1) return;
    const newPaths = [...paths];
    [newPaths[index], newPaths[index + 1]] = [newPaths[index + 1], newPaths[index]];
    // Renumber after reorder
    const renumberedPaths = newPaths.map((p, i) => ({
      ...p,
      orderNumber: i + 1
    }));
    onPathsChange(renumberedPaths);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete ALL paths? This cannot be undone.')) {
      onPathsChange([]);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, pathId: string) => {
    setDraggedPath(pathId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pathId);
  };

  const handleDragOver = (e: React.DragEvent, pathId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedPath !== pathId) {
      setDragOverPath(pathId);
    }
  };

  const handleDragLeave = () => {
    setDragOverPath(null);
  };

  const handleDrop = (e: React.DragEvent, targetPathId: string) => {
    e.preventDefault();
    setDragOverPath(null);

    if (!draggedPath || draggedPath === targetPathId) {
      setDraggedPath(null);
      return;
    }

    // Find indices in sorted array
    const draggedIndex = sortedPaths.findIndex(p => p.id === draggedPath);
    const targetIndex = sortedPaths.findIndex(p => p.id === targetPathId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedPath(null);
      return;
    }

    // Reorder paths
    const newPaths = [...sortedPaths];
    const [removed] = newPaths.splice(draggedIndex, 1);
    newPaths.splice(targetIndex, 0, removed);

    // Renumber after reorder
    const renumberedPaths = newPaths.map((p, i) => ({
      ...p,
      orderNumber: i + 1
    }));

    onPathsChange(renumberedPaths);
    setDraggedPath(null);
  };

  const handleDragEnd = () => {
    setDraggedPath(null);
    setDragOverPath(null);
  };

  // Sort paths by orderNumber for display
  const sortedPaths = [...paths].sort((a, b) => a.orderNumber - b.orderNumber);

  return (
    <div className="fixed left-0 top-[176px] w-80 h-[calc(100vh-176px-24px)] bg-white border-r border-gray-200 z-30 flex flex-col shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-blue-600">{Icons.path}</div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Path Manager</h2>
              <p className="text-xs text-gray-500">{sortedPaths.length} path{sortedPaths.length !== 1 ? 's' : ''}</p>
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
        {sortedPaths.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <div className="text-gray-400">{Icons.path}</div>
            </div>
            <p className="text-sm font-medium text-gray-900">No paths yet</p>
            <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
              Use the Draw Path tool to create trails on your map
            </p>
          </div>
        ) : (
          <div className="p-2">
            {sortedPaths.map((path, index) => (
              <div
                key={path.id}
                draggable
                onDragStart={(e) => handleDragStart(e, path.id)}
                onDragOver={(e) => handleDragOver(e, path.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, path.id)}
                onDragEnd={handleDragEnd}
                className={`group relative mb-1 rounded-lg transition-all cursor-grab active:cursor-grabbing ${
                  draggedPath === path.id
                    ? 'opacity-50 bg-blue-100 ring-2 ring-blue-300'
                    : dragOverPath === path.id
                    ? 'bg-blue-50 ring-2 ring-blue-400'
                    : selectedPath === path.id
                    ? 'bg-blue-50 ring-1 ring-blue-200'
                    : hoveredPath === path.id
                    ? 'bg-blue-50/50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedPath(path.id)}
                onMouseEnter={() => onPathHover?.(path.id)}
                onMouseLeave={() => onPathHover?.(null)}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Drag handle */}
                  <div className="text-gray-300 group-hover:text-gray-400 transition-colors">
                    {Icons.drag}
                  </div>

                  {/* Path number badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    selectedPath === path.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-white'
                  }`}>
                    {path.orderNumber}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">Path {path.orderNumber}</h3>
                    <p className="text-xs text-gray-500">{path.points.length} point{path.points.length !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveUp(index);
                      }}
                      disabled={index === 0}
                      className={`p-1.5 rounded-md transition-colors ${
                        index === 0
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:text-blue-600 hover:bg-blue-100'
                      }`}
                      title="Move up"
                    >
                      {Icons.chevronUp}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveDown(index);
                      }}
                      disabled={index === sortedPaths.length - 1}
                      className={`p-1.5 rounded-md transition-colors ${
                        index === sortedPaths.length - 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:text-blue-600 hover:bg-blue-100'
                      }`}
                      title="Move down"
                    >
                      {Icons.chevronDown}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePath(path.id);
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"
                      title="Delete path"
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

      {/* Footer with clear all button */}
      {sortedPaths.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-3">
          <button
            onClick={handleClearAll}
            className="w-full px-4 py-2 bg-white text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            {Icons.trash}
            Clear All Paths
          </button>
        </div>
      )}
    </div>
  );
};

export default PathManager;
