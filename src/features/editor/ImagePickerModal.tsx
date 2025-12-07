/**
 * Image Picker Modal Component
 *
 * A modal dialog that displays thumbnails of available images
 * for selection (backgrounds, characters, story images, etc.)
 */
import React, { useState, useEffect } from 'react';
import './ImagePickerModal.css';
import { API_URL } from '../../config';

export type ImageCategory = 'backgrounds' | 'characters' | 'story' | 'clues' | 'maps';

interface ImagePickerModalProps {
  isOpen: boolean;
  category: ImageCategory;
  currentValue: string | null;
  onSelect: (imagePath: string) => void;
  onClose: () => void;
  title?: string;
}

interface ImageItem {
  path: string;
  filename: string;
  displayName: string;
  fullPath: string;
}

const BACKEND_URL = API_URL;

// Icons
const Icons = {
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
};

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  isOpen,
  category,
  currentValue,
  onSelect,
  onClose,
  title,
}) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine the folder path based on category
  const getCategoryFolder = (cat: ImageCategory): string => {
    switch (cat) {
      case 'backgrounds': return '/backgrounds/';
      case 'characters': return '/characters/';
      case 'story': return '/story/';
      case 'clues': return '/cluesColored/';
      case 'maps': return '/maps/';
      default: return '/';
    }
  };

  // Get display title
  const getTitle = (): string => {
    if (title) return title;
    switch (category) {
      case 'backgrounds': return 'Select Background';
      case 'characters': return 'Select Character';
      case 'story': return 'Select Story Image';
      case 'clues': return 'Select Clue Image';
      case 'maps': return 'Select Map Image';
      default: return 'Select Image';
    }
  };

  // Load images when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadImages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${BACKEND_URL}/api/bundle/images?bundle=gingerbread.bundle`);
        if (!response.ok) {
          throw new Error(`Failed to load images: ${response.status}`);
        }

        const data = await response.json();
        const folderPath = getCategoryFolder(category);

        // Filter images by category folder
        const filteredImages: ImageItem[] = data.images
          .filter((path: string) => {
            // Special handling for characters - exclude sticker variants
            if (category === 'characters') {
              return path.includes(folderPath) && !path.includes('.sticker-');
            }
            return path.includes(folderPath);
          })
          .map((path: string) => {
            const filename = path.split('/').pop() || '';
            // Clean up display name
            let displayName = filename
              .replace(/\.(png|jpg|jpeg|webp)$/i, '')
              .replace(/[_-]/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize words

            return {
              path,
              filename,
              displayName,
              fullPath: path,
            };
          });

        setImages(filteredImages);
      } catch (err) {
        console.error('Failed to load images:', err);
        setError(err instanceof Error ? err.message : 'Failed to load images');
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, [isOpen, category]);

  // Handle selection
  const handleSelect = (img: ImageItem) => {
    // Return appropriate format based on category
    let value: string;

    switch (category) {
      case 'backgrounds':
        // Backgrounds use just the filename
        value = img.filename;
        break;
      case 'characters':
        // Characters use just the name without extension
        value = img.filename.replace(/\.(png|jpg|jpeg|webp)$/i, '');
        break;
      case 'story':
        // Story images use 'story/filename'
        value = `story/${img.filename}`;
        break;
      case 'clues':
        // Clues use just filename without extension
        value = img.filename.replace(/\.(png|jpg|jpeg|webp)$/i, '');
        break;
      case 'maps':
        // Maps use just filename
        value = img.filename;
        break;
      default:
        value = img.filename;
    }

    onSelect(value);
    onClose();
  };

  // Check if an image matches current value
  const isSelected = (img: ImageItem): boolean => {
    if (!currentValue) return false;

    const currentLower = currentValue.toLowerCase();
    const filenameLower = img.filename.toLowerCase();
    const nameWithoutExt = filenameLower.replace(/\.(png|jpg|jpeg|webp)$/i, '');

    return (
      currentLower === filenameLower ||
      currentLower === nameWithoutExt ||
      currentLower === `story/${filenameLower}` ||
      currentLower === `story/${nameWithoutExt}` ||
      currentLower.endsWith(filenameLower) ||
      currentLower.endsWith(nameWithoutExt)
    );
  };

  if (!isOpen) return null;

  return (
    <div className="image-picker-overlay" onClick={onClose}>
      <div className="image-picker-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="image-picker-header">
          <div className="image-picker-header-left">
            <div className="image-picker-icon">{Icons.image}</div>
            <h2>{getTitle()}</h2>
          </div>
          <button className="image-picker-close" onClick={onClose}>
            {Icons.close}
          </button>
        </div>

        {/* Content */}
        <div className="image-picker-content">
          {isLoading && (
            <div className="image-picker-loading">
              <p>Loading images...</p>
            </div>
          )}

          {error && (
            <div className="image-picker-error">
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && images.length === 0 && (
            <div className="image-picker-empty">
              <div className="image-picker-empty-icon">{Icons.image}</div>
              <p>No images found in this category</p>
            </div>
          )}

          {!isLoading && !error && images.length > 0 && (
            <div className="image-picker-grid">
              {images.map((img) => (
                <div
                  key={img.path}
                  className={`image-picker-item ${isSelected(img) ? 'selected' : ''}`}
                  onClick={() => handleSelect(img)}
                >
                  <div className="image-picker-thumbnail">
                    <img
                      src={img.fullPath}
                      alt={img.displayName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f1f5f9" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-family="sans-serif" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  <span className="image-picker-name">{img.displayName}</span>
                  {isSelected(img) && (
                    <div className="image-picker-check">{Icons.check}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="image-picker-footer">
          <span className="image-picker-count">{images.length} images available</span>
          <button className="image-picker-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImagePickerModal;
