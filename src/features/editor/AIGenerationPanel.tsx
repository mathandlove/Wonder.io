/**
 * AI Generation Panel
 *
 * Full-screen AI image generation interface with 3-column layout:
 * - Left: Image gallery, description, characters, generation controls
 * - Center: Large image preview with "Use as Current Image" button
 * - Right: Version history (always visible)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AIGenerationPanel.css';

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
  exists: boolean;
  usedInScenes: number[];
}

interface StoryData {
  storyId: string;
  title: string;
  backgrounds: ImageItem[];
  storyImages: ImageItem[];
  clueImages: ImageItem[];
  coloredClueImages: ImageItem[];
  mapImages: ImageItem[];
  characterImages: CharacterImage[];
}

type ImageCategory = 'backgrounds' | 'characters' | 'clueImages' | 'coloredClueImages' | 'storyImages' | 'maps';

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

// Scene data from story.json for displaying story text
interface StoryScene {
  type: string;
  text?: string;
  image?: string;
  background?: string;
  sceneDescription?: string;
  description?: string;
  flow?: Array<{ side?: string; text?: string; type?: string }>;
}

interface FullStoryData {
  title: string;
  storyId: string;
  scenes: StoryScene[];
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
  sparkles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  spinner: (
    <svg className="ai-panel-spinner" viewBox="0 0 24 24" fill="none" width="20" height="20">
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
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
    coloredClueImages: 'Colored Clues',
    storyImages: 'Story Images',
    maps: 'Maps',
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

  // Cache-busting key to force image reload after generation
  const [imageCacheKey, setImageCacheKey] = useState(Date.now());

  // Gallery expansion state
  const [expandedCategories, setExpandedCategories] = useState<Set<ImageCategory>>(
    new Set(['backgrounds'])
  );

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scene reference state
  const [showSceneSelector, setShowSceneSelector] = useState(false);
  const [selectedSceneRefs, setSelectedSceneRefs] = useState<string[]>([]);

  // Full story data for showing scene text
  const [fullStoryData, setFullStoryData] = useState<FullStoryData | null>(null);

  // Load story data
  useEffect(() => {
    if (!isActive || !storyId) return;

    const loadStoryData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Load image data
        const response = await fetch(`${BACKEND_URL}/api/images/story?storyId=${encodeURIComponent(storyId)}`);
        if (!response.ok) {
          throw new Error(`Failed to load story: ${response.status}`);
        }
        const data = await response.json();
        setStoryData(data);

        // Also load full story.json for scene text display
        const fullStoryResponse = await fetch(`/stories/${storyId}.bundle/story.json`);
        if (fullStoryResponse.ok) {
          const fullData = await fullStoryResponse.json();
          setFullStoryData(fullData);
        }
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

  // Update description when a DIFFERENT image is selected (not just when selectedImage object changes)
  const selectedImageId = selectedImage?.id;
  useEffect(() => {
    if (selectedImage) {
      setDescription(selectedImage.description || '');
      setSelectedVersion('current');
      setModificationText('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImageId]); // Only trigger when the image ID changes, not on every object update

  const getImageUrl = useCallback((imagePath: string): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    const cacheBust = `?t=${imageCacheKey}`;
    // Handle special "bw-base:" prefix for B&W base images in coloredClueImages
    if (imagePath.startsWith('bw-base:')) {
      const actualPath = imagePath.replace('bw-base:', '');
      return `/stories/${storyId}.bundle/images/${actualPath}${cacheBust}`;
    }
    if (imagePath.startsWith('history/')) {
      return `/stories/${storyId}.history/${imagePath.replace('history/', '')}${cacheBust}`;
    }
    return `/stories/${storyId}.bundle/images/${imagePath}${cacheBust}`;
  }, [storyId, imageCacheKey]);

  const getSelectedImagePath = (): string => {
    if (!selectedImage) return '';
    if (selectedVersion === 'current') {
      return selectedImage.imagePath;
    }
    const version = history?.versions.find(v => v.version === selectedVersion);
    if (version && history) {
      // Handle special "bw-base:" prefix - return it directly (getImageUrl will handle it)
      if (version.filename.startsWith('bw-base:')) {
        return version.filename;
      }
      return `history/${history.category}/${history.imageId}/${version.filename}`;
    }
    return selectedImage.imagePath;
  };

  // Get story text for scenes that use the selected image
  const getSceneTexts = useCallback((): Array<{ sceneIndex: number; text: string; type: string }> => {
    if (!selectedImage || !fullStoryData?.scenes) return [];

    const texts: Array<{ sceneIndex: number; text: string; type: string }> = [];

    for (const sceneIndex of selectedImage.usedInScenes) {
      const scene = fullStoryData.scenes[sceneIndex];
      if (!scene) continue;

      // Get text based on scene type
      if (scene.text) {
        texts.push({ sceneIndex, text: scene.text, type: scene.type });
      } else if (scene.sceneDescription) {
        texts.push({ sceneIndex, text: scene.sceneDescription, type: scene.type });
      } else if (scene.flow && scene.flow.length > 0) {
        // For character-flow scenes, concatenate dialogue
        const dialogueTexts = scene.flow
          .filter(item => item.text)
          .map(item => item.text)
          .join(' ... ');
        if (dialogueTexts) {
          texts.push({ sceneIndex, text: dialogueTexts, type: scene.type });
        }
      }
    }

    return texts;
  }, [selectedImage, fullStoryData]);

  const handleImageSelect = (image: ImageItem, category: ImageCategory) => {
    setSelectedImage(image);
    setSelectedCategory(category);
    setSelectedCharacters([]);
    setSelectedSceneRefs([]);
    setSelectedVersion('current');
  };

  const handleCharacterToggle = (name: string) => {
    setSelectedCharacters(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const handleSceneRefToggle = (imagePath: string) => {
    setSelectedSceneRefs(prev =>
      prev.includes(imagePath)
        ? prev.filter(p => p !== imagePath)
        : [...prev, imagePath]
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
          referenceImages: selectedSceneRefs,
          numImages: 4,
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
        console.log(`Generated ${data.generatedCount || 1} images, current: ${data.imagePath}`);

        // Update cache key to force image reload
        setImageCacheKey(Date.now());

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

        // Reload history to show all generated versions
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
          referenceImages: selectedSceneRefs,
          numImages: 4,
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
        console.log(`Generated ${data.generatedCount || 1} modified images, current: ${data.imagePath}`);

        // Update cache key to force image reload
        setImageCacheKey(Date.now());

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

        // Reload history to show all generated versions
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

      const data = await response.json();

      // Update cache key to force image reload
      setImageCacheKey(Date.now());

      // Update selected image with new path
      if (data.imagePath) {
        setSelectedImage(prev => prev ? {
          ...prev,
          imagePath: data.imagePath,
          exists: true,
        } : null);
      }

      // Refresh story data
      const storyResponse = await fetch(`${BACKEND_URL}/api/images/story?storyId=${encodeURIComponent(storyId)}`);
      if (storyResponse.ok) {
        const storyData = await storyResponse.json();
        setStoryData(storyData);
      }

      // Switch to current view
      setSelectedVersion('current');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update image');
    }
  };

  const handleWipeHistory = async () => {
    if (!selectedImage || !selectedCategory) return;
    if (!history || history.versions.length === 0) return;

    const confirmed = window.confirm(
      `Delete all ${history.versions.length} version(s) from history for "${selectedImage.name}"?\n\nThis will keep the current image but remove all historical versions.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/images/wipe-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          imageId: selectedImage.name,
          category: selectedCategory,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to wipe history');
      }

      // Clear local history state
      setHistory(null);
      setSelectedVersion('current');

      console.log(`Wiped history for ${selectedImage.name}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to wipe history');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedImage || !selectedCategory) return;

    // Reset file input for future uploads
    e.target.value = '';

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('storyId', storyId);
      formData.append('imageName', selectedImage.name);
      formData.append('category', selectedCategory);

      const response = await fetch(`${BACKEND_URL}/api/images/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed (${response.status})`);
      }

      const data = await response.json();

      if (data.success && data.imagePath) {
        console.log(`Uploaded image: ${data.imagePath}`);

        // Update cache key to force image reload
        setImageCacheKey(Date.now());

        // Update selected image
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
      const message = err instanceof Error ? err.message : 'Failed to upload image';
      setError(message);
      console.error('Upload error:', message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save description to story.json
  const handleSaveDescription = async () => {
    if (!selectedImage || !selectedCategory) return;

    // Don't save if description hasn't changed
    if (description.trim() === (selectedImage.description || '').trim()) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/images/update-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          imageId: selectedImage.name,
          category: selectedCategory,
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save description');
      }

      console.log(`Saved description for ${selectedImage.name}`);

      // Refresh story data so the new description persists when switching images
      const storyResponse = await fetch(`${BACKEND_URL}/api/images/story?storyId=${encodeURIComponent(storyId)}`);
      if (storyResponse.ok) {
        const data = await storyResponse.json();
        setStoryData(data);

        // Find and update the selected image with new description
        const allImages = [
          ...data.backgrounds.map((img: ImageItem) => ({ ...img, category: 'backgrounds' as ImageCategory })),
          ...data.storyImages.map((img: ImageItem) => ({ ...img, category: 'storyImages' as ImageCategory })),
          ...data.clueImages.map((img: ImageItem) => ({ ...img, category: 'clueImages' as ImageCategory })),
          ...(data.coloredClueImages || []).map((img: ImageItem) => ({ ...img, category: 'coloredClueImages' as ImageCategory })),
        ];
        const updatedImage = allImages.find((img: ImageItem & { category: ImageCategory }) =>
          img.name === selectedImage.name && img.category === selectedCategory
        );
        if (updatedImage) {
          setSelectedImage(updatedImage);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save description');
    }
  };

  if (!isActive) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className="ai-panel-loading">
        <div className="ai-panel-loading-content">
          <div className="icon">🎨</div>
          <p>Loading story...</p>
        </div>
      </div>
    );
  }

  // Convert characterImages to ImageItem format
  const characterItems: ImageItem[] = storyData?.characterImages.map(char => ({
    id: char.name,
    name: char.name,
    imagePath: char.imagePath,
    exists: char.exists,
    usedInScenes: char.usedInScenes,
  })) || [];

  const categories: { key: ImageCategory; items: ImageItem[] }[] = [
    { key: 'backgrounds', items: storyData?.backgrounds || [] },
    { key: 'characters', items: characterItems },
    { key: 'clueImages', items: storyData?.clueImages || [] },
    { key: 'coloredClueImages', items: storyData?.coloredClueImages || [] },
    { key: 'storyImages', items: storyData?.storyImages || [] },
    { key: 'maps', items: storyData?.mapImages || [] },
  ];

  return (
    <div className="ai-panel">
      {/* Header Bar */}
      <div className="ai-panel-header">
        <div className="ai-panel-header-left">
          <button onClick={onClose} className="ai-panel-back-btn">
            {Icons.back}
            <span>Back to Editor</span>
          </button>
          <div className="ai-panel-divider" />
          <div className="ai-panel-title">
            <span className="ai-panel-title-icon">{Icons.sparkles}</span>
            <h1>AI Image Generator</h1>
          </div>
        </div>
        <span className="ai-panel-subtitle">Powered by Google Gemini</span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="ai-panel-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>{Icons.x}</button>
        </div>
      )}

      {/* Main 3-Column Layout */}
      <div className="ai-panel-main">
        {/* LEFT COLUMN: Gallery OR Controls (multi-step flow) */}
        <div className="ai-panel-left">
          {/* Step 1: Image Gallery (only when no image selected) */}
          {!selectedImage && (
            <div className="ai-panel-gallery">
              <div className="ai-panel-step-header">
                <span className="ai-panel-step-number">1</span>
                <span className="ai-panel-step-title">Select an Image</span>
              </div>
              {categories.map(({ key, items }) => {
                const isExpanded = expandedCategories.has(key);
                const missingCount = items.filter(img => !img.exists).length;

                return (
                  <div key={key} className="ai-panel-category">
                    <button
                      onClick={() => toggleCategory(key)}
                      className={`ai-panel-category-btn ${isExpanded ? 'expanded' : ''}`}
                    >
                      <div className="ai-panel-category-info">
                        <span className="ai-panel-category-name">{getCategoryLabel(key)}</span>
                        <span className="ai-panel-category-count">{items.length}</span>
                        {missingCount > 0 && (
                          <span className="ai-panel-category-missing">{missingCount} missing</span>
                        )}
                      </div>
                      <span className={`ai-panel-category-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
                    </button>

                    {isExpanded && (
                      <div className="ai-panel-grid">
                        {items.length === 0 ? (
                          <div className="ai-panel-grid-empty">No images</div>
                        ) : (
                          items.map(image => (
                            <div
                              key={image.id}
                              onClick={() => handleImageSelect(image, key)}
                              className={`ai-panel-thumb ${
                                selectedImage?.id === image.id ? 'selected' : ''
                              } ${!image.exists ? 'missing' : ''}`}
                            >
                              <div className="ai-panel-thumb-img">
                                {image.exists ? (
                                  <img src={getImageUrl(image.imagePath)} alt={image.name} />
                                ) : (
                                  <div className="ai-panel-thumb-placeholder">?</div>
                                )}
                              </div>
                              <div className="ai-panel-thumb-label">
                                <span>{image.name}</span>
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
          )}

          {/* Step 2: Controls (only when image is selected) */}
          {selectedImage && selectedCategory && (
            <div className="ai-panel-controls">
              {/* Selected Image Header with Change Button */}
              <div className="ai-panel-selected-header">
                <div className="ai-panel-selected-info">
                  <span className="ai-panel-step-number">2</span>
                  <span className="ai-panel-step-title">Generate</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedCategory(null);
                  }}
                  className="ai-panel-change-btn"
                >
                  Change Image
                </button>
              </div>

              {/* Current Selection Display */}
              <div className="ai-panel-current-selection">
                <div className="ai-panel-current-thumb">
                  {selectedImage.exists ? (
                    <img src={getImageUrl(selectedImage.imagePath)} alt={selectedImage.name} />
                  ) : (
                    <div className="ai-panel-thumb-placeholder">?</div>
                  )}
                </div>
                <div className="ai-panel-current-info">
                  <span className="ai-panel-current-name">{selectedImage.name}</span>
                  <span className="ai-panel-current-category">{getCategoryLabel(selectedCategory)}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="ai-panel-label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleSaveDescription}
                  className="ai-panel-textarea"
                  placeholder="Describe what you want..."
                  rows={3}
                />
              </div>

              {/* Characters */}
              {storyData && storyData.characterImages.length > 0 && (
                <div>
                  <label className="ai-panel-label">Characters (for compositing)</label>
                  <div className="ai-panel-characters">
                    {storyData.characterImages.map(char => {
                      const isSelected = selectedCharacters.includes(char.name);
                      return (
                        <div
                          key={char.name}
                          onClick={() => char.exists && handleCharacterToggle(char.name)}
                          className={`ai-panel-char ${isSelected ? 'selected' : ''} ${!char.exists ? 'missing' : ''}`}
                          title={char.exists ? char.name : `${char.name} (not generated)`}
                        >
                          {char.exists ? (
                            <img src={getImageUrl(char.imagePath)} alt={char.name} />
                          ) : (
                            <div className="ai-panel-char-missing">
                              <span className="ai-panel-char-missing-icon">?</span>
                              <span className="ai-panel-char-missing-name">{char.name}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Scene References */}
              <div>
                <label className="ai-panel-label">Reference Scenes</label>
                <div className="ai-panel-scene-refs">
                  {selectedSceneRefs.length > 0 && (
                    <div className="ai-panel-scene-refs-selected">
                      {selectedSceneRefs.map(path => (
                        <div
                          key={path}
                          className="ai-panel-scene-ref-thumb"
                          onClick={() => handleSceneRefToggle(path)}
                          title="Click to remove"
                        >
                          <img src={getImageUrl(path)} alt={path} />
                          <span className="ai-panel-scene-ref-remove">{Icons.x}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setShowSceneSelector(true)}
                    className="ai-panel-btn-add-scenes"
                  >
                    {Icons.plus}
                    {selectedSceneRefs.length > 0 ? 'Add More Scenes' : 'Add Reference Scenes'}
                  </button>
                </div>
              </div>

              {/* New Generation Button - hidden for coloredClueImages (modify only) */}
              {selectedCategory !== 'coloredClueImages' && (
                <button
                  onClick={handleNewGeneration}
                  disabled={isGenerating || !description.trim()}
                  className="ai-panel-btn-generate"
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
              )}

              {/* Modification Section */}
              <div className="ai-panel-modify-section">
                <label className="ai-panel-label">Modify Selected Version</label>

                {/* Show which version will be modified */}
                <div className="ai-panel-modify-source">
                  <div className="ai-panel-modify-thumb">
                    {(selectedImage.exists || selectedVersion !== 'current') ? (
                      <img src={getImageUrl(getSelectedImagePath())} alt="Source" />
                    ) : (
                      <div className="ai-panel-thumb-placeholder">?</div>
                    )}
                  </div>
                  <div className="ai-panel-modify-info">
                    <span className="ai-panel-modify-name">
                      {selectedVersion === 'current'
                        ? 'Current Version'
                        : selectedVersion === 0
                          ? 'Original B&W'
                          : `Version ${selectedVersion}`}
                    </span>
                    <span className="ai-panel-modify-hint">
                      {(!selectedImage.exists && selectedVersion === 'current')
                        ? 'No image to modify'
                        : 'Will be used as base'}
                    </span>
                  </div>
                </div>

                <textarea
                  value={modificationText}
                  onChange={(e) => setModificationText(e.target.value)}
                  className="ai-panel-textarea"
                  placeholder="Describe changes to make..."
                  rows={2}
                />
                <button
                  onClick={handleModify}
                  disabled={isGenerating || !modificationText.trim() || (!selectedImage.exists && selectedVersion === 'current')}
                  className="ai-panel-btn-modify"
                >
                  {Icons.edit}
                  Modify
                </button>
                <button
                  onClick={handleUploadClick}
                  disabled={isGenerating}
                  className="ai-panel-btn-upload"
                >
                  {Icons.upload}
                  Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* CENTER COLUMN: Image Preview */}
        <div className="ai-panel-center">
          {selectedImage ? (
            <>
              {/* Image Name */}
              <h2 className="ai-panel-image-name">
                {selectedImage.name}
                {selectedVersion !== 'current' && (
                  <span className="version">
                    (viewing {selectedVersion === 0 ? 'Original B&W' : `v${selectedVersion}`})
                  </span>
                )}
              </h2>

              {/* Large Image Preview */}
              <div className="ai-panel-preview">
                {selectedImage.exists || selectedVersion !== 'current' ? (
                  <img src={getImageUrl(getSelectedImagePath())} alt={selectedImage.name} />
                ) : (
                  <div className="ai-panel-preview-empty">
                    <div className="icon">?</div>
                    <p>Image not generated yet</p>
                  </div>
                )}
              </div>

              {/* Use as Current Image Button - hidden for version 0 (B&W base) */}
              {selectedVersion !== 'current' && selectedVersion !== 0 && (
                <button onClick={handleUseAsCurrentImage} className="ai-panel-btn-use">
                  {Icons.check}
                  Use as Current Image
                </button>
              )}

              {/* Story Text Display */}
              {getSceneTexts().length > 0 && (
                <div className="ai-panel-story-text">
                  <div className="ai-panel-story-text-header">
                    <span className="ai-panel-story-text-icon">📖</span>
                    <span>Story Text</span>
                  </div>
                  <div className="ai-panel-story-text-content">
                    {getSceneTexts().map(({ sceneIndex, text, type }) => (
                      <div key={sceneIndex} className="ai-panel-story-text-item">
                        <div className="ai-panel-story-text-meta">
                          Scene {sceneIndex + 1} • {type}
                        </div>
                        <div className="ai-panel-story-text-body">
                          {text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="ai-panel-empty">
              <div className="icon">🖼️</div>
              <p>Select an image from the gallery</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Version History */}
        <div className="ai-panel-right">
          <div className="ai-panel-history-header">
            <div className="ai-panel-history-title">
              {Icons.clock}
              <h3>Version History</h3>
            </div>
            {history && history.versions.length > 0 && (
              <button
                onClick={handleWipeHistory}
                className="ai-panel-history-clear"
                title="Clear all history"
              >
                {Icons.trash}
              </button>
            )}
          </div>

          <div className="ai-panel-history-list">
            {selectedImage ? (
              <>
                {/* Current version */}
                <div
                  onClick={() => setSelectedVersion('current')}
                  className={`ai-panel-history-item ${selectedVersion === 'current' ? 'selected' : ''}`}
                >
                  <div className="ai-panel-history-thumb">
                    {selectedImage.exists ? (
                      <img src={getImageUrl(selectedImage.imagePath)} alt="Current" />
                    ) : (
                      <div className="ai-panel-history-thumb-empty">?</div>
                    )}
                  </div>
                  <div className="ai-panel-history-info">
                    <div className="title">Current</div>
                    <div className="meta">in story.json</div>
                  </div>
                  <div className="ai-panel-history-current" />
                </div>

                {/* Historical versions */}
                {history?.versions.slice().reverse().map(version => {
                  // Handle special bw-base: prefix for B&W versions
                  const isBwBase = version.filename.startsWith('bw-base:');
                  const imageSrc = isBwBase
                    ? getImageUrl(version.filename)
                    : getImageUrl(`history/${history.category}/${history.imageId}/${version.filename}`);
                  const title = isBwBase
                    ? 'Original B&W'
                    : version.isModification ? 'Modified' : 'Generated';
                  const meta = isBwBase
                    ? 'base for coloring'
                    : `v${version.version} • ${formatTimestamp(version.timestamp)}`;

                  return (
                    <div
                      key={version.version}
                      onClick={() => setSelectedVersion(version.version)}
                      className={`ai-panel-history-item ${selectedVersion === version.version ? 'selected' : ''}`}
                    >
                      <div className="ai-panel-history-thumb">
                        <img
                          src={imageSrc}
                          alt={`v${version.version}`}
                        />
                      </div>
                      <div className="ai-panel-history-info">
                        <div className="title">{title}</div>
                        <div className="meta">{meta}</div>
                      </div>
                    </div>
                  );
                })}

                {(!history || history.versions.length === 0) && (
                  <div className="ai-panel-history-empty">No history yet</div>
                )}
              </>
            ) : (
              <div className="ai-panel-history-empty">Select an image to see history</div>
            )}
          </div>
        </div>
      </div>

      {/* Scene Selector Modal */}
      {showSceneSelector && storyData && (
        <div className="ai-panel-modal-overlay" onClick={() => setShowSceneSelector(false)}>
          <div className="ai-panel-modal" onClick={e => e.stopPropagation()}>
            <div className="ai-panel-modal-header">
              <h3>Select Reference Scenes</h3>
              <button onClick={() => setShowSceneSelector(false)} className="ai-panel-modal-close">
                {Icons.x}
              </button>
            </div>
            <div className="ai-panel-modal-body">
              <p className="ai-panel-modal-hint">
                Select existing images to use as style/content references for generation.
              </p>

              {/* Backgrounds */}
              {storyData.backgrounds.filter(img => img.exists).length > 0 && (
                <div className="ai-panel-modal-section">
                  <h4>Backgrounds</h4>
                  <div className="ai-panel-modal-grid">
                    {storyData.backgrounds.filter(img => img.exists).map(img => (
                      <div
                        key={img.id}
                        className={`ai-panel-modal-item ${selectedSceneRefs.includes(img.imagePath) ? 'selected' : ''}`}
                        onClick={() => handleSceneRefToggle(img.imagePath)}
                      >
                        <img src={getImageUrl(img.imagePath)} alt={img.name} />
                        <span className="ai-panel-modal-item-label">{img.name}</span>
                        {selectedSceneRefs.includes(img.imagePath) && (
                          <span className="ai-panel-modal-item-check">{Icons.check}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Story Images */}
              {storyData.storyImages.filter(img => img.exists).length > 0 && (
                <div className="ai-panel-modal-section">
                  <h4>Story Images</h4>
                  <div className="ai-panel-modal-grid">
                    {storyData.storyImages.filter(img => img.exists).map(img => (
                      <div
                        key={img.id}
                        className={`ai-panel-modal-item ${selectedSceneRefs.includes(img.imagePath) ? 'selected' : ''}`}
                        onClick={() => handleSceneRefToggle(img.imagePath)}
                      >
                        <img src={getImageUrl(img.imagePath)} alt={img.name} />
                        <span className="ai-panel-modal-item-label">{img.name}</span>
                        {selectedSceneRefs.includes(img.imagePath) && (
                          <span className="ai-panel-modal-item-check">{Icons.check}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clue Images */}
              {storyData.clueImages.filter(img => img.exists).length > 0 && (
                <div className="ai-panel-modal-section">
                  <h4>Clue Images</h4>
                  <div className="ai-panel-modal-grid">
                    {storyData.clueImages.filter(img => img.exists).map(img => (
                      <div
                        key={img.id}
                        className={`ai-panel-modal-item ${selectedSceneRefs.includes(img.imagePath) ? 'selected' : ''}`}
                        onClick={() => handleSceneRefToggle(img.imagePath)}
                      >
                        <img src={getImageUrl(img.imagePath)} alt={img.name} />
                        <span className="ai-panel-modal-item-label">{img.name}</span>
                        {selectedSceneRefs.includes(img.imagePath) && (
                          <span className="ai-panel-modal-item-check">{Icons.check}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Colored Clue Images */}
              {storyData.coloredClueImages.filter(img => img.exists).length > 0 && (
                <div className="ai-panel-modal-section">
                  <h4>Colored Clues</h4>
                  <div className="ai-panel-modal-grid">
                    {storyData.coloredClueImages.filter(img => img.exists).map(img => (
                      <div
                        key={img.id}
                        className={`ai-panel-modal-item ${selectedSceneRefs.includes(img.imagePath) ? 'selected' : ''}`}
                        onClick={() => handleSceneRefToggle(img.imagePath)}
                      >
                        <img src={getImageUrl(img.imagePath)} alt={img.name} />
                        <span className="ai-panel-modal-item-label">{img.name}</span>
                        {selectedSceneRefs.includes(img.imagePath) && (
                          <span className="ai-panel-modal-item-check">{Icons.check}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Map Images */}
              {storyData.mapImages.filter(img => img.exists).length > 0 && (
                <div className="ai-panel-modal-section">
                  <h4>Maps</h4>
                  <div className="ai-panel-modal-grid">
                    {storyData.mapImages.filter(img => img.exists).map(img => (
                      <div
                        key={img.id}
                        className={`ai-panel-modal-item ${selectedSceneRefs.includes(img.imagePath) ? 'selected' : ''}`}
                        onClick={() => handleSceneRefToggle(img.imagePath)}
                      >
                        <img src={getImageUrl(img.imagePath)} alt={img.name} />
                        <span className="ai-panel-modal-item-label">{img.name}</span>
                        {selectedSceneRefs.includes(img.imagePath) && (
                          <span className="ai-panel-modal-item-check">{Icons.check}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="ai-panel-modal-footer">
              <span className="ai-panel-modal-count">
                {selectedSceneRefs.length} scene{selectedSceneRefs.length !== 1 ? 's' : ''} selected
              </span>
              <button onClick={() => setShowSceneSelector(false)} className="ai-panel-btn-generate">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIGenerationPanel;
