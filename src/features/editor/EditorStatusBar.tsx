/**
 * Editor Status Bar Component
 *
 * A professional status bar at the bottom of the editor, similar to Word/VS Code.
 * Shows contextual information about the current editing state.
 */
import React from 'react';

interface EditorStatusBarProps {
  hotspotCount: number;
  pathCount?: number;
  currentImage: string | null;
  isMapMode: boolean;
  activeTool: string | null;
  isSaving: boolean;
  zoom?: number;
}

const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
  hotspotCount,
  pathCount = 0,
  currentImage,
  isMapMode,
  activeTool,
  isSaving,
  zoom = 100,
}) => {
  const getToolName = (tool: string | null): string => {
    switch (tool) {
      case 'lasso': return 'Lasso Selection';
      case 'config-highlights': return 'Hotspot Manager';
      case 'map-trail': return 'Map Trail';
      case 'create-path': return 'Path Drawing';
      case 'manage-paths': return 'Path Manager';
      case 'image-generator': return 'AI Image Generator';
      default: return 'Ready';
    }
  };

  const getFileName = (path: string | null): string => {
    if (!path) return 'No file selected';
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 24,
      backgroundColor: '#4a9290',
      color: 'white',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      zIndex: 50,
      boxShadow: '0 -1px 3px rgba(0,0,0,0.1)',
    }}>
      {/* Left section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Current Tool */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontWeight: 500 }}>{getToolName(activeTool)}</span>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)' }} />

        {/* Mode indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isMapMode ? (
            <>
              <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 9m0 8V9m0 0l-6-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Map Mode</span>
            </>
          ) : (
            <>
              <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span>Image Mode</span>
            </>
          )}
        </div>
      </div>

      {/* Center section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* File name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
          <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
          <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getFileName(currentImage)}</span>
        </div>
      </div>

      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Hotspot count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <span>{hotspotCount} hotspot{hotspotCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Path count (if in map mode) */}
        {isMapMode && (
          <>
            <div style={{ width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{pathCount} path{pathCount !== 1 ? 's' : ''}</span>
            </div>
          </>
        )}

        {/* Separator */}
        <div style={{ width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)' }} />

        {/* Zoom level */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
          </svg>
          <span>{zoom}%</span>
        </div>

        {/* Save status */}
        <div style={{ width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isSaving ? (
            <>
              <svg style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Saved</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorStatusBar;
