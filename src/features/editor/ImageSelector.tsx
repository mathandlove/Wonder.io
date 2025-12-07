/**
 * Image Selector Component
 *
 * Displays a gallery of available images from story bundles.
 * Allows users to select which image to annotate with hotspots.
 */
import React, { useState, useEffect } from 'react';
import './ImageSelector.css';
import { API_URL } from '../../config';

interface ImageInfo {
  path: string;
  name: string;
  category: 'clues' | 'story' | 'characters' | 'backgrounds' | 'maps';
  bundle: string;
  coloredPath?: string; // Path to colored version if it exists
  hasColoredVersion: boolean;
}

interface ImageSelectorProps {
  onImageSelect: (imagePath: string) => void;
  currentImage: string | null;
}

// Icons
const Icons = {
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const ImageSelector: React.FC<ImageSelectorProps> = ({ onImageSelect, currentImage }) => {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load clues images and check for colored versions
    const loadImages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/bundle/images?bundle=gingerbread.bundle`);
        if (!response.ok) {
          throw new Error(`Failed to load images: ${response.status}`);
        }
        const data = await response.json();

        // Get all clues images (B&W versions)
        const clueImages = data.images.filter((path: string) =>
          path.includes('/clues/') && !path.includes('/cluesColored/') && !path.includes('/hotspotImages/')
        );

        // Get all cluesColored images for lookup
        const coloredImages = new Set(
          data.images
            .filter((path: string) => path.includes('/cluesColored/'))
            .map((path: string) => {
              // Extract just the filename for matching
              const filename = path.split('/').pop() || '';
              return filename.toLowerCase();
            })
        );

        // Map clue images and check for colored versions
        const imageInfos: ImageInfo[] = clueImages.map((path: string) => {
          const filename = path.split('/').pop() || '';
          const name = filename.replace(/\.(png|jpg|jpeg|webp)$/i, '').replace(/[_-]/g, ' ');

          // Check if colored version exists (same filename in cluesColored folder)
          const hasColoredVersion = coloredImages.has(filename.toLowerCase());
          const coloredPath = hasColoredVersion
            ? path.replace('/clues/', '/cluesColored/')
            : undefined;

          return {
            path,
            name,
            category: 'clues' as const,
            bundle: 'gingerbread',
            coloredPath,
            hasColoredVersion,
          };
        });

        setImages(imageInfos);
        console.log(`Loaded ${imageInfos.length} clue images (${imageInfos.filter(i => i.hasColoredVersion).length} have colored versions)`);
      } catch (err) {
        console.error('Failed to load images:', err);
        setImages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, []);

  if (isLoading) {
    return (
      <div className="image-selector">
        <div className="image-selector-loading">
          <div className="image-selector-loading-content">
            <div className="image-selector-loading-icon">
              {Icons.image}
            </div>
            <p>Loading images...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="image-selector">
      {/* Header */}
      <div className="image-selector-header">
        <div className="image-selector-header-left">
          <div className="image-selector-icon">{Icons.image}</div>
          <div className="image-selector-title">
            <h1>Select a Clue Image</h1>
            <span className="image-selector-subtitle">Choose an image to annotate with hotspots</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="image-selector-main">
        {images.length > 0 ? (
          <div className="image-selector-grid">
            {images.map((img) => (
              <div
                key={img.path}
                onClick={() => onImageSelect(img.coloredPath || img.path)}
                className={`image-selector-card ${currentImage === img.path || currentImage === img.coloredPath ? 'selected' : ''} ${!img.hasColoredVersion ? 'image-selector-card--needs-color' : ''}`}
              >
                {/* Image Preview - show colored if available, otherwise B&W */}
                <div className="image-selector-preview">
                  <img
                    src={img.coloredPath || img.path}
                    alt={img.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f5f7f8" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%235a6a6c" font-family="sans-serif" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>

                {/* Info */}
                <div className="image-selector-info">
                  <span className="image-selector-name">{img.name}</span>
                  {!img.hasColoredVersion && (
                    <span className="image-selector-status">needs color</span>
                  )}
                </div>

                {/* Selected Indicator */}
                {(currentImage === img.path || currentImage === img.coloredPath) && (
                  <div className="image-selector-check">
                    {Icons.check}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="image-selector-empty">
            <div className="image-selector-empty-icon">
              {Icons.image}
            </div>
            <p className="image-selector-empty-title">No clue images found</p>
            <p className="image-selector-empty-subtitle">Make sure cluesColored folder has images</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSelector;
