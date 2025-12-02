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

  if (!isActive) return null;

  return (
    <div className="fixed left-24 top-0 w-96 h-full bg-white border-r border-gray-200 z-30 flex flex-col shadow-lg">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🎨</span>
          Image Generator
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">AI-powered image generation with Gemini</p>
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

          {/* Selected Scene Editor */}
          {selectedScene && (
            <div className="p-4 bg-gray-50">
              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                Scene {selectedScene.index + 1} Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                placeholder="Describe what you want in the image..."
                rows={3}
              />

              {/* Current Image Preview */}
              {selectedScene.image && !generatedPreview && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500 mb-1">Current Image:</div>
                  <img
                    src={getImageUrl(selectedScene.image)}
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
                      Generate New Image
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Empty State */}
          {!selectedScene && (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2 opacity-40">👆</div>
              <p className="text-sm">Select a scene above to generate an image</p>
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
