/**
 * Path Manager Sidebar
 *
 * Displays a list of all paths with editing capabilities.
 * Allows deleting and reordering paths.
 */
import React, { useState } from 'react';
import type { MapPath } from '@shared/types/hotspot';

interface PathManagerProps {
  isActive: boolean;
  paths: MapPath[];
  onPathsChange: (paths: MapPath[]) => void;
  onPathDelete?: (id: string) => void;
  onPathHover?: (id: string | null) => void;
  hoveredPath?: string | null;
}

const PathManager: React.FC<PathManagerProps> = ({
  isActive,
  paths,
  onPathsChange,
  onPathDelete,
  onPathHover,
  hoveredPath
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
    <div className="fixed left-24 top-0 w-80 h-full bg-white border-r border-gray-200 z-30 flex flex-col shadow-lg">
      <div className="p-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Path Manager</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage trail paths</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {sortedPaths.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="text-5xl mb-3 opacity-40">✍️</div>
            <p className="text-sm font-medium text-gray-900">No paths yet</p>
            <p className="text-xs text-gray-500 mt-1">Use the Draw Path tool to create one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedPaths.map((path, index) => (
              <div
                key={path.id}
                draggable
                onDragStart={(e) => handleDragStart(e, path.id)}
                onDragOver={(e) => handleDragOver(e, path.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, path.id)}
                onDragEnd={handleDragEnd}
                className={`p-3 border rounded-lg cursor-grab transition-all ${
                  draggedPath === path.id
                    ? 'opacity-50 border-blue-400 bg-blue-50'
                    : dragOverPath === path.id
                    ? 'border-blue-500 bg-blue-100 border-2'
                    : selectedPath === path.id
                    ? 'border-gray-800 bg-gray-100'
                    : hoveredPath === path.id
                    ? 'border-gray-400 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedPath(path.id)}
                onMouseEnter={() => onPathHover?.(path.id)}
                onMouseLeave={() => onPathHover?.(null)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {/* Drag handle */}
                    <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="5" cy="4" r="1.5" />
                        <circle cx="11" cy="4" r="1.5" />
                        <circle cx="5" cy="8" r="1.5" />
                        <circle cx="11" cy="8" r="1.5" />
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="11" cy="12" r="1.5" />
                      </svg>
                    </div>
                    {/* Path number badge */}
                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                      {path.orderNumber}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-gray-900">Path {path.orderNumber}</h3>
                      <p className="text-xs text-gray-500">{path.points.length} points</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {/* Move up button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveUp(index);
                      }}
                      disabled={index === 0}
                      className={`p-1.5 rounded transition-colors text-sm ${
                        index === 0
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      title="Move up"
                    >
                      ⬆️
                    </button>
                    {/* Move down button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveDown(index);
                      }}
                      disabled={index === sortedPaths.length - 1}
                      className={`p-1.5 rounded transition-colors text-sm ${
                        index === sortedPaths.length - 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      title="Move down"
                    >
                      ⬇️
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePath(path.id);
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

      {/* Footer with clear all button */}
      {sortedPaths.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <button
            onClick={handleClearAll}
            className="w-full px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            Clear All Paths
          </button>
        </div>
      )}
    </div>
  );
};

export default PathManager;
