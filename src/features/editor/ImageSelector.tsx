/**
 * Image Selector Component
 *
 * Displays a gallery of available images from story bundles.
 * Allows users to select which image to annotate with hotspots.
 */
import React, { useState, useEffect } from 'react';

interface ImageInfo {
  path: string;
  name: string;
  category: 'clues' | 'story' | 'characters' | 'backgrounds' | 'maps';
  bundle: string;
}

interface ImageSelectorProps {
  onImageSelect: (imagePath: string) => void;
  currentImage: string | null;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({ onImageSelect, currentImage }) => {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load only cluesColored images from gingerbread bundle, excluding thumbnail subfolders
    const loadImages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:3001/api/bundle/images?bundle=gingerbread.bundle`);
        if (!response.ok) {
          throw new Error(`Failed to load images: ${response.status}`);
        }
        const data = await response.json();

        // Filter for cluesColored images but exclude thumbnail subfolders (old hotspotImages location)
        const imageInfos: ImageInfo[] = data.images
          .filter((path: string) =>
            path.includes('/cluesColored/') && !path.includes('/hotspotImages/')
          )
          .map((path: string) => {
            // Extract filename for name
            const filename = path.split('/').pop() || '';
            const name = filename.replace(/\.(png|jpg|jpeg|webp)$/i, '').replace(/[_-]/g, ' ');

            return {
              path,
              name,
              category: 'clues' as const,
              bundle: 'gingerbread'
            };
          });

        setImages(imageInfos);
        console.log(`✅ Loaded ${imageInfos.length} cluesColored images`);
      } catch (err) {
        console.error('Failed to load images:', err);
        setImages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-semibold text-gray-900">Select a Clue Image</h1>
        <p className="text-sm text-gray-500 mt-1">Choose a colored clue image from the Gingerbread bundle to annotate</p>
      </div>

      {/* Image Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 opacity-40">⏳</div>
            <p className="text-sm font-medium text-gray-900">Loading images...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((img) => (
            <div
              key={img.path}
              onClick={() => onImageSelect(img.path)}
              className={`group relative bg-white rounded-lg overflow-hidden cursor-pointer transition-all border-2 ${
                currentImage === img.path
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {/* Image Preview */}
              <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={img.path}
                  alt={img.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>

              {/* Info */}
              <div className="p-3 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-900 truncate">{img.name}</h3>
              </div>

              {/* Selected Indicator */}
              {currentImage === img.path && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg text-sm font-bold">
                  ✓
                </div>
              )}
            </div>
          ))}
          </div>
        )}

        {!isLoading && images.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 opacity-40">🖼️</div>
            <p className="text-sm font-medium text-gray-900">No clue images found</p>
            <p className="text-xs text-gray-500 mt-1">Make sure cluesColored folder has images</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSelector;
