/**
 * Image Generator Panel
 *
 * Displays all images needed for a story organized by category:
 * - Backgrounds: Scene backgrounds used in text and character-flow scenes
 * - Story Images: Illustrations for image-type scenes
 * - Clue Images: Investigation scenes with hotspots
 *
 * Uses Google Gemini API (Nano Banana) for AI image generation.
 */
import React, { useState, useEffect } from 'react';

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

type ImageCategory = 'backgrounds' | 'storyImages' | 'clueImages';

interface ImageGeneratorPanelProps {
  isActive: boolean;
  storyId: string;
  onImageUpdated?: (sceneIndex: number, newImagePath: string) => void;
}

const BACKEND_URL = 'http://localhost:3001';

const ImageGeneratorPanel: React.FC<ImageGeneratorPanelProps> = ({
  isActive,
  storyId,
  onImageUpdated
}) => {
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ImageCategory | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<ImageCategory | null>('backgrounds');
  const [artStyle, setArtStyle] = useState<string>('Whimsical children\'s book illustration style, warm colors, friendly characters');
  const [description, setDescription] = useState<string>('');
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Update description when image is selected
  useEffect(() => {
    if (selectedImage) {
      setDescription(selectedImage.description || '');
    }
  }, [selectedImage]);

  const handleSelectImage = (image: ImageItem, category: ImageCategory) => {
    setSelectedImage(image);
    setSelectedCategory(category);
    setGeneratedPreview(null);
    setError(null);
  };

  const toggleCategory = (category: ImageCategory) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const toggleReferenceImage = (imagePath: string) => {
    setSelectedReferences(prev =>
      prev.includes(imagePath)
        ? prev.filter(p => p !== imagePath)
        : [...prev, imagePath]
    );
  };

  const handleGenerate = async () => {
    if (!selectedImage || !description.trim()) {
      setError('Please select an image and provide a description');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedPreview(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/images/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: description,
          artStyle,
          referenceImages: selectedReferences,
          storyId,
          sceneIndex: selectedImage.usedInScenes[0] || 0,
          category: selectedCategory,
          imageName: selectedImage.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Generation failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.imagePath) {
        // Show preview
        setGeneratedPreview(data.imagePath);
      } else {
        throw new Error('No image was generated');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptImage = async () => {
    if (!selectedImage || !selectedCategory || !generatedPreview) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/images/update-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          sceneIndex: selectedImage.usedInScenes[0] || 0,
          imagePath: generatedPreview,
          description,
          category: selectedCategory,
          imageName: selectedImage.name
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update image');
      }

      // Update local state based on category
      if (storyData && selectedCategory) {
        const updateList = (list: ImageItem[]) =>
          list.map(img =>
            img.id === selectedImage.id
              ? { ...img, imagePath: generatedPreview, exists: true, description }
              : img
          );

        setStoryData({
          ...storyData,
          [selectedCategory]: updateList(storyData[selectedCategory])
        });
      }

      // Update selected image
      setSelectedImage(prev => prev ? { ...prev, imagePath: generatedPreview, exists: true, description } : null);

      // Notify parent
      onImageUpdated?.(selectedImage.usedInScenes[0] || 0, generatedPreview);

      // Clear preview
      setGeneratedPreview(null);

      alert('Image updated successfully!');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update image');
    }
  };

  const handleRejectImage = () => {
    setGeneratedPreview(null);
  };

  const getImageUrl = (imagePath: string | undefined): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `/stories/${storyId}.bundle/images/${imagePath}`;
  };

  // Helper to render an image category section
  const renderImageCategory = (
    category: ImageCategory,
    title: string,
    images: ImageItem[],
    bgColor: string,
    borderColor: string
  ) => {
    const isExpanded = expandedCategory === category;
    const missingCount = images.filter(img => !img.exists).length;
    const categoryIcons: Record<ImageCategory, string> = {
      backgrounds: '🏞️',
      storyImages: '📖',
      clueImages: '🔍'
    };

    return (
      <div className="border-b border-gray-100">
        {/* Category Header - Collapsible */}
        <button
          onClick={() => toggleCategory(category)}
          className={`w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${isExpanded ? bgColor : ''}`}
        >
          <div className="flex items-center gap-2">
            <span>{categoryIcons[category]}</span>
            <span className="text-sm font-semibold text-gray-700">{title}</span>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {images.length}
            </span>
            {missingCount > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {missingCount} missing
              </span>
            )}
          </div>
          <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Category Content */}
        {isExpanded && (
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {images.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                No {title.toLowerCase()} required
              </div>
            ) : (
              images.map((image) => (
                <div
                  key={image.id}
                  onClick={() => handleSelectImage(image, category)}
                  className={`p-2 border rounded-lg cursor-pointer transition-all flex gap-3 ${
                    selectedImage?.id === image.id
                      ? `${borderColor} ${bgColor} border-2`
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden ${image.exists ? 'bg-gray-100' : 'bg-red-50 border-2 border-dashed border-red-200'}`}>
                    {image.exists ? (
                      <img
                        src={getImageUrl(image.imagePath)}
                        alt={image.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-red-400 text-xl">
                        ?
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {image.name}
                      </span>
                      {!image.exists && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                          missing
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {image.description || 'No description'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Used in scene{image.usedInScenes.length > 1 ? 's' : ''}: {image.usedInScenes.map(s => s + 1).join(', ')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isActive) return null;

  // Icon for sparkles/AI
  const SparklesIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className="fixed left-0 top-[148px] w-96 h-[calc(100vh-148px-24px)] bg-white border-r border-gray-200 z-30 flex flex-col shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="text-purple-600">{SparklesIcon}</div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI Image Generator</h2>
            <p className="text-xs text-gray-500">Powered by Google Gemini</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl animate-pulse">🎨</div>
            <p className="text-sm text-gray-500 mt-2">Loading story...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && storyData && (
        <div className="flex-1 overflow-y-auto">
          {/* Art Style Section */}
          <div className="p-4 border-b border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Art Style
            </label>
            <textarea
              value={artStyle}
              onChange={(e) => setArtStyle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              placeholder="Describe the art style..."
              rows={2}
            />
          </div>

          {/* Image Categories */}
          {renderImageCategory('backgrounds', 'Backgrounds', storyData.backgrounds, 'bg-blue-50', 'border-blue-200')}
          {renderImageCategory('storyImages', 'Story Images', storyData.storyImages, 'bg-green-50', 'border-green-200')}
          {renderImageCategory('clueImages', 'Clue Images', storyData.clueImages, 'bg-amber-50', 'border-amber-200')}

          {/* Character Reference Images */}
          {storyData.characterImages.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                Character References (click to include)
              </label>
              <div className="flex flex-wrap gap-2">
                {storyData.characterImages.map((char) => (
                  <div
                    key={char.name}
                    onClick={() => toggleReferenceImage(char.imagePath)}
                    className={`relative cursor-pointer transition-all ${
                      selectedReferences.includes(char.imagePath)
                        ? 'ring-2 ring-purple-500 ring-offset-2'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={getImageUrl(char.imagePath)}
                      alt={char.name}
                      className="w-12 h-12 object-cover rounded-lg"
                      title={char.name}
                    />
                    {selectedReferences.includes(char.imagePath) && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Image Editor */}
          {selectedImage && (
            <div className="p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {selectedImage.name}
                </label>
                {!selectedImage.exists && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                    needs generation
                  </span>
                )}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                placeholder="Describe what you want in the image..."
                rows={3}
              />

              {/* Current Image Preview */}
              {selectedImage.exists && !generatedPreview && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500 mb-1">Current Image:</div>
                  <img
                    src={getImageUrl(selectedImage.imagePath)}
                    alt="Current"
                    className="w-full h-40 object-contain bg-gray-100 rounded-lg"
                  />
                </div>
              )}

              {/* Generated Preview */}
              {generatedPreview && (
                <div className="mt-3">
                  <div className="text-xs text-green-600 font-semibold mb-1">Generated Image:</div>
                  <img
                    src={getImageUrl(generatedPreview)}
                    alt="Generated"
                    className="w-full h-40 object-contain bg-gray-100 rounded-lg border-2 border-green-500"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleAcceptImage}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={handleRejectImage}
                      className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              {!generatedPreview && (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !description.trim()}
                  className={`w-full mt-3 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    isGenerating || !description.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      {selectedImage.exists ? 'Regenerate Image' : 'Generate Image'}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Empty State */}
          {!selectedImage && (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2 opacity-40">👆</div>
              <p className="text-sm">Select an image above to generate or regenerate</p>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Powered by Google Gemini (Nano Banana)
        </p>
      </div>
    </div>
  );
};

export default ImageGeneratorPanel;
