/**
 * Image Generation Service using Google Gemini API
 *
 * Uses Gemini 2.5 Flash Image model (aka "Nano Banana") for AI image generation.
 * Supports text-to-image with optional reference images for style consistency.
 *
 * Features:
 * - Image generation with character compositing
 * - Version history tracking in .history folder
 * - Persistent generation queue
 * - Image renaming with story.json updates
 */
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

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

type JobStatus = 'pending' | 'generating' | 'completed' | 'failed';

interface GenerationJob {
  id: string;
  imageId: string;
  imageName: string;
  category: ImageCategory;
  type: 'new' | 'modify';
  baseVersion?: number;
  prompt: string;
  characters: string[];
  status: JobStatus;
  progress?: number;
  createdAt: number;
  error?: string;
  resultPath?: string;
}

interface QueueData {
  jobs: GenerationJob[];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Nano Banana Pro (Gemini 3 Pro Image) - highest quality image generation
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent';

interface ImageGenerationRequest {
  prompt: string;
  artStyle?: string;
  referenceImages?: string[]; // Paths to reference images in the bundle
  storyId: string;
  sceneIndex?: number; // Legacy support
  // New API format
  imageId?: string;
  imageName?: string;
  category?: ImageCategory;
  type?: 'new' | 'modify';
  baseVersion?: number | 'current';
  characters?: string[];
}

interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

/**
 * Convert an image file to base64
 */
function imageToBase64(imagePath: string): { mimeType: string; data: string } | null {
  try {
    const absolutePath = path.resolve(imagePath);
    if (!fs.existsSync(absolutePath)) {
      console.error(`Image not found: ${absolutePath}`);
      return null;
    }

    const buffer = fs.readFileSync(absolutePath);
    const base64 = buffer.toString('base64');

    // Determine MIME type from extension
    const ext = path.extname(imagePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };

    return {
      mimeType: mimeTypes[ext] || 'image/png',
      data: base64
    };
  } catch (error) {
    console.error(`Error reading image ${imagePath}:`, error);
    return null;
  }
}

/**
 * Art styles configuration loaded from bundle
 */
interface ArtStylesConfig {
  styles: Record<string, { name: string; prompt: string }>;
  categoryMapping: Record<string, string>;
}

/**
 * Load art styles from assets.core/art-styles.json
 */
function loadArtStyles(): ArtStylesConfig | null {
  const stylesPath = path.join(__dirname, '../../public/assets.core/art-styles.json');

  if (!fs.existsSync(stylesPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(stylesPath, 'utf-8'));
  } catch (error) {
    console.error('Error loading art styles:', error);
    return null;
  }
}

/**
 * Get the art style prompt for a specific category
 */
function getArtStyleForCategory(category: ImageCategory): string {
  const config = loadArtStyles();
  if (!config) {
    return '';
  }

  // Get the style key for this category (e.g., "backgrounds" -> "backgrounds", "characters" -> "default")
  const styleKey = config.categoryMapping[category] || 'default';
  const style = config.styles[styleKey];

  return style?.prompt || '';
}

/**
 * Build the prompt with art style and description
 */
function buildPrompt(description: string, artStyle: string): string {
  const stylePrompt = artStyle
    ? `Art style: ${artStyle}. `
    : '';

  return `${stylePrompt}Generate an illustration: ${description}. The image should be suitable for a children's storybook.`;
}

/**
 * Update story.json to reference the newly generated image
 */
async function updateStoryJsonForImage(
  storyId: string,
  category: ImageCategory,
  imageName: string,
  relativePath: string
): Promise<void> {
  const storyPath = path.join(__dirname, '../../public/stories', `${storyId}.bundle/story.json`);

  if (!fs.existsSync(storyPath)) {
    console.log(`   story.json not found, skipping update`);
    return;
  }

  try {
    const storyData = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));
    let updated = false;

    // Update scenes based on category
    for (const scene of storyData.scenes) {
      if (category === 'backgrounds' && scene.background) {
        const bgName = scene.background.replace(/\.(png|jpg|jpeg|webp)$/i, '');
        if (bgName === imageName) {
          scene.background = relativePath.replace('backgrounds/', '');
          updated = true;
        }
      }

      if (category === 'storyImages' && scene.type === 'image' && scene.image) {
        const imgName = scene.image.replace(/^story\//, '').replace(/\.(png|jpg|jpeg|webp)$/i, '');
        if (imgName === imageName) {
          scene.image = relativePath;
          updated = true;
        }
      }

      if (category === 'clueImages' && scene.type === 'clue-image' && scene.image) {
        const imgName = scene.image.replace(/\.(png|jpg|jpeg|webp)$/i, '');
        if (imgName === imageName) {
          // clue images don't have path prefix in story.json
          scene.image = imageName;
          updated = true;
        }
      }
    }

    if (updated) {
      fs.writeFileSync(storyPath, JSON.stringify(storyData, null, 2));
      console.log(`   📝 Updated story.json references`);
    }
  } catch (error) {
    console.error('Error updating story.json:', error);
  }
}

/**
 * Handle image generation request
 * Supports both legacy (sceneIndex) and new (category/imageId) formats
 */
export async function handleImageGeneration(req: Request, res: Response) {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY not configured. Add it to backend/.env'
    });
  }

  const {
    prompt,
    artStyle,
    referenceImages,
    storyId,
    sceneIndex,
    imageId,
    imageName,
    category,
    type,
    baseVersion,
    characters
  } = req.body as ImageGenerationRequest;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!storyId) {
    return res.status(400).json({ error: 'storyId is required' });
  }

  // Determine if using new or legacy API
  const isNewApi = !!category && !!imageName;

  try {
    // Get art style: use provided artStyle, or load from art-styles.json based on category
    let effectiveArtStyle = artStyle || '';
    if (!effectiveArtStyle && isNewApi && category) {
      effectiveArtStyle = getArtStyleForCategory(category);
    }

    console.log(`🎨 Generating image ${isNewApi ? `"${imageName}" (${category})` : `for scene ${sceneIndex}`} in story ${storyId}`);
    console.log(`   Prompt: ${prompt}`);
    console.log(`   Art style: ${effectiveArtStyle ? effectiveArtStyle.substring(0, 50) + '...' : 'none'}`);
    if (characters?.length) {
      console.log(`   Characters: ${characters.join(', ')}`);
    }

    // Build the full prompt
    const fullPrompt = buildPrompt(prompt, effectiveArtStyle);

    // Build request parts
    const parts: GeminiPart[] = [{ text: fullPrompt }];

    // Add reference images if provided
    if (referenceImages && referenceImages.length > 0) {
      const bundlePath = path.join(__dirname, '../../public/stories', `${storyId}.bundle/images`);

      for (const refImage of referenceImages) {
        const imagePath = path.join(bundlePath, refImage);
        const imageData = imageToBase64(imagePath);

        if (imageData) {
          parts.push({
            inline_data: {
              mime_type: imageData.mimeType,
              data: imageData.data
            }
          });
          console.log(`   Added reference image: ${refImage}`);
        }
      }
    }

    // Make request to Gemini API
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE']
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);

      // Parse rate limit info from 429 responses
      if (response.status === 429) {
        let retryAfter = 60; // Default to 60 seconds
        try {
          const errorData = JSON.parse(errorText);
          // Extract retry delay from response
          const retryInfo = errorData.error?.details?.find(
            (d: { '@type': string }) => d['@type']?.includes('RetryInfo')
          );
          if (retryInfo?.retryDelay) {
            // Parse "41s" or "41.828322902s" format
            const match = retryInfo.retryDelay.match(/(\d+)/);
            if (match) {
              retryAfter = parseInt(match[1], 10);
            }
          }
        } catch {
          // Ignore parsing errors, use default
        }

        return res.status(429).json({
          error: `Rate limited. Please wait ${retryAfter} seconds and try again.`,
          retryAfter,
        });
      }

      return res.status(response.status).json({
        error: `Gemini API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();

    // Extract image from response
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      return res.status(500).json({ error: 'No candidates in response' });
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      return res.status(500).json({ error: 'No content in response' });
    }

    // Find the image part in the response
    let imageData: { mimeType: string; data: string } | null = null;
    let responseText = '';

    for (const part of content.parts) {
      if (part.inlineData) {
        imageData = {
          mimeType: part.inlineData.mimeType,
          data: part.inlineData.data
        };
      }
      if (part.text) {
        responseText = part.text;
      }
    }

    if (!imageData) {
      return res.status(500).json({
        error: 'No image generated',
        text: responseText
      });
    }

    const timestamp = Date.now();
    const extension = imageData.mimeType.split('/')[1] || 'png';
    const imageBuffer = Buffer.from(imageData.data, 'base64');

    let relativePath: string;
    let filePath: string;

    if (isNewApi && category && imageName) {
      // New API: Save to correct folder based on category
      const mapping = getCategoryMapping(category);
      const bundleImagesPath = path.join(__dirname, '../../public/stories', `${storyId}.bundle/images`, mapping.folder);

      // Ensure directory exists
      if (!fs.existsSync(bundleImagesPath)) {
        fs.mkdirSync(bundleImagesPath, { recursive: true });
      }

      // Use the imageName directly (replacing existing file)
      const filename = `${imageName}.${extension}`;
      filePath = path.join(bundleImagesPath, filename);

      // Write the image file
      fs.writeFileSync(filePath, imageBuffer);
      relativePath = `${mapping.folder}/${filename}`;

      console.log(`✅ Generated image saved: ${filePath}`);

      // Save to history
      const historyDir = getImageHistoryPath(storyId, category, imageName);
      if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
      }

      // Load or create history
      let history = loadImageHistory(storyId, category, imageName);
      const nextVersion = history ? history.versions.length + 1 : 1;

      if (!history) {
        history = {
          imageId: imageName,
          category,
          versions: [],
          currentVersion: 0,
        };
      }

      // Save image to history folder
      const historyFilename = `v${nextVersion}-${timestamp}.${extension}`;
      const historyFilePath = path.join(historyDir, historyFilename);
      fs.writeFileSync(historyFilePath, imageBuffer);

      // Add version to history
      history.versions.push({
        version: nextVersion,
        filename: historyFilename,
        timestamp,
        prompt,
        charactersReferenced: characters || [],
        isModification: type === 'modify',
        baseVersion: type === 'modify' && baseVersion !== 'current' ? baseVersion as number : undefined,
      });
      history.currentVersion = nextVersion;

      saveImageHistory(storyId, history);
      console.log(`📜 Saved to history: v${nextVersion}`);

      // Update story.json references if needed
      await updateStoryJsonForImage(storyId, category, imageName, relativePath);

    } else {
      // Legacy API: Save to story folder with scene index
      const bundleImagesPath = path.join(__dirname, '../../public/stories', `${storyId}.bundle/images/story`);

      if (!fs.existsSync(bundleImagesPath)) {
        fs.mkdirSync(bundleImagesPath, { recursive: true });
      }

      const filename = `generated-scene-${sceneIndex || 0}-${timestamp}.${extension}`;
      filePath = path.join(bundleImagesPath, filename);
      fs.writeFileSync(filePath, imageBuffer);
      relativePath = `story/${filename}`;

      console.log(`✅ Generated image saved: ${filePath}`);
    }

    res.json({
      success: true,
      imagePath: relativePath,
      fullPath: filePath,
      text: responseText,
      category,
      imageName,
    });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({
      error: 'Failed to generate image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Image item with existence status
 */
interface ImageItem {
  id: string;
  name: string;
  imagePath: string;
  exists: boolean;
  usedInScenes: number[];  // Scene indices where this image is used
  description?: string;
}

/**
 * Get story data including all image categories: backgrounds, storyImages, and clues
 */
export async function handleGetStoryImages(req: Request, res: Response) {
  const { storyId } = req.query;

  if (!storyId || typeof storyId !== 'string') {
    return res.status(400).json({ error: 'storyId query parameter is required' });
  }

  try {
    const bundlePath = path.join(__dirname, '../../public/stories', `${storyId}.bundle`);
    const storyPath = path.join(bundlePath, 'story.json');

    if (!fs.existsSync(storyPath)) {
      return res.status(404).json({ error: `Story not found: ${storyId}` });
    }

    const storyData = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));

    // Get background descriptions from story.json (if present)
    const backgroundDescriptions: Record<string, string> = storyData.backgroundDescriptions || {};

    // Track all required images from story.json
    const backgroundsNeeded = new Map<string, { scenes: number[]; description?: string }>();
    const storyImagesNeeded = new Map<string, { scenes: number[]; description?: string }>();
    const clueImagesNeeded = new Map<string, { scenes: number[]; clueDescriptions?: Array<{ hotspotName: string; description: string; image: string }> }>();

    // Extract characters for reference images
    const characters = new Set<string>();

    storyData.scenes.forEach((scene: Record<string, unknown>, index: number) => {
      // Collect backgrounds (from text, character-flow scenes)
      if (scene.background) {
        const bgName = (scene.background as string).replace(/\.(png|jpg|jpeg|webp)$/i, '');
        const existing = backgroundsNeeded.get(bgName) || { scenes: [] };
        existing.scenes.push(index);
        // Use backgroundDescriptions if available, otherwise fall back to scene text
        if (!existing.description) {
          existing.description = backgroundDescriptions[bgName] || (scene.text as string | undefined);
        }
        backgroundsNeeded.set(bgName, existing);
      }

      // Collect story images (from image type scenes)
      if (scene.type === 'image' && scene.image) {
        const imgPath = scene.image as string;
        // Story images are in story/ subfolder
        const imgName = imgPath.replace(/^story\//, '').replace(/\.(png|jpg|jpeg|webp)$/i, '');
        const existing = storyImagesNeeded.get(imgName) || { scenes: [] };
        existing.scenes.push(index);
        if (scene.text) existing.description = scene.text as string;
        storyImagesNeeded.set(imgName, existing);
      }

      // Collect clue images (from clue-image type scenes)
      if (scene.type === 'clue-image' && scene.image) {
        const imgName = (scene.image as string).replace(/\.(png|jpg|jpeg|webp)$/i, '');
        const existing = clueImagesNeeded.get(imgName) || { scenes: [] };
        existing.scenes.push(index);
        if (scene.clueDescriptions) {
          existing.clueDescriptions = scene.clueDescriptions as Array<{ hotspotName: string; description: string; image: string }>;
        }
        clueImagesNeeded.set(imgName, existing);
      }

      // Collect characters
      if (scene['left-character'] && scene['left-character'] !== 'NOCHARACTER' && scene['left-character'] !== 'none') {
        characters.add(scene['left-character'] as string);
      }
      if (scene['right-character'] && scene['right-character'] !== 'NOCHARACTER' && scene['right-character'] !== 'none') {
        characters.add(scene['right-character'] as string);
      }
    });

    // Helper to check if image exists in folder
    const findImageFile = (folder: string, baseName: string): string | null => {
      const folderPath = path.join(bundlePath, 'images', folder);
      if (!fs.existsSync(folderPath)) return null;

      const extensions = ['.png', '.jpg', '.jpeg', '.webp'];
      for (const ext of extensions) {
        const filePath = path.join(folderPath, baseName + ext);
        if (fs.existsSync(filePath)) {
          return `${folder}/${baseName}${ext}`;
        }
      }
      return null;
    };

    // Build backgrounds list
    const backgrounds: ImageItem[] = [];
    for (const [name, data] of backgroundsNeeded) {
      const existingPath = findImageFile('backgrounds', name);
      backgrounds.push({
        id: `bg-${name}`,
        name,
        imagePath: existingPath || `backgrounds/${name}.png`,
        exists: !!existingPath,
        usedInScenes: data.scenes,
        description: data.description
      });
    }

    // Build story images list
    const storyImages: ImageItem[] = [];
    for (const [name, data] of storyImagesNeeded) {
      const existingPath = findImageFile('story', name);
      storyImages.push({
        id: `story-${name}`,
        name,
        imagePath: existingPath || `story/${name}.png`,
        exists: !!existingPath,
        usedInScenes: data.scenes,
        description: data.description
      });
    }

    // Build clue images list
    const clueImages: ImageItem[] = [];
    for (const [name, data] of clueImagesNeeded) {
      // Check both clues/ and cluesColored/ folders
      const existingPath = findImageFile('cluesColored', name) || findImageFile('clues', name);
      clueImages.push({
        id: `clue-${name}`,
        name,
        imagePath: existingPath || `clues/${name}.png`,
        exists: !!existingPath,
        usedInScenes: data.scenes,
        description: data.clueDescriptions?.map(c => c.hotspotName).join(', ')
      });
    }

    // Get character image paths (for reference images)
    const characterImages: Array<{ name: string; imagePath: string }> = [];
    const charactersPath = path.join(bundlePath, 'images/characters');

    for (const char of characters) {
      const possiblePaths = [
        `${char}.sticker-cardboard-3d.webp`,
        `${char}.png`,
        `${char}.webp`,
        `${char}.jpg`
      ];

      for (const possiblePath of possiblePaths) {
        const fullPath = path.join(charactersPath, possiblePath);
        if (fs.existsSync(fullPath)) {
          characterImages.push({
            name: char,
            imagePath: `characters/${possiblePath}`
          });
          break;
        }
      }
    }

    res.json({
      storyId,
      title: storyData.title,
      backgrounds,
      storyImages,
      clueImages,
      characterImages
    });

  } catch (error) {
    console.error('Error loading story images:', error);
    res.status(500).json({
      error: 'Failed to load story images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Update a scene's image in story.json
 */
export async function handleUpdateSceneImage(req: Request, res: Response) {
  const { storyId, sceneIndex, imagePath, description } = req.body;

  if (!storyId || sceneIndex === undefined || !imagePath) {
    return res.status(400).json({ error: 'storyId, sceneIndex, and imagePath are required' });
  }

  try {
    const storyPath = path.join(__dirname, '../../public/stories', `${storyId}.bundle/story.json`);

    if (!fs.existsSync(storyPath)) {
      return res.status(404).json({ error: `Story not found: ${storyId}` });
    }

    const storyData = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));

    if (sceneIndex < 0 || sceneIndex >= storyData.scenes.length) {
      return res.status(400).json({ error: 'Invalid scene index' });
    }

    const scene = storyData.scenes[sceneIndex];

    // Update the scene
    scene.image = imagePath;
    if (description) {
      scene.description = description;
    }

    // Write back to file
    fs.writeFileSync(storyPath, JSON.stringify(storyData, null, 2));

    console.log(`✅ Updated scene ${sceneIndex} image to: ${imagePath}`);

    res.json({
      success: true,
      scene: storyData.scenes[sceneIndex]
    });

  } catch (error) {
    console.error('Error updating scene image:', error);
    res.status(500).json({
      error: 'Failed to update scene image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ============================================================================
// History Management
// ============================================================================

/**
 * Get the history folder path for a story
 */
function getHistoryPath(storyId: string): string {
  return path.join(__dirname, '../../public/stories', `${storyId}.history`);
}

/**
 * Get the history metadata path for an image
 */
function getImageHistoryPath(storyId: string, category: ImageCategory, imageId: string): string {
  return path.join(getHistoryPath(storyId), category, imageId);
}

/**
 * Load history for an image
 */
function loadImageHistory(storyId: string, category: ImageCategory, imageId: string): ImageHistory | null {
  const historyDir = getImageHistoryPath(storyId, category, imageId);
  const metadataPath = path.join(historyDir, 'metadata.json');

  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Save history for an image
 */
function saveImageHistory(storyId: string, history: ImageHistory): void {
  const historyDir = getImageHistoryPath(storyId, history.category, history.imageId);

  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const metadataPath = path.join(historyDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(history, null, 2));
}

/**
 * Get image history
 */
export async function handleGetHistory(req: Request, res: Response) {
  const { storyId, imageId, category } = req.query;

  if (!storyId || !imageId || !category) {
    return res.status(400).json({ error: 'storyId, imageId, and category are required' });
  }

  try {
    const history = loadImageHistory(
      storyId as string,
      category as ImageCategory,
      imageId as string
    );

    if (!history) {
      return res.status(404).json({ error: 'No history found' });
    }

    res.json(history);
  } catch (error) {
    console.error('Error loading history:', error);
    res.status(500).json({ error: 'Failed to load history' });
  }
}

// ============================================================================
// Queue Management
// ============================================================================

/**
 * Get the queue file path for a story
 */
function getQueuePath(storyId: string): string {
  return path.join(getHistoryPath(storyId), 'queue.json');
}

/**
 * Load the queue for a story
 */
function loadQueue(storyId: string): QueueData {
  const queuePath = getQueuePath(storyId);

  if (!fs.existsSync(queuePath)) {
    return { jobs: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
  } catch {
    return { jobs: [] };
  }
}

/**
 * Save the queue for a story
 */
function saveQueue(storyId: string, queue: QueueData): void {
  const historyPath = getHistoryPath(storyId);

  if (!fs.existsSync(historyPath)) {
    fs.mkdirSync(historyPath, { recursive: true });
  }

  const queuePath = getQueuePath(storyId);
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
}

/**
 * Get generation queue
 */
export async function handleGetQueue(req: Request, res: Response) {
  const { storyId } = req.query;

  if (!storyId) {
    return res.status(400).json({ error: 'storyId is required' });
  }

  try {
    const queue = loadQueue(storyId as string);
    res.json(queue);
  } catch (error) {
    console.error('Error loading queue:', error);
    res.status(500).json({ error: 'Failed to load queue' });
  }
}

// ============================================================================
// Rename Image
// ============================================================================

/**
 * Map category to the folder and story.json field names
 */
function getCategoryMapping(category: ImageCategory): { folder: string; field: string; descField?: string } {
  const mapping: Record<ImageCategory, { folder: string; field: string; descField?: string }> = {
    backgrounds: { folder: 'backgrounds', field: 'background', descField: 'backgroundDescriptions' },
    characters: { folder: 'characters', field: 'left-character' }, // Also check right-character
    clueImages: { folder: 'clues', field: 'image' },
    storyImages: { folder: 'story', field: 'image' },
  };
  return mapping[category];
}

/**
 * Rename an image and update all references in story.json
 */
export async function handleRenameImage(req: Request, res: Response) {
  const { storyId, imageId, category, newName } = req.body;

  if (!storyId || !imageId || !category || !newName) {
    return res.status(400).json({ error: 'storyId, imageId, category, and newName are required' });
  }

  try {
    const bundlePath = path.join(__dirname, '../../public/stories', `${storyId}.bundle`);
    const storyPath = path.join(bundlePath, 'story.json');
    const mapping = getCategoryMapping(category);

    // Extract old name from imageId (e.g., "bg-bakery" -> "bakery")
    const oldName = imageId.replace(/^(bg-|story-|clue-|char-)/, '');

    // 1. Rename the image file
    const imagesFolder = path.join(bundlePath, 'images', mapping.folder);
    const extensions = ['.png', '.jpg', '.jpeg', '.webp'];
    let renamedFile = false;

    for (const ext of extensions) {
      const oldPath = path.join(imagesFolder, oldName + ext);
      if (fs.existsSync(oldPath)) {
        const newPath = path.join(imagesFolder, newName + ext);
        fs.renameSync(oldPath, newPath);
        renamedFile = true;
        console.log(`📁 Renamed ${oldPath} -> ${newPath}`);
        break;
      }
    }

    // 2. Rename history folder if it exists
    const historyPath = getHistoryPath(storyId);
    const oldHistoryDir = path.join(historyPath, category, oldName);
    const newHistoryDir = path.join(historyPath, category, newName);

    if (fs.existsSync(oldHistoryDir)) {
      fs.renameSync(oldHistoryDir, newHistoryDir);

      // Update imageId in metadata.json
      const metadataPath = path.join(newHistoryDir, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        metadata.imageId = newName;
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      }
      console.log(`📁 Renamed history folder ${oldHistoryDir} -> ${newHistoryDir}`);
    }

    // 3. Update story.json references
    if (fs.existsSync(storyPath)) {
      const storyData = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));
      let updatedCount = 0;

      // Update scenes
      for (const scene of storyData.scenes) {
        // Handle backgrounds
        if (category === 'backgrounds' && scene.background) {
          const bgName = scene.background.replace(/\.(png|jpg|jpeg|webp)$/i, '');
          if (bgName === oldName) {
            scene.background = newName + path.extname(scene.background || '.png');
            updatedCount++;
          }
        }

        // Handle characters
        if (category === 'characters') {
          if (scene['left-character'] === oldName) {
            scene['left-character'] = newName;
            updatedCount++;
          }
          if (scene['right-character'] === oldName) {
            scene['right-character'] = newName;
            updatedCount++;
          }
        }

        // Handle clue images
        if (category === 'clueImages' && scene.type === 'clue-image' && scene.image) {
          const imgName = scene.image.replace(/\.(png|jpg|jpeg|webp)$/i, '');
          if (imgName === oldName) {
            scene.image = newName;
            updatedCount++;
          }
        }

        // Handle story images
        if (category === 'storyImages' && scene.type === 'image' && scene.image) {
          const imgName = scene.image.replace(/^story\//, '').replace(/\.(png|jpg|jpeg|webp)$/i, '');
          if (imgName === oldName) {
            const ext = path.extname(scene.image) || '.png';
            scene.image = `story/${newName}${ext}`;
            updatedCount++;
          }
        }
      }

      // Update backgroundDescriptions if present
      if (category === 'backgrounds' && storyData.backgroundDescriptions) {
        if (storyData.backgroundDescriptions[oldName]) {
          storyData.backgroundDescriptions[newName] = storyData.backgroundDescriptions[oldName];
          delete storyData.backgroundDescriptions[oldName];
          updatedCount++;
        }
      }

      // Write back
      fs.writeFileSync(storyPath, JSON.stringify(storyData, null, 2));
      console.log(`📝 Updated ${updatedCount} references in story.json`);
    }

    res.json({
      success: true,
      oldName,
      newName,
      renamedFile,
    });

  } catch (error) {
    console.error('Error renaming image:', error);
    res.status(500).json({
      error: 'Failed to rename image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ============================================================================
// Use Historical Version as Current
// ============================================================================

/**
 * Copy a historical version to become the current image
 */
export async function handleUseVersion(req: Request, res: Response) {
  const { storyId, imageId, category, version } = req.body;

  if (!storyId || !imageId || !category || version === undefined) {
    return res.status(400).json({ error: 'storyId, imageId, category, and version are required' });
  }

  try {
    const history = loadImageHistory(storyId, category, imageId);
    if (!history) {
      return res.status(404).json({ error: 'No history found' });
    }

    const versionData = history.versions.find(v => v.version === version);
    if (!versionData) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Get paths
    const historyDir = getImageHistoryPath(storyId, category, imageId);
    const historyImagePath = path.join(historyDir, versionData.filename);

    const bundlePath = path.join(__dirname, '../../public/stories', `${storyId}.bundle`);
    const mapping = getCategoryMapping(category);
    const ext = path.extname(versionData.filename);

    // Extract the actual filename (without prefix like bg-, story-, etc.)
    const imageName = imageId.replace(/^(bg-|story-|clue-|char-)/, '');

    // Find and remove old image
    const imagesFolder = path.join(bundlePath, 'images', mapping.folder);
    const extensions = ['.png', '.jpg', '.jpeg', '.webp'];

    for (const oldExt of extensions) {
      const oldPath = path.join(imagesFolder, imageName + oldExt);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        break;
      }
    }

    // Copy history version to images folder
    const newImagePath = path.join(imagesFolder, imageName + ext);
    fs.copyFileSync(historyImagePath, newImagePath);

    // Update history metadata
    history.currentVersion = version;
    saveImageHistory(storyId, history);

    console.log(`✅ Set version ${version} as current for ${imageId} (filename: ${imageName})`);

    res.json({
      success: true,
      imagePath: `${mapping.folder}/${imageName}${ext}`,
    });

  } catch (error) {
    console.error('Error using version:', error);
    res.status(500).json({
      error: 'Failed to use version',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ============================================================================
// Wipe History
// ============================================================================

/**
 * Wipe history for a single image
 */
export async function handleWipeHistory(req: Request, res: Response) {
  const { storyId, imageId, category } = req.body;

  if (!storyId || !imageId || !category) {
    return res.status(400).json({ error: 'storyId, imageId, and category are required' });
  }

  try {
    const historyDir = getImageHistoryPath(storyId, category, imageId);

    if (fs.existsSync(historyDir)) {
      fs.rmSync(historyDir, { recursive: true });
      console.log(`🗑️ Wiped history for ${imageId}`);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error wiping history:', error);
    res.status(500).json({
      error: 'Failed to wipe history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Wipe all history for a story
 */
export async function handleWipeAllHistory(req: Request, res: Response) {
  const { storyId } = req.body;

  if (!storyId) {
    return res.status(400).json({ error: 'storyId is required' });
  }

  try {
    const historyPath = getHistoryPath(storyId);

    if (fs.existsSync(historyPath)) {
      // Keep queue.json, delete everything else
      const queuePath = path.join(historyPath, 'queue.json');
      const queueBackup = fs.existsSync(queuePath)
        ? fs.readFileSync(queuePath, 'utf-8')
        : null;

      fs.rmSync(historyPath, { recursive: true });
      fs.mkdirSync(historyPath, { recursive: true });

      // Restore queue
      if (queueBackup) {
        fs.writeFileSync(queuePath, queueBackup);
      }

      console.log(`🗑️ Wiped all history for ${storyId}`);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error wiping all history:', error);
    res.status(500).json({
      error: 'Failed to wipe all history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
