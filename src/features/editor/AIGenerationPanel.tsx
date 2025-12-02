/**
 * AI Generation Panel
 *
 * Full-screen AI image generation interface with 3-column layout:
 * - Left: Image gallery, description, characters, generation controls
 * - Center: Large image preview with "Use as Current Image" button
 * - Right: Version history (always visible)
 */
import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface ImageItem {
  id: string;
  name: string;
  imagePath: string;
  exists: boolean;
  usedInScenes: number[];
  description?: string;
}

interface CharacterImage {
  name: string;
  imagePath: string;
}

interface StoryData {
  storyId: string;
  title: string;
  backgrounds: ImageItem[];
  storyImages: ImageItem[];
  clueImages: ImageItem[];
  characterImages: CharacterImage[];
}

type ImageCategory = 'backgrounds' | 'characters' | 'clueImages' | 'storyImages';

interface HistoryVersion {
  version: number;
  filename: string;
  timestamp: number;
  prompt: string;
  charactersReferenced: string[];
  isModification: boolean;
  baseVersion?: number;
}

interface ImageHistory {
  imageId: string;
  category: ImageCategory;
  versions: HistoryVersion[];
  currentVersion: number;
}

interface AIGenerationPanelProps {
  isActive: boolean;
  storyId: string;
  onImageUpdated?: (sceneIndex: number, newImagePath: string) => void;
  onClose?: () => void;
}

const BACKEND_URL = 'http://localhost:3001';

// ============================================================================
// Icons
// ============================================================================

const Icons = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  spinner: (
    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// ============================================================================
// Utility Functions
// ============================================================================

const getCategoryLabel = (category: ImageCategory): string => {
  const labels: Record<ImageCategory, string> = {
    backgrounds: 'Backgrounds',
    characters: 'Characters',
    clueImages: 'Clue Images',
    storyImages: 'Story Images',
  };
  return labels[category];
};

const formatTimestamp = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

// ============================================================================
// Main AIGenerationPanel Component
// ============================================================================

const AIGenerationPanel: React.FC<AIGenerationPanelProps> = ({
  isActive,
  storyId,
  onImageUpdated,
  onClose,
}) => {
  // Data state
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ImageCategory | null>(null);

  // Image detail state
  const [selectedVersion, setSelectedVersion] = useState<number | 'current'>('current');
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [modificationText, setModificationText] = useState('');
  const [history, setHistory] = useState<ImageHistory | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);

  // Gallery expansion state
  const [expandedCategories, setExpandedCategories] = useState<Set<ImageCategory>>(
    new Set(['backgrounds'])
  );

  // Load story data
  useEffect(() => {
    if (!isActive || !storyId) return;

    const loadStoryData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${BACKEND_URL}/api/images/story?storyId=${encodeURIComponent(storyId)}`);
        if (!response.ok) {
          throw new Error(`Failed to load story: ${response.status}`);
        }
        const data = await response.json();
        setStoryData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story data');
        console.error('Error loading story data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoryData();
  }, [isActive, storyId]);

  // Load history when image is selected
  useEffect(() => {
    if (!selectedImage || !selectedCategory) {
      setHistory(null);
      return;
    }

    const loadHistory = async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/images/history?storyId=${encodeURIComponent(storyId)}&imageId=${encodeURIComponent(selectedImage.name)}&category=${selectedCategory}`
        );
        if (response.ok) {
          const data = await response.json();
          setHistory(data);
        } else {
          setHistory(null);
        }
      } catch (err) {
        console.error('Error loading history:', err);
        setHistory(null);
      }
    };

    loadHistory();
  }, [selectedImage, selectedCategory, storyId]);

  // Update description when image is selected
  useEffect(() => {
    if (selectedImage) {
      setDescription(selectedImage.description || '');
      setSelectedVersion('current');
      setModificationText('');
    }
  }, [selectedImage]);

  const getImageUrl = useCallback((imagePath: string): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('history/')) {
      return `/stories/${storyId}.history/${imagePath.replace('history/', '')}`;
    }
    return `/stories/${storyId}.bundle/images/${imagePath}`;
  }, [storyId]);

  const getSelectedImagePath = (): string => {
    if (!selectedImage) return '';
    if (selectedVersion === 'current') {
      return selectedImage.imagePath;
    }
    const version = history?.versions.find(v => v.version === selectedVersion);
    if (version && history) {
      return `history/${history.category}/${history.imageId}/${version.filename}`;
    }
    return selectedImage.imagePath;
  };

  const handleImageSelect = (image: ImageItem, category: ImageCategory) => {
    setSelectedImage(image);
    setSelectedCategory(category);
    setSelectedCharacters([]);
    setSelectedVersion('current');
  };

  const handleCharacterToggle = (name: string) => {
    setSelectedCharacters(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const toggleCategory = (category: ImageCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleNewGeneration = async () => {
    if (!selectedImage || !selectedCategory || !description.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/images/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          imageId: selectedImage.id,
          imageName: selectedImage.name,
          category: selectedCategory,
          type: 'new',
          prompt: description,
          characters: selectedCharacters,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          const retryAfter = errorData.retryAfter || 60;
          throw new Error(`Rate limited. Please wait ${retryAfter} seconds and try again.`);
        }
        throw new Error(errorData.error || `Generation failed (${response.status})`);
      }

      const data = await response.json();

      if (data.success && data.imagePath) {
        console.log(`Image generated: ${data.imagePath}`);

        setSelectedImage(prev => prev ? {
          ...prev,
          imagePath: data.imagePath,
          exists: true,
        } : null);

        // Refresh story data
        const storyResponse = await fetch(`${BACKEND_URL}/api/images/story?storyId=${encodeURIComponent(storyId)}`);
        if (storyResponse.ok) {
          const newStoryData = await storyResponse.json();
          setStoryData(newStoryData);
        }

        // Reload history
        const historyResponse = await fetch(
          `${BACKEND_URL}/api/images/history?storyId=${encodeURIComponent(storyId)}&imageId=${encodeURIComponent(selectedImage.name)}&category=${selectedCategory}`
        );
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setHistory(historyData);
        }

        if (onImageUpdated && selectedImage.usedInScenes.length > 0) {
          onImageUpdated(selectedImage.usedInScenes[0], data.imagePath);
        }
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start generation';
      setError(message);
      console.error('Generation error:', message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleModify = async () => {
    if (!selectedImage || !selectedCategory || !modificationText.trim()) return;
    if (!selectedImage.exists && selectedVersion === 'current') return;

    setIsGenerating(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/images/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          imageId: selectedImage.id,
          imageName: selectedImage.name,
          category: selectedCategory,
          type: 'modify',
          baseVersion: selectedVersion,
          prompt: modificationText,
          characters: selectedCharacters,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          const retryAfter = errorData.retryAfter || 60;
          throw new Error(`Rate limited. Please wait ${retryAfter} seconds and try again.`);
        }
        throw new Error(errorData.error || `Modification failed (${response.status})`);
      }

      const data = await response.json();

      if (data.success && data.imagePath) {
        console.log(`Image modified: ${data.imagePath}`);

        setSelectedImage(prev => prev ? {
          ...prev,
          imagePath: data.imagePath,
          exists: true,
        } : null);

        // Refresh story data
        const storyResponse = await fetch(`${BACKEND_URL}/api/images/story?storyId=${encodeURIComponent(storyId)}`);
        if (storyResponse.ok) {
          const newStoryData = await storyResponse.json();
          setStoryData(newStoryData);
        }

        // Reload history
        const historyResponse = await fetch(
          `${BACKEND_URL}/api/images/history?storyId=${encodeURIComponent(storyId)}&imageId=${encodeURIComponent(selectedImage.name)}&category=${selectedCategory}`
        );
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setHistory(historyData);
        }

        setModificationText('');

        if (onImageUpdated && selectedImage.usedInScenes.length > 0) {
          onImageUpdated(selectedImage.usedInScenes[0], data.imagePath);
        }
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start modification';
      setError(message);
      console.error('Modification error:', message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseAsCurrentImage = async () => {
    if (!selectedImage || !selectedCategory || selectedVersion === 'current') return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/images/use-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          imageId: selectedImage.name,
          category: selectedCategory,
          version: selectedVersion,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update image');
      }

      // Refresh story data
      const storyResponse = await fetch(`${BACKEND_URL}/api/images/story?storyId=${encodeURIComponent(storyId)}`);
      if (storyResponse.ok) {
        const data = await storyResponse.json();
        setStoryData(data);
      }

      setSelectedVersion('current');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update image');
    }
  };

  if (!isActive) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-pulse mb-4">🎨</div>
          <p className="text-gray-500">Loading story...</p>
        </div>
      </div>
    );
  }

  // Convert characterImages to ImageItem format
  const characterItems: ImageItem[] = storyData?.characterImages.map(char => ({
    id: char.name,
    name: char.name,
    imagePath: char.imagePath,
    exists: true,
    usedInScenes: [],
  })) || [];

  const categories: { key: ImageCategory; items: ImageItem[] }[] = [
    { key: 'backgrounds', items: storyData?.backgrounds || [] },
    { key: 'characters', items: characterItems },
    { key: 'clueImages', items: storyData?.clueImages || [] },
    { key: 'storyImages', items: storyData?.storyImages || [] },
  ];

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {Icons.back}
            <span className="font-medium">Back to Editor</span>
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center gap-2 text-purple-600">
            {Icons.sparkles}
            <h1 className="text-lg font-semibold text-gray-900">AI Image Generator</h1>
          </div>
        </div>
        <p className="text-sm text-gray-500">Powered by Google Gemini</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between shrink-0">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            {Icons.x}
          </button>
        </div>
      )}

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT COLUMN: Gallery & Controls */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
          {/* Image Gallery */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {categories.map(({ key, items }) => {
              const isExpanded = expandedCategories.has(key);
              const missingCount = items.filter(img => !img.exists).length;

              return (
                <div key={key} className="border-b border-gray-100">
                  <button
                    onClick={() => toggleCategory(key)}
                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      isExpanded ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">{getCategoryLabel(key)}</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                      {missingCount > 0 && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          {missingCount} missing
                        </span>
                      )}
                    </div>
                    <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 py-3 grid grid-cols-3 gap-4">
                      {items.length === 0 ? (
                        <div className="col-span-3 text-sm text-gray-400 text-center py-4">
                          No images
                        </div>
                      ) : (
                        items.map(image => (
                          <div
                            key={image.id}
                            onClick={() => handleImageSelect(image, key)}
                            className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all shadow-md hover:shadow-xl ${
                              selectedImage?.id === image.id
                                ? 'border-purple-500 ring-2 ring-purple-300 shadow-purple-200'
                                : image.exists
                                ? 'border-gray-300 hover:border-gray-400 shadow-gray-300'
                                : 'border-red-300 hover:border-red-400 shadow-red-200'
                            }`}
                          >
                            <div className="aspect-square bg-gray-100">
                              {image.exists ? (
                                <img
                                  src={getImageUrl(image.imagePath)}
                                  alt={image.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-400 text-2xl">
                                  ?
                                </div>
                              )}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                              <div className="text-xs text-white truncate">{image.name}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Controls Section (only when image selected) */}
          {selectedImage && selectedCategory && (
            <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50 shrink-0 max-h-[50%] overflow-y-auto">
              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  placeholder="Describe what you want..."
                  rows={3}
                />
              </div>

              {/* Characters */}
              {storyData && storyData.characterImages.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Characters (for compositing)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {storyData.characterImages.map(char => {
                      const isSelected = selectedCharacters.includes(char.name);
                      return (
                        <div
                          key={char.name}
                          onClick={() => handleCharacterToggle(char.name)}
                          className={`relative cursor-pointer transition-all ${
                            isSelected
                              ? 'ring-2 ring-purple-500 ring-offset-2 rounded-lg'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                          title={char.name}
                        >
                          <img
                            src={getImageUrl(char.imagePath)}
                            alt={char.name}
                            className="w-10 h-10 object-cover rounded-lg"
                          />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* New Generation Button */}
              <button
                onClick={handleNewGeneration}
                disabled={isGenerating || !description.trim()}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  isGenerating || !description.trim()
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {isGenerating ? (
                  <>
                    {Icons.spinner}
                    Generating...
                  </>
                ) : (
                  <>
                    {Icons.sparkles}
                    New Generation
                  </>
                )}
              </button>

              {/* Modification Section */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Modification Instructions
                </label>
                <textarea
                  value={modificationText}
                  onChange={(e) => setModificationText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  placeholder="Describe changes..."
                  rows={2}
                />
                <button
                  onClick={handleModify}
                  disabled={isGenerating || !modificationText.trim() || (!selectedImage.exists && selectedVersion === 'current')}
                  className={`w-full mt-2 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    isGenerating || !modificationText.trim() || (!selectedImage.exists && selectedVersion === 'current')
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {Icons.edit}
                  Modify
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CENTER COLUMN: Image Preview */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-100 min-w-0">
          {selectedImage ? (
            <>
              {/* Image Name */}
              <h2 className="text-xl font-semibold text-gray-800 mb-4 shrink-0">
                {selectedImage.name}
                {selectedVersion !== 'current' && (
                  <span className="ml-2 text-sm font-normal text-blue-600">
                    (viewing v{selectedVersion})
                  </span>
                )}
              </h2>

              {/* Large Image Preview */}
              <div className="flex-1 w-full max-w-4xl bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex items-center justify-center min-h-0">
                {selectedImage.exists || selectedVersion !== 'current' ? (
                  <img
                    src={getImageUrl(getSelectedImagePath())}
                    alt={selectedImage.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <div className="text-6xl mb-4">?</div>
                    <p>Image not generated yet</p>
                  </div>
                )}
              </div>

              {/* Use as Current Image Button */}
              {selectedVersion !== 'current' && (
                <button
                  onClick={handleUseAsCurrentImage}
                  className="mt-6 px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2 shrink-0"
                >
                  {Icons.check}
                  Use as Current Image
                </button>
              )}
            </>
          ) : (
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">🖼️</div>
              <p className="text-lg">Select an image from the gallery</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Version History */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
            <div className="flex items-center gap-2">
              {Icons.clock}
              <h3 className="font-semibold text-gray-700">Version History</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {selectedImage ? (
              <div className="space-y-2">
                {/* Current version */}
                <div
                  onClick={() => setSelectedVersion('current')}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedVersion === 'current'
                      ? 'bg-purple-100 border-2 border-purple-400'
                      : 'hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    {selectedImage.exists ? (
                      <img
                        src={getImageUrl(selectedImage.imagePath)}
                        alt="Current"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">?</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">Current</div>
                    <div className="text-xs text-gray-500">in story.json</div>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                </div>

                {/* Historical versions */}
                {history?.versions.slice().reverse().map(version => (
                  <div
                    key={version.version}
                    onClick={() => setSelectedVersion(version.version)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedVersion === version.version
                        ? 'bg-purple-100 border-2 border-purple-400'
                        : 'hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      <img
                        src={getImageUrl(`history/${history.category}/${history.imageId}/${version.filename}`)}
                        alt={`v${version.version}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {version.isModification ? 'Modified' : 'Generated'}
                      </div>
                      <div className="text-xs text-gray-500">
                        v{version.version} • {formatTimestamp(version.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}

                {(!history || history.versions.length === 0) && (
                  <div className="text-sm text-gray-400 text-center py-8">
                    No history yet
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-400 text-center py-8">
                Select an image to see history
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGenerationPanel;
