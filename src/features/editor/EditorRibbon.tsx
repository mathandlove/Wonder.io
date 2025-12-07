/**
 * Editor Ribbon Component
 *
 * A professional Word-style ribbon toolbar with tabs, grouped tools, and modern styling.
 * Implements Microsoft Fluent Design principles for a polished editing experience.
 */
import React, { useState } from 'react';

interface EditorRibbonProps {
  activeTool: string | null;
  onToolSelect: (tool: string | null) => void;
  onClearAll?: () => void;
  onChangeImage?: () => void;
  onGenerateThumbnails?: () => void;
  hotspotCount: number;
  currentImage: string | null;
  isSaving?: boolean;
  isGeneratingThumbnails?: boolean;
  isMapMode?: boolean;
}

type TabId = 'clue-image' | 'map' | 'ai-generation' | 'story-review';

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

// SVG Icons for professional appearance
const Icons = {
  lasso: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M15 8a3 3 0 1 0-6 0c0 1.657 1.5 3 3 5s3 3.343 3 5a3 3 0 1 1-6 0" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13c-1.5-2-3-3.343-3-5a3 3 0 0 1 6 0c0 1.657-1.5 3-3 5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 9m0 8V9m0 0l-6-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  path: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M13.5 3H12H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H11M13.5 3L19 8.625M13.5 3V7.625C13.5 8.17728 13.9477 8.625 14.5 8.625H19M19 8.625V11.8125" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 15L14.5 18L17.5 21" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 18H21.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  thumbnails: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  pen: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  ),
  palette: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.38-.63-.38-1.04 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="11.5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="16.5" cy="11.5" r="1.5" fill="currentColor" />
    </svg>
  ),
};

const EditorRibbon: React.FC<EditorRibbonProps> = ({
  activeTool,
  onToolSelect,
  onClearAll,
  onChangeImage,
  onGenerateThumbnails,
  hotspotCount,
  currentImage,
  isSaving = false,
  isGeneratingThumbnails = false,
  isMapMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('clue-image');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'clue-image', label: 'Clue Image' },
    { id: 'map', label: 'Map' },
    { id: 'ai-generation', label: 'AI Generation' },
    { id: 'story-review', label: 'Story Review' },
  ];

  // Handle tab change - auto-activate tools when certain tabs are selected
  const handleTabChange = (tabId: TabId) => {
    // For tabs that open fullscreen editors, call onToolSelect first
    // This ensures the parent component switches to fullscreen mode immediately
    if (tabId === 'ai-generation') {
      onToolSelect('image-generator');
    } else if (tabId === 'clue-image') {
      onToolSelect('clue-editor');
    } else if (tabId === 'story-review') {
      onToolSelect('story-review');
    } else if (tabId === 'map') {
      onToolSelect('map-editor');
    }
    setActiveTab(tabId);
  };

  const renderToolButton = (tool: Tool, size: 'small' | 'large' = 'small') => {
    const isActive = activeTool === tool.id;
    const isLarge = size === 'large';

    return (
      <button
        key={tool.id}
        onClick={() => onToolSelect(isActive ? null : tool.id)}
        title={tool.description}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: isLarge ? 12 : 10,
          paddingBottom: isLarge ? 12 : 10,
          paddingLeft: isLarge ? 20 : 16,
          paddingRight: isLarge ? 20 : 16,
          minWidth: isLarge ? 80 : 64,
          borderRadius: 8,
          backgroundColor: isActive ? '#e6f4f4' : 'transparent',
          color: isActive ? '#4a9290' : '#4b5563',
          border: isActive ? '1px solid #a8d4d2' : '1px solid transparent',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ width: isLarge ? 24 : 20, height: isLarge ? 24 : 20, marginBottom: isLarge ? 6 : 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {tool.icon}
        </div>
        <span style={{ fontWeight: 500, lineHeight: 1.2, fontSize: isLarge ? 12 : 11 }}>
          {tool.name}
        </span>
      </button>
    );
  };

  const renderToolGroup = (title: string, tools: Tool[], size: 'small' | 'large' = 'small', isLast: boolean = false) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderRight: isLast ? 'none' : '1px solid #e5e7eb',
      paddingRight: isLast ? 0 : 20,
      marginRight: isLast ? 0 : 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flex: 1 }}>
        {tools.map(tool => renderToolButton(tool, size))}
      </div>
      <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </div>
    </div>
  );

  // Clue Image tab tools - for annotating clue images with hotspots
  const clueImageTools = {
    selection: [
      { id: 'lasso', name: 'Select', icon: Icons.lasso, description: 'Draw freehand hotspot regions' },
    ],
    manage: [
      { id: 'config-highlights', name: 'Manage', icon: Icons.settings, description: 'View and edit hotspots' },
    ],
  };

  // Map tab tools - for annotating maps with trails and locations
  const mapTools = {
    drawing: [
      { id: 'map-trail', name: 'Lasso', icon: Icons.lasso, description: 'Draw location regions on map' },
      { id: 'create-path', name: 'Draw Path', icon: Icons.path, description: 'Draw paths between locations' },
    ],
    manage: [
      { id: 'config-highlights', name: 'Locations', icon: Icons.target, description: 'Manage map locations' },
      { id: 'manage-paths', name: 'Paths', icon: Icons.list, description: 'Manage and reorder paths' },
    ],
  };


  const renderTabContent = () => {
    switch (activeTab) {
      case 'clue-image':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Open Full Editor Button */}
            <button
              onClick={() => onToolSelect('clue-editor')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 24px',
                backgroundColor: '#4a9290',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(74, 146, 144, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ width: 20, height: 20 }}>{Icons.target}</div>
              <span>Open Clue Image Editor</span>
            </button>

            {/* Info Text */}
            <div style={{ color: '#6b7280', fontSize: 13 }}>
              Create and manage hotspots on clue images
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, marginLeft: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, backgroundColor: '#f9fafb', borderRadius: 6 }}>
                <div style={{ color: '#6b7280' }}>{Icons.target}</div>
                <span style={{ fontWeight: 600, color: '#374151' }}>{hotspotCount}</span>
                <span style={{ color: '#6b7280', fontSize: 12 }}>hotspot{hotspotCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        );

      case 'map':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Open Full Map Editor Button */}
            <button
              onClick={() => onToolSelect('map-editor')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 24px',
                backgroundColor: '#4a9290',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(74, 146, 144, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ width: 20, height: 20 }}>{Icons.map}</div>
              <span>Open Map Editor</span>
            </button>

            {/* Info Text */}
            <div style={{ color: '#6b7280', fontSize: 13 }}>
              Create and manage locations and paths on maps
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, marginLeft: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, backgroundColor: '#f9fafb', borderRadius: 6 }}>
                <div style={{ color: '#6b7280' }}>{Icons.target}</div>
                <span style={{ fontWeight: 600, color: '#374151' }}>{hotspotCount}</span>
                <span style={{ color: '#6b7280', fontSize: 12 }}>location{hotspotCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        );

      case 'ai-generation':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6b7280' }}>
            <div style={{ width: 24, height: 24 }}>{Icons.sparkles}</div>
            <span style={{ fontSize: 14, fontWeight: 500 }}>AI Image Generation Active</span>
          </div>
        );

      case 'story-review':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Open Story Review Button */}
            <button
              onClick={() => onToolSelect('story-review')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 24px',
                backgroundColor: '#4a9290',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(74, 146, 144, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}>
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
              </svg>
              <span>Open Story Review</span>
            </button>

            {/* Info Text */}
            <div style={{ color: '#6b7280', fontSize: 13 }}>
              Navigate through scenes and edit JSON properties
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-300 shadow-sm">
      {/* Title Bar - Compact but professional */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#4a9290', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {Icons.target}
            </div>
            <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em' }}>Wonder Editor</span>
          </div>
          {isMapMode && (
            <span style={{ padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
              Map Mode
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' }}>
            {isSaving ? (
              <>
                <svg style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span style={{ opacity: 0.9 }}>Saving...</span>
              </>
            ) : (
              <>
                <svg style={{ width: 14, height: 14, color: '#a7f3d0' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ opacity: 0.9 }}>All changes saved</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Tabs - Word-style: text only, centered, underline on active */}
      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', paddingLeft: 16, paddingRight: 16 }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                position: 'relative',
                paddingTop: 16,
                paddingBottom: 16,
                paddingLeft: 24,
                paddingRight: 24,
                marginRight: 8,
                fontSize: 15,
                fontWeight: 500,
                color: isActive ? '#4a9290' : '#4b5563',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span>{tab.label}</span>
              {/* Underline indicator for active tab */}
              {isActive && (
                <div style={{ position: 'absolute', bottom: 0, left: 16, right: 16, height: 3, backgroundColor: '#4a9290', borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
              )}
            </button>
          );
        })}

        {/* Spacer to push right-side items */}
        <div style={{ flex: 1 }} />

        {/* Quick access items on the right of tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 12, paddingBottom: 6 }}>
          {currentImage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 10, paddingTop: 4, paddingBottom: 4, backgroundColor: 'white', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }}>
              <span style={{ color: '#6b7280' }}>{Icons.target}</span>
              <span style={{ fontWeight: 600, color: '#374151' }}>{hotspotCount}</span>
              <span style={{ color: '#9ca3af' }}>hotspot{hotspotCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ribbon Content - More generous padding */}
      <div style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: 'white', minHeight: 80, borderTop: '1px solid #f3f4f6' }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default EditorRibbon;
