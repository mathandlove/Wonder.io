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

  // SVG Icons
  const ImageIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );

  const CheckIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="text-blue-600">{ImageIcon}</div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Select a Clue Image</h1>
            <p className="text-sm text-gray-500">Choose an image to annotate with hotspots</p>
          </div>
        </div>
      </div>

      {/* Image Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 animate-pulse">
              <div className="text-gray-400">{ImageIcon}</div>
            </div>
            <p className="text-sm font-medium text-gray-600">Loading images...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((img) => (
            <div
              key={img.path}
              onClick={() => onImageSelect(img.path)}
              className={`group relative bg-white rounded-lg overflow-hidden cursor-pointer transition-all shadow-sm ${
                currentImage === img.path
                  ? 'ring-2 ring-blue-500 shadow-md'
                  : 'hover:shadow-md border border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Image Preview */}
              <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={img.path}
                  alt={img.name}
                  className="w-full h-full object-contain transition-transform group-hover:scale-105"
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
                <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                  {CheckIcon}
                </div>
              )}
            </div>
          ))}
          </div>
        )}

        {!isLoading && images.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <div className="text-gray-400">{ImageIcon}</div>
            </div>
            <p className="text-sm font-medium text-gray-900">No clue images found</p>
            <p className="text-xs text-gray-500 mt-1">Make sure cluesColored folder has images</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSelector;
