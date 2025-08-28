import React, { useState } from 'react';

interface Hotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  description: string;
}

interface RightEditPanelProps {
  activeTool: string | null;
  onToolSelect: (tool: string | null) => void;
  onClearSelections?: () => void;
  onExpandChange?: (expanded: boolean) => void;
  hotspots?: Hotspot[];
  onHotspotsChange?: (hotspots: Hotspot[]) => void;
  onHotspotUpdate?: (id: string, updates: any) => Promise<void>;
  onHotspotDelete?: (id: string) => Promise<void>;
  onHotspotHover?: (hotspotId: string | null) => void;
  hoveredHotspot?: string | null;
}

const RightEditPanel: React.FC<RightEditPanelProps> = ({ 
  activeTool, 
  onToolSelect,
  onClearSelections,
  onExpandChange,
  hotspots = [],
  onHotspotsChange,
  onHotspotUpdate,
  onHotspotDelete,
  onHotspotHover,
  hoveredHotspot
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingHotspot, setEditingHotspot] = useState<Hotspot | null>(null);

  const handleToolClick = (tool: string) => {
    if (activeTool === tool) {
      onToolSelect(null);
    } else {
      onToolSelect(tool);
    }
  };

  const handleEditHotspot = (hotspot: Hotspot) => {
    setEditingHotspot({ ...hotspot });
  };

  const handleSaveHotspot = async () => {
    if (!editingHotspot || !onHotspotUpdate || !onHotspotsChange) return;
    
    try {
      await onHotspotUpdate(editingHotspot.id, { label: editingHotspot.label });
      const updatedHotspots = hotspots.map(h => 
        h.id === editingHotspot.id ? editingHotspot : h
      );
      onHotspotsChange(updatedHotspots);
      setEditingHotspot(null);
    } catch (error) {
      console.error('Error updating hotspot:', error);
    }
  };

  const handleDeleteHotspot = async (hotspotId: string) => {
    if (!onHotspotDelete || !onHotspotsChange) return;
    
    try {
      await onHotspotDelete(hotspotId);
      const updatedHotspots = hotspots.filter(h => h.id !== hotspotId);
      onHotspotsChange(updatedHotspots);
    } catch (error) {
      console.error('Error deleting hotspot:', error);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100vh',
        backgroundColor: '#6b21a8',
        borderLeft: '2px solid #581c87',
        transition: 'all 0.3s',
        zIndex: 50,
        width: isExpanded ? '256px' : '8px'
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => {
          const newExpanded = !isExpanded;
          setIsExpanded(newExpanded);
          if (onExpandChange) {
            onExpandChange(newExpanded);
          }
        }}
        style={{
          position: 'absolute',
          left: '-32px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: '#6b21a8',
          color: 'white',
          padding: '8px',
          borderRadius: '8px 0 0 8px',
          border: 'none',
          cursor: 'pointer'
        }}
        aria-label={isExpanded ? 'Minimize panel' : 'Expand panel'}
      >
        {isExpanded ? '→' : '←'}
      </button>

      {/* Panel Content */}
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {isExpanded ? (
          <>
            <h3 style={{ color: 'white', fontWeight: 'bold', marginBottom: '16px' }}>Edit Tools</h3>
            
            {activeTool && (
              <div style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {activeTool === 'lasso' && 'Lasso Tool Active - Click and drag to select'}
                {activeTool === 'config-highlights' && 'Config Highlights Active'}
              </div>
            )}


            {/* Config Highlights Tool */}
            <button
              onClick={() => handleToolClick('config-highlights')}
              style={{
                width: '100%',
                marginBottom: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                backgroundColor: activeTool === 'config-highlights' ? '#7c3aed' : '#581c87',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ marginRight: '8px' }}
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              Config Highlights
            </button>

            {/* Config Highlights Content */}
            {(activeTool === 'config-highlights' || activeTool === 'lasso') && (
              <div style={{ marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ color: 'white', fontSize: '14px', margin: 0 }}>Hotspots ({hotspots.length})</h4>
                  <button
                    onClick={() => onToolSelect('lasso')}
                    style={{
                      backgroundColor: '#16a34a',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    + Add New
                  </button>
                </div>
                
                {hotspots.length === 0 ? (
                  <p style={{ color: '#a855f7', fontSize: '12px', fontStyle: 'italic' }}>
                    No hotspots yet. Click "Add New" to create selections.
                  </p>
                ) : (
                  hotspots.map((hotspot) => (
                    <div 
                      key={hotspot.id} 
                      style={{
                        backgroundColor: hoveredHotspot === hotspot.id ? '#16a34a' : '#581c87',
                        padding: '8px',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={() => onHotspotHover?.(hotspot.id)}
                      onMouseLeave={() => onHotspotHover?.(null)}
                    >
                      {editingHotspot?.id === hotspot.id ? (
                        <div>
                          <input
                            type="text"
                            value={editingHotspot.label}
                            onChange={(e) => setEditingHotspot({...editingHotspot, label: e.target.value})}
                            style={{
                              width: '100%',
                              padding: '4px',
                              marginBottom: '8px',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <button
                              onClick={async () => {
                                if (editingHotspot && onHotspotDelete && onHotspotsChange) {
                                  try {
                                    // Delete the current hotspot
                                    await onHotspotDelete(editingHotspot.id);
                                    const updatedHotspots = hotspots.filter(h => h.id !== editingHotspot.id);
                                    onHotspotsChange(updatedHotspots);
                                    
                                    // Store the hotspot info for recreation, including its index
                                    const hotspotIndex = hotspots.findIndex(h => h.id === editingHotspot.id);
                                    const hotspotToReplace = { ...editingHotspot, originalIndex: hotspotIndex };
                                    
                                    // Exit edit mode
                                    setEditingHotspot(null);
                                    
                                    // Store replacement info in a way the lasso tool can access it
                                    // We'll use a data attribute or similar approach
                                    (window as any).replacingHotspot = hotspotToReplace;
                                    
                                    // Activate lasso tool
                                    onToolSelect('lasso');
                                    
                                  } catch (error) {
                                    console.error('Error deleting hotspot for replacement:', error);
                                  }
                                } else {
                                  onToolSelect('lasso');
                                }
                              }}
                              style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '4px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Re-select area"
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M3 3h18v18H3z" strokeDasharray="2 2" />
                              </svg>
                            </button>
                            <button
                              onClick={handleSaveHotspot}
                              style={{
                                backgroundColor: '#16a34a',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                cursor: 'pointer'
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingHotspot(null)}
                              style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                            {hotspot.label}
                          </div>
                          <div style={{ color: '#a855f7', fontSize: '10px', marginTop: '4px' }}>
                            {hotspot.description}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                            <button
                              onClick={() => handleEditHotspot(hotspot)}
                              style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                cursor: 'pointer'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteHotspot(hotspot.id)}
                              style={{
                                backgroundColor: '#dc2626',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

          </>
        ) : null}
      </div>
    </div>
  );
};

export default RightEditPanel;