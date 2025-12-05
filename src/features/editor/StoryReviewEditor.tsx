/**
 * Story Review Editor Component
 *
 * A full-screen editor for reviewing and editing story scenes.
 * Features:
 * - Left sidebar with navigation arrows to jump between scenes
 * - Center preview showing the scene as it would appear in the app
 * - Right sidebar with editable JSON properties for the current scene
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Scene } from '@core/types/scene';
import { resolveStoryImage } from '@core/data/imageResolver';
import StorySimulator from './StorySimulator';
import ImagePickerModal from './ImagePickerModal';
import type { ImageCategory } from './ImagePickerModal';
import './StoryReviewEditor.css';

// ============================================================================
// Types
// ============================================================================

interface Deposition {
  character: string;
  title: string;
  content: string;
}

interface StoryData {
  title: string;
  storyId: string;
  scenes: Scene[];
  backgroundDescriptions?: Record<string, string>;
  depositions?: Deposition[];
}

interface StoryReviewEditorProps {
  isActive: boolean;
  storyId: string;
  onClose?: () => void;
}

const BACKEND_URL = 'http://localhost:3001';

// ============================================================================
// Icons
// ============================================================================

const Icons = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevronUp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
      <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  spinner: (
    <svg className="story-review-spinner" viewBox="0 0 24 24" fill="none" width="20" height="20">
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  save: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  reset: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

// ============================================================================
// Missing Deposition Warning Helper
// ============================================================================

interface DepositionWarning {
  type: 'missing' | 'no-deposition';
  characterName?: string;
}

/**
 * Checks if a character-flow scene has deposition issues:
 * 1. CharacterDescription that doesn't match any deposition
 * 2. Flow with input marker but no CharacterDescription at all
 * @returns Warning object if issue found, or null if valid/not applicable
 */
function getMissingDeposition(scene: Scene, depositions?: Deposition[]): DepositionWarning | null {
  if (scene.type !== 'character-flow') return null;

  const characterDescription = (scene as any).CharacterDescription;
  const flow = (scene as any).flow as Array<{ type?: string }> | undefined;
  const hasInputMarker = flow?.some(f => f.type === 'input') ?? false;

  // If no CharacterDescription but has input marker, warn about missing deposition
  if (!characterDescription && hasInputMarker) {
    return { type: 'no-deposition' };
  }

  if (!characterDescription) return null;

  // Remove .txt extension if present for matching
  const characterName = characterDescription.endsWith('.txt')
    ? characterDescription.slice(0, -4)
    : characterDescription;

  // Check if this character exists in depositions
  if (!depositions || depositions.length === 0) {
    return { type: 'missing', characterName };
  }

  const found = depositions.some(d => d.character === characterName);
  return found ? null : { type: 'missing', characterName };
}

// ============================================================================
// Scene Type Badge Component
// ============================================================================

function SceneTypeBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    'text': { bg: '#e0f2fe', text: '#0369a1' },
    'image': { bg: '#fce7f3', text: '#be185d' },
    'character-flow': { bg: '#ddd6fe', text: '#7c3aed' },
    'clue-image': { bg: '#d1fae5', text: '#047857' },
    'map': { bg: '#fef3c7', text: '#b45309' },
    'title': { bg: '#fee2e2', text: '#dc2626' },
    'full': { bg: '#e0e7ff', text: '#4338ca' },
    'fail-dance': { bg: '#fecaca', text: '#991b1b' },
    'success-dance': { bg: '#bbf7d0', text: '#166534' },
  };

  const color = colors[type] || { bg: '#f3f4f6', text: '#374151' };

  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: color.bg,
        color: color.text,
        textTransform: 'capitalize',
      }}
    >
      {type}
    </span>
  );
}

// ============================================================================
// JSON Property Editor Component
// ============================================================================

interface PropertyEditorProps {
  scene: Scene;
  sceneIndex: number;
  onChange: (updates: Partial<Scene>) => void;
  onReset: () => void;
  selectedFlowIndex: number | null;
  onFlowItemSelect: (index: number | null) => void;
  onFlowItemChange: (index: number, updates: { text?: string; side?: 'left' | 'right' }) => void;
  onOpenImagePicker: (fieldKey: string, category: ImageCategory) => void;
  selectedClueIndex: number | null;
  onClueSelect: (index: number | null) => void;
  onClueChange: (index: number, updates: { hotspotName?: string; description?: string }) => void;
  depositions?: Deposition[];
}

function PropertyEditor({ scene, sceneIndex, onChange, onReset, selectedFlowIndex, onFlowItemSelect, onFlowItemChange, onOpenImagePicker, selectedClueIndex, onClueSelect, onClueChange, depositions }: PropertyEditorProps) {
  // Check for missing deposition
  const missingDeposition = getMissingDeposition(scene, depositions);

  // Determine which fields should have image pickers
  const getImagePickerCategory = (key: string, sceneType: string): ImageCategory | null => {
    if (key === 'background') return 'backgrounds';
    if (key === 'left-character' || key === 'right-character') return 'characters';
    if (key === 'image') {
      if (sceneType === 'clue-image') return 'clues';
      if (sceneType === 'map') return 'maps';
      return 'story';
    }
    return null;
  };

  // Get editable properties based on scene type
  const getEditableProperties = (scene: Scene): Array<{ key: string; label: string; type: 'text' | 'textarea' | 'select' | 'array' | 'boolean' }> => {
    const baseProps: Array<{ key: string; label: string; type: 'text' | 'textarea' | 'select' | 'array' | 'boolean' }> = [
      { key: 'background', label: 'Background', type: 'text' },
    ];

    switch (scene.type) {
      case 'text':
        return [
          { key: 'text', label: 'Text', type: 'textarea' },
          ...baseProps,
        ];
      case 'image':
        return [
          { key: 'image', label: 'Image Path', type: 'text' },
          { key: 'text', label: 'Caption', type: 'textarea' },
          ...baseProps,
        ];
      case 'character-flow':
        return [
          { key: 'left-character', label: 'Left Character', type: 'text' },
          { key: 'right-character', label: 'Right Character', type: 'text' },
          { key: 'useClues', label: 'Use Clues', type: 'boolean' },
          { key: 'monologue', label: 'Monologue', type: 'boolean' },
          { key: 'requiredAsk', label: 'Required Ask', type: 'boolean' },
          { key: 'question', label: 'Question', type: 'textarea' },
          { key: 'successAnswer', label: 'Success Answer', type: 'textarea' },
          { key: 'hint', label: 'Hint', type: 'textarea' },
          ...baseProps,
        ];
      case 'clue-image':
        return [
          { key: 'image', label: 'Image', type: 'text' },
          { key: 'sceneDescription', label: 'Scene Description', type: 'textarea' },
          ...baseProps,
        ];
      case 'map':
        return [
          { key: 'image', label: 'Map Image', type: 'text' },
          { key: 'location', label: 'Location', type: 'text' },
        ];
      case 'title':
        return [
          { key: 'lvl1', label: 'Title Line 1', type: 'text' },
          { key: 'lvl2', label: 'Title Line 2', type: 'text' },
          { key: 'author', label: 'Author', type: 'text' },
          { key: 'illustrator', label: 'Illustrator', type: 'text' },
          ...baseProps,
        ];
      case 'full':
        return [
          { key: 'text', label: 'Text', type: 'textarea' },
          ...baseProps,
        ];
      default:
        return baseProps;
    }
  };

  const properties = getEditableProperties(scene);

  const handleChange = (key: string, value: any) => {
    onChange({ [key]: value } as Partial<Scene>);
  };

  return (
    <div className="story-review-properties">
      <div className="story-review-properties-header">
        <h3>Scene Properties</h3>
        <button
          className="story-review-reset-btn"
          onClick={onReset}
          title="Reset to original"
        >
          {Icons.reset}
        </button>
      </div>

      <div className="story-review-properties-list">
        {/* Missing Deposition Warning */}
        {missingDeposition && (
          <div className="story-review-warning">
            <span className="story-review-warning-icon">{Icons.warning}</span>
            <span className="story-review-warning-text">
              {missingDeposition.type === 'no-deposition' ? (
                <>This flow has an input scene but no <strong>CharacterDescription</strong>. Add a CharacterDescription to enable AI conversations.</>
              ) : (
                <>Missing deposition for "<strong>{missingDeposition.characterName}</strong>". Add it to the depositions array in story.json.</>
              )}
            </span>
          </div>
        )}

        {/* Scene Type (read-only) */}
        <div className="story-review-property">
          <label>Type</label>
          <div className="story-review-property-value">
            <SceneTypeBadge type={scene.type} />
          </div>
        </div>

        {/* Scene Index (read-only) */}
        <div className="story-review-property">
          <label>Index</label>
          <div className="story-review-property-value">
            <span style={{ color: '#6b7280', fontSize: '14px' }}>#{sceneIndex}</span>
          </div>
        </div>

        {/* Editable Properties */}
        {properties.map(prop => {
          const value = (scene as any)[prop.key];

          if (prop.type === 'textarea') {
            return (
              <div key={prop.key} className="story-review-property story-review-property--full">
                <label>{prop.label}</label>
                <textarea
                  value={value || ''}
                  onChange={(e) => handleChange(prop.key, e.target.value)}
                  rows={3}
                />
              </div>
            );
          }

          if (prop.type === 'boolean') {
            return (
              <div key={prop.key} className="story-review-property">
                <label>{prop.label}</label>
                <div className="story-review-property-toggle">
                  <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => handleChange(prop.key, e.target.checked)}
                  />
                  <span>{value ? 'Yes' : 'No'}</span>
                </div>
              </div>
            );
          }

          const imageCategory = getImagePickerCategory(prop.key, scene.type);

          return (
            <div key={prop.key} className="story-review-property">
              <label>{prop.label}</label>
              <div className={`story-review-property-input-row ${imageCategory ? 'has-picker' : ''}`}>
                <input
                  type="text"
                  value={value || ''}
                  onChange={(e) => handleChange(prop.key, e.target.value)}
                />
                {imageCategory && (
                  <button
                    className="story-review-image-picker-btn"
                    onClick={() => onOpenImagePicker(prop.key, imageCategory)}
                    title={`Browse ${imageCategory}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Flow items for character-flow scenes */}
        {scene.type === 'character-flow' && (scene as any).flow && (
          <div className="story-review-property story-review-property--full">
            <label>Dialogue Flow ({(scene as any).flow.length} items) — Click to edit</label>
            <div className="story-review-flow-list">
              {(scene as any).flow.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className={`story-review-flow-item ${selectedFlowIndex === idx ? 'selected' : ''} ${!item.type ? 'clickable' : ''}`}
                  onClick={() => !item.type && onFlowItemSelect(selectedFlowIndex === idx ? null : idx)}
                >
                  {item.type ? (
                    <div className="story-review-flow-type">
                      <SceneTypeBadge type={item.type} />
                    </div>
                  ) : (
                    <>
                      <span
                        className={`story-review-flow-side ${item.side}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedFlowIndex === idx) {
                            onFlowItemChange(idx, { side: item.side === 'left' ? 'right' : 'left' });
                          }
                        }}
                        title={selectedFlowIndex === idx ? 'Click to switch speaker' : undefined}
                      >
                        {item.side === 'left' ? 'L' : 'R'}
                      </span>
                      <span className="story-review-flow-text">{item.text}</span>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Inline editor for selected flow item */}
            {selectedFlowIndex !== null && (scene as any).flow[selectedFlowIndex] && !(scene as any).flow[selectedFlowIndex].type && (
              <div className="story-review-flow-editor">
                <div className="story-review-flow-editor-header">
                  <span className="story-review-flow-editor-label">
                    Editing line {selectedFlowIndex + 1}
                    <span className={`story-review-flow-editor-speaker ${(scene as any).flow[selectedFlowIndex].side}`}>
                      ({(scene as any).flow[selectedFlowIndex].side === 'left' ? (scene as any)['left-character'] : (scene as any)['right-character']})
                    </span>
                  </span>
                  <button
                    className="story-review-flow-editor-close"
                    onClick={() => onFlowItemSelect(null)}
                    title="Close editor"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  className="story-review-flow-editor-textarea"
                  value={(scene as any).flow[selectedFlowIndex].text || ''}
                  onChange={(e) => onFlowItemChange(selectedFlowIndex, { text: e.target.value })}
                  rows={4}
                  autoFocus
                />
                <div className="story-review-flow-editor-actions">
                  <button
                    className={`story-review-flow-editor-side-btn ${(scene as any).flow[selectedFlowIndex].side === 'left' ? 'active' : ''}`}
                    onClick={() => onFlowItemChange(selectedFlowIndex, { side: 'left' })}
                  >
                    Left ({(scene as any)['left-character'] || '?'})
                  </button>
                  <button
                    className={`story-review-flow-editor-side-btn ${(scene as any).flow[selectedFlowIndex].side === 'right' ? 'active' : ''}`}
                    onClick={() => onFlowItemChange(selectedFlowIndex, { side: 'right' })}
                  >
                    Right ({(scene as any)['right-character'] || '?'})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clue descriptions for clue-image scenes */}
        {scene.type === 'clue-image' && (scene as any).clueDescriptions && (
          <div className="story-review-property story-review-property--full">
            <label>Clue Descriptions ({(scene as any).clueDescriptions.length} clues) — Click to edit</label>
            <div className="story-review-clue-list">
              {(scene as any).clueDescriptions.map((clue: any, idx: number) => (
                <div
                  key={idx}
                  className={`story-review-clue-item clickable ${selectedClueIndex === idx ? 'selected' : ''}`}
                  onClick={() => onClueSelect(selectedClueIndex === idx ? null : idx)}
                >
                  <div className="story-review-clue-item-header">
                    <strong>{clue.hotspotName}</strong>
                    {clue.image && (
                      <img
                        className="story-review-clue-thumb"
                        src={`/stories/gingerbread.bundle/images/hotspots/${(scene as any).image}/${clue.image}.png`}
                        alt={clue.hotspotName}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <p>{clue.description}</p>
                </div>
              ))}
            </div>

            {/* Inline editor for selected clue */}
            {selectedClueIndex !== null && (scene as any).clueDescriptions[selectedClueIndex] && (
              <div className="story-review-clue-editor">
                <div className="story-review-clue-editor-header">
                  <span className="story-review-clue-editor-label">
                    Editing clue {selectedClueIndex + 1}
                  </span>
                  <button
                    className="story-review-clue-editor-close"
                    onClick={() => onClueSelect(null)}
                    title="Close editor"
                  >
                    ✕
                  </button>
                </div>
                <div className="story-review-clue-editor-field">
                  <label>Hotspot Name</label>
                  <input
                    type="text"
                    value={(scene as any).clueDescriptions[selectedClueIndex].hotspotName || ''}
                    onChange={(e) => onClueChange(selectedClueIndex, { hotspotName: e.target.value })}
                  />
                </div>
                <div className="story-review-clue-editor-field">
                  <label>Description (Dialog Text)</label>
                  <textarea
                    className="story-review-clue-editor-textarea"
                    value={(scene as any).clueDescriptions[selectedClueIndex].description || ''}
                    onChange={(e) => onClueChange(selectedClueIndex, { description: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Scene Thumbnail Component
// ============================================================================

interface SceneThumbnailProps {
  scene: Scene;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

function SceneThumbnail({ scene, index, isActive, onClick }: SceneThumbnailProps) {
  // Get a preview representation based on scene type
  const getPreviewContent = () => {
    switch (scene.type) {
      case 'text':
      case 'full':
        return (
          <div className="story-review-thumb-text">
            {((scene as any).text || '').substring(0, 60)}...
          </div>
        );
      case 'image':
        return (
          <img
            src={resolveStoryImage((scene as any).image)}
            alt={`Scene ${index}`}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        );
      case 'character-flow':
        return (
          <div className="story-review-thumb-characters">
            <span>{(scene as any)['left-character'] || '?'}</span>
            <span>↔</span>
            <span>{(scene as any)['right-character'] || '?'}</span>
          </div>
        );
      case 'clue-image':
        return (
          <div className="story-review-thumb-clue">
            <span>🔍</span>
            <span>{(scene as any).clueDescriptions?.length || 0} clues</span>
          </div>
        );
      case 'map':
        return (
          <div className="story-review-thumb-map">
            <span>🗺</span>
            <span>{(scene as any).location}</span>
          </div>
        );
      default:
        return (
          <div className="story-review-thumb-default">
            {scene.type}
          </div>
        );
    }
  };

  return (
    <div
      className={`story-review-thumb ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="story-review-thumb-index">{index + 1}</div>
      <div className="story-review-thumb-content">
        {getPreviewContent()}
      </div>
      <SceneTypeBadge type={scene.type} />
    </div>
  );
}

// ============================================================================
// Scene Preview Component (renders like the app)
// ============================================================================

interface ScenePreviewProps {
  scene: Scene;
  sceneIndex: number;
  storyId: string;
}

function ScenePreview({ scene, sceneIndex, storyId }: ScenePreviewProps) {
  // Render a simplified preview based on scene type
  const renderPreview = () => {
    switch (scene.type) {
      case 'text':
        return (
          <div className="story-review-preview-text">
            <div className="story-review-preview-bubble">
              <p>{(scene as any).text}</p>
            </div>
          </div>
        );

      case 'image':
        const imageScene = scene as any;
        return (
          <div className="story-review-preview-image">
            <img
              src={resolveStoryImage(imageScene.image)}
              alt={imageScene.text || 'Story image'}
            />
            {imageScene.text && (
              <div className="story-review-preview-caption">
                <p>{imageScene.text}</p>
              </div>
            )}
          </div>
        );

      case 'character-flow':
        const flowScene = scene as any;
        return (
          <div className="story-review-preview-flow">
            <div className="story-review-preview-characters">
              <div className="story-review-preview-char left">
                {flowScene['left-character'] || 'None'}
              </div>
              <div className="story-review-preview-char right">
                {flowScene['right-character'] || 'None'}
              </div>
            </div>
            <div className="story-review-preview-dialogue">
              {flowScene.flow?.slice(0, 3).map((item: any, idx: number) => (
                item.type ? (
                  <div key={idx} className="story-review-preview-flow-action">
                    [{item.type}]
                  </div>
                ) : (
                  <div key={idx} className={`story-review-preview-speech ${item.side}`}>
                    <span className="story-review-preview-speech-side">{item.side === 'left' ? 'L' : 'R'}</span>
                    <p>{item.text}</p>
                  </div>
                )
              ))}
              {(flowScene.flow?.length || 0) > 3 && (
                <div className="story-review-preview-more">
                  +{flowScene.flow.length - 3} more...
                </div>
              )}
            </div>
            {flowScene.question && (
              <div className="story-review-preview-quest">
                <strong>Question:</strong> {flowScene.question}
              </div>
            )}
          </div>
        );

      case 'clue-image':
        const clueScene = scene as any;
        return (
          <div className="story-review-preview-clue">
            <div className="story-review-preview-clue-image">
              <img
                src={`/stories/gingerbread.bundle/images/cluesColored/${clueScene.image}.png`}
                alt={`Clue scene`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `/stories/gingerbread.bundle/images/clues/${clueScene.image}.png`;
                }}
              />
            </div>
            <div className="story-review-preview-clue-list">
              {clueScene.clueDescriptions?.map((clue: any, idx: number) => (
                <div key={idx} className="story-review-preview-clue-item">
                  <span className="story-review-preview-clue-name">{clue.hotspotName}</span>
                  <span className="story-review-preview-clue-desc">{clue.description}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'map':
        const mapScene = scene as any;
        return (
          <div className="story-review-preview-map">
            <img
              src={`/stories/gingerbread.bundle/images/${mapScene.image}`}
              alt={`Map - ${mapScene.location}`}
            />
            <div className="story-review-preview-location">
              <span className="story-review-preview-location-marker">📍</span>
              <span>{mapScene.location}</span>
            </div>
          </div>
        );

      case 'title':
        const titleScene = scene as any;
        return (
          <div className="story-review-preview-title">
            {titleScene.lvl1 && <h2>{titleScene.lvl1}</h2>}
            {titleScene.lvl2 && <h1>{titleScene.lvl2}</h1>}
            {titleScene.author && <p className="author">By {titleScene.author}</p>}
            {titleScene.illustrator && <p className="illustrator">Illustrated by {titleScene.illustrator}</p>}
          </div>
        );

      default:
        return (
          <div className="story-review-preview-unknown">
            <p>Preview not available for scene type: {scene.type}</p>
            <pre>{JSON.stringify(scene, null, 2)}</pre>
          </div>
        );
    }
  };

  // Get background image if available
  const background = (scene as any).background;
  const backgroundStyle = background ? {
    backgroundImage: `url(${resolveStoryImage(background)})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {};

  return (
    <div className="story-review-preview" style={backgroundStyle}>
      <div className="story-review-preview-content">
        {renderPreview()}
      </div>
    </div>
  );
}

// ============================================================================
// Main StoryReviewEditor Component
// ============================================================================

const StoryReviewEditor: React.FC<StoryReviewEditorProps> = ({
  isActive,
  storyId,
  onClose,
}) => {
  // Data state
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [originalStoryData, setOriginalStoryData] = useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Navigation state
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  // Flow item selection state
  const [selectedFlowIndex, setSelectedFlowIndex] = useState<number | null>(null);

  // Clue selection state
  const [selectedClueIndex, setSelectedClueIndex] = useState<number | null>(null);

  // Image picker state
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imagePickerField, setImagePickerField] = useState<string | null>(null);
  const [imagePickerCategory, setImagePickerCategory] = useState<ImageCategory>('backgrounds');

  // ============================================================================
  // Data Loading
  // ============================================================================

  useEffect(() => {
    if (!isActive) return;

    const loadStory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/stories/gingerbread.bundle/story.json`);
        if (!response.ok) throw new Error(`Failed to load story: ${response.status}`);
        const data = await response.json();
        setStoryData(data);
        setOriginalStoryData(JSON.parse(JSON.stringify(data))); // Deep clone
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setIsLoading(false);
      }
    };

    loadStory();
  }, [isActive, storyId]);

  // ============================================================================
  // Navigation
  // ============================================================================

  const goToScene = useCallback((index: number) => {
    if (!storyData) return;
    const clampedIndex = Math.max(0, Math.min(index, storyData.scenes.length - 1));
    setCurrentSceneIndex(clampedIndex);
    setSelectedFlowIndex(null); // Reset flow selection when changing scenes
    setSelectedClueIndex(null); // Reset clue selection when changing scenes
  }, [storyData]);

  const goToPrevious = useCallback(() => {
    goToScene(currentSceneIndex - 1);
  }, [currentSceneIndex, goToScene]);

  const goToNext = useCallback(() => {
    goToScene(currentSceneIndex + 1);
  }, [currentSceneIndex, goToScene]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, goToPrevious, goToNext]);

  // ============================================================================
  // Auto-Save Function
  // ============================================================================

  const saveToFile = useCallback(async (dataToSave: StoryData) => {
    setIsSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/bundle/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundle: 'gingerbread.bundle',
          story: dataToSave,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      setOriginalStoryData(JSON.parse(JSON.stringify(dataToSave)));
      setHasChanges(false);
      console.log('[StoryReviewEditor] Auto-saved to story.json');
    } catch (err) {
      console.error('Failed to save story:', err);
      // Don't set error state for auto-save failures - just log it
    } finally {
      setIsSaving(false);
    }
  }, []);

  // ============================================================================
  // Scene Editing (with immediate auto-save)
  // ============================================================================

  const handleSceneChange = useCallback((updates: Partial<Scene>) => {
    if (!storyData) return;

    const newScenes = [...storyData.scenes];
    newScenes[currentSceneIndex] = {
      ...newScenes[currentSceneIndex],
      ...updates,
    } as Scene;

    const newStoryData = {
      ...storyData,
      scenes: newScenes,
    };

    setStoryData(newStoryData);
    setHasChanges(true);

    // Auto-save immediately
    saveToFile(newStoryData);
  }, [storyData, currentSceneIndex, saveToFile]);

  const handleResetScene = useCallback(() => {
    if (!storyData || !originalStoryData) return;

    const newScenes = [...storyData.scenes];
    newScenes[currentSceneIndex] = JSON.parse(JSON.stringify(originalStoryData.scenes[currentSceneIndex]));

    const newStoryData = {
      ...storyData,
      scenes: newScenes,
    };

    setStoryData(newStoryData);
    setHasChanges(true);
    setSelectedFlowIndex(null); // Reset flow selection on scene reset
    setSelectedClueIndex(null); // Reset clue selection on scene reset

    // Auto-save immediately
    saveToFile(newStoryData);
  }, [storyData, originalStoryData, currentSceneIndex, saveToFile]);

  // ============================================================================
  // Flow Item Editing
  // ============================================================================

  const handleFlowItemSelect = useCallback((index: number | null) => {
    setSelectedFlowIndex(index);
  }, []);

  const handleFlowItemChange = useCallback((index: number, updates: { text?: string; side?: 'left' | 'right' }) => {
    if (!storyData) return;
    const currentScene = storyData.scenes[currentSceneIndex] as any;
    if (!currentScene.flow || !currentScene.flow[index]) return;

    const newFlow = [...currentScene.flow];
    newFlow[index] = { ...newFlow[index], ...updates };

    const newScenes = [...storyData.scenes];
    newScenes[currentSceneIndex] = {
      ...currentScene,
      flow: newFlow,
    };

    const newStoryData = {
      ...storyData,
      scenes: newScenes,
    };

    setStoryData(newStoryData);
    setHasChanges(true);

    // Auto-save immediately
    saveToFile(newStoryData);
  }, [storyData, currentSceneIndex, saveToFile]);

  // ============================================================================
  // Clue Editing
  // ============================================================================

  const handleClueSelect = useCallback((index: number | null) => {
    setSelectedClueIndex(index);
  }, []);

  const handleClueChange = useCallback((index: number, updates: { hotspotName?: string; description?: string }) => {
    if (!storyData) return;
    const currentScene = storyData.scenes[currentSceneIndex] as any;
    if (!currentScene.clueDescriptions || !currentScene.clueDescriptions[index]) return;

    const newClues = [...currentScene.clueDescriptions];
    newClues[index] = { ...newClues[index], ...updates };

    const newScenes = [...storyData.scenes];
    newScenes[currentSceneIndex] = {
      ...currentScene,
      clueDescriptions: newClues,
    };

    const newStoryData = {
      ...storyData,
      scenes: newScenes,
    };

    setStoryData(newStoryData);
    setHasChanges(true);

    // Auto-save immediately
    saveToFile(newStoryData);
  }, [storyData, currentSceneIndex, saveToFile]);

  // ============================================================================
  // Image Picker
  // ============================================================================

  const handleOpenImagePicker = useCallback((fieldKey: string, category: ImageCategory) => {
    setImagePickerField(fieldKey);
    setImagePickerCategory(category);
    setImagePickerOpen(true);
  }, []);

  const handleImageSelect = useCallback((imagePath: string) => {
    if (!imagePickerField || !storyData) return;

    const newScenes = [...storyData.scenes];
    newScenes[currentSceneIndex] = {
      ...newScenes[currentSceneIndex],
      [imagePickerField]: imagePath,
    } as Scene;

    const newStoryData = {
      ...storyData,
      scenes: newScenes,
    };

    setStoryData(newStoryData);
    setHasChanges(true);
    saveToFile(newStoryData);
  }, [imagePickerField, storyData, currentSceneIndex, saveToFile]);

  const handleCloseImagePicker = useCallback(() => {
    setImagePickerOpen(false);
    setImagePickerField(null);
  }, []);

  // ============================================================================
  // Manual Save (kept for backup button)
  // ============================================================================

  const handleSave = async () => {
    if (!storyData) return;
    await saveToFile(storyData);
  };

  // ============================================================================
  // Fix Image References
  // ============================================================================

  const [isFixingRefs, setIsFixingRefs] = useState(false);
  const [fixResult, setFixResult] = useState<{ count: number; message: string } | null>(null);

  const handleFixImageReferences = async () => {
    setIsFixingRefs(true);
    setFixResult(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/images/fix-references`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: 'gingerbread' }),
      });

      if (!response.ok) throw new Error('Failed to fix references');

      const data = await response.json();
      setFixResult({
        count: data.fixCount,
        message: data.fixCount > 0
          ? `Fixed ${data.fixCount} image reference(s)`
          : 'All image references are correct'
      });

      // Reload story data to reflect changes
      if (data.fixCount > 0) {
        const storyResponse = await fetch(`/stories/gingerbread.bundle/story.json`);
        if (storyResponse.ok) {
          const newData = await storyResponse.json();
          setStoryData(newData);
          setOriginalStoryData(JSON.parse(JSON.stringify(newData)));
        }
      }

      // Clear the message after 3 seconds
      setTimeout(() => setFixResult(null), 3000);
    } catch (err) {
      setFixResult({ count: -1, message: 'Failed to fix references' });
      setTimeout(() => setFixResult(null), 3000);
    } finally {
      setIsFixingRefs(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (!isActive) return null;

  if (isLoading) {
    return (
      <div className="story-review-loading">
        <div className="story-review-loading-content">
          <div className="icon">{Icons.play}</div>
          <p>Loading story...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="story-review-error">
        <p>{error}</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  if (!storyData) return null;

  const currentScene = storyData.scenes[currentSceneIndex];
  const totalScenes = storyData.scenes.length;

  return (
    <div className="story-review">
      {/* Header */}
      <div className="story-review-header">
        <div className="story-review-header-left">
          <button onClick={onClose} className="story-review-back-btn">
            {Icons.back}
            <span>Back to Editor</span>
          </button>
          <div className="story-review-divider" />
          <div className="story-review-title">
            <span className="story-review-title-icon">{Icons.play}</span>
            <h1>Story Review</h1>
          </div>
          <div className="story-review-story-title">
            {storyData.title}
          </div>
        </div>
        <div className="story-review-header-right">
          <button
            className="story-review-fix-btn"
            onClick={handleFixImageReferences}
            disabled={isFixingRefs}
            title="Fix image references in story.json to match actual files"
          >
            {isFixingRefs ? Icons.spinner : Icons.wrench}
            <span>{isFixingRefs ? 'Fixing...' : 'Fix Image Refs'}</span>
          </button>
          {fixResult && (
            <span className={`story-review-fix-result ${fixResult.count === -1 ? 'error' : fixResult.count > 0 ? 'success' : 'info'}`}>
              {fixResult.message}
            </span>
          )}
          {hasChanges && (
            <button
              className="story-review-save-btn"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? Icons.spinner : Icons.save}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          )}
          <span className="story-review-status">
            Scene {currentSceneIndex + 1} of {totalScenes}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="story-review-main">
        {/* Left Sidebar: Navigation */}
        <div className="story-review-nav">
          {/* Up Arrow */}
          <button
            className="story-review-nav-arrow story-review-nav-arrow--up"
            onClick={goToPrevious}
            disabled={currentSceneIndex === 0}
            title="Previous scene (↑)"
          >
            {Icons.chevronUp}
          </button>

          {/* Scene List */}
          <div className="story-review-nav-list">
            {storyData.scenes.map((scene, index) => (
              <SceneThumbnail
                key={index}
                scene={scene}
                index={index}
                isActive={index === currentSceneIndex}
                onClick={() => goToScene(index)}
              />
            ))}
          </div>

          {/* Down Arrow */}
          <button
            className="story-review-nav-arrow story-review-nav-arrow--down"
            onClick={goToNext}
            disabled={currentSceneIndex === totalScenes - 1}
            title="Next scene (↓)"
          >
            {Icons.chevronDown}
          </button>
        </div>

        {/* Center: Scene Preview using real simulator */}
        <div className="story-review-center">
          <div className="story-review-simulator-container">
            <StorySimulator
              scene={currentScene}
              sceneIndex={currentSceneIndex}
              storyId={storyId}
              allScenes={storyData.scenes}
            />
          </div>
        </div>

        {/* Right Sidebar: Property Editor */}
        <div className="story-review-sidebar">
          <PropertyEditor
            scene={currentScene}
            sceneIndex={currentSceneIndex}
            onChange={handleSceneChange}
            onReset={handleResetScene}
            selectedFlowIndex={selectedFlowIndex}
            onFlowItemSelect={handleFlowItemSelect}
            onFlowItemChange={handleFlowItemChange}
            onOpenImagePicker={handleOpenImagePicker}
            selectedClueIndex={selectedClueIndex}
            onClueSelect={handleClueSelect}
            onClueChange={handleClueChange}
            depositions={storyData.depositions}
          />
        </div>
      </div>

      {/* Image Picker Modal */}
      <ImagePickerModal
        isOpen={imagePickerOpen}
        category={imagePickerCategory}
        currentValue={(currentScene as any)[imagePickerField || ''] || null}
        onSelect={handleImageSelect}
        onClose={handleCloseImagePicker}
      />
    </div>
  );
};

export default StoryReviewEditor;
