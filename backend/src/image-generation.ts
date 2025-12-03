/**
 * Image Generation Service using Google AI APIs
 *
 * Uses two models based on the request:
 * - Imagen 4.0: For pure text-to-image generation (highest quality)
 * - Gemini 3 Pro Image: For modifications, reference images, and character compositing
 *
 * Features:
 * - Text-to-image generation via Imagen 4.0
 * - Image modification and reference-based generation via Gemini 3
 * - Character compositing support (Gemini 3)
 * - Version history tracking in .history folder
 * - Persistent generation queue
 * - Image renaming with story.json updates
 */
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

type ImageCategory = 'backgrounds' | 'characters' | 'clueImages' | 'coloredClueImages' | 'storyImages';

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
// Imagen 4.0 - for pure text-to-image (highest quality, no reference support)
const IMAGEN_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict';
// Gemini 3 Pro Image - for image modification and reference-based generation
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
 * Build the prompt with art style and description for NEW image generation
 */
function buildPrompt(description: string, artStyle: string): string {
  const stylePrompt = artStyle
    ? `Art style: ${artStyle}. `
    : '';

  return `${stylePrompt}Generate an illustration: ${description}. The image should be suitable for a children's storybook.`;
}

/**
 * Build the prompt for MODIFYING an existing image
 * Does NOT include art style - just the modification instructions
 */
function buildModifyPrompt(modificationInstructions: string): string {
  return `Modify the provided image according to these instructions: ${modificationInstructions}. Keep the same general style and composition, but apply the requested changes.`;
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
 * Generate images from Imagen 4.0 API
 * Returns array of image data or empty array if failed
 * Note: Imagen 4.0 can generate multiple images per request via sampleCount
 */
async function generateImagesFromImagen(
  prompt: string,
  sampleCount: number = 4
): Promise<Array<{ mimeType: string; data: string }>> {
  try {
    const response = await fetch(`${IMAGEN_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: Math.min(sampleCount, 4), // Imagen 4.0 supports max 4 per request
          aspectRatio: '16:9' // Landscape orientation
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Imagen generation failed: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    const predictions = data.predictions;
    if (!predictions || predictions.length === 0) {
      console.error('No predictions in Imagen response. Full response:', JSON.stringify(data, null, 2));
      return [];
    }

    const images: Array<{ mimeType: string; data: string }> = [];
    for (const prediction of predictions) {
      if (prediction.bytesBase64Encoded) {
        images.push({
          mimeType: 'image/png',
          data: prediction.bytesBase64Encoded
        });
      }
    }

    return images;
  } catch (error) {
    console.error('Imagen generation error:', error);
    return [];
  }
}

/**
 * Generate a single image from Gemini 3 API (supports reference images and modifications)
 * Returns the image data or null if failed
 */
async function generateSingleImageFromGemini(
  parts: GeminiPart[],
  index: number
): Promise<{ mimeType: string; data: string; text?: string } | null> {
  try {
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
      console.error(`Image ${index + 1} generation failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      console.error(`Image ${index + 1}: No candidates in response`);
      return null;
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      console.error(`Image ${index + 1}: No content in response`);
      return null;
    }

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
      console.error(`Image ${index + 1}: No image in response`);
      return null;
    }

    return { ...imageData, text: responseText };
  } catch (error) {
    console.error(`Image ${index + 1} generation error:`, error);
    return null;
  }
}

/**
 * Handle image generation request
 * Supports both legacy (sceneIndex) and new (category/imageId) formats
 * Generates 10 images in parallel and returns all successful results
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
    characters,
    numImages = 3  // Default to 3 images
  } = req.body as ImageGenerationRequest & { numImages?: number };

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!storyId) {
    return res.status(400).json({ error: 'storyId is required' });
  }

  // Determine if using new or legacy API
  const isNewApi = !!category && !!imageName;
  const isModification = type === 'modify';

  try {
    // Get art style: use provided artStyle, or load from art-styles.json based on category
    // Note: Art style is NOT used for modifications - only for new generations
    let effectiveArtStyle = artStyle || '';
    if (!effectiveArtStyle && isNewApi && category && !isModification) {
      effectiveArtStyle = getArtStyleForCategory(category);
    }

    console.log(`🎨 ${isModification ? 'Modifying' : 'Generating'} ${numImages} images for ${isNewApi ? `"${imageName}" (${category})` : `scene ${sceneIndex}`} in story ${storyId}`);
    console.log(`   ${isModification ? 'Modification' : 'Prompt'}: ${prompt}`);
    if (!isModification) {
      console.log(`   Art style: ${effectiveArtStyle ? effectiveArtStyle.substring(0, 50) + '...' : 'none'}`);
    }
    if (isModification) {
      console.log(`   Base version: ${baseVersion}`);
    }
    if (characters?.length) {
      console.log(`   Characters: ${characters.join(', ')}`);
    }

    // Build the full prompt - different for modifications vs new generations
    const fullPrompt = isModification
      ? buildModifyPrompt(prompt)
      : buildPrompt(prompt, effectiveArtStyle);

    // Decide which model to use:
    // - Gemini 3: for modifications, reference images, or character compositing
    // - Imagen 4.0: for pure text-to-image (higher quality)
    const useGemini = isModification ||
      (referenceImages && referenceImages.length > 0) ||
      (characters && characters.length > 0);

    let successfulImages: Array<{ mimeType: string; data: string; text?: string }> = [];

    if (useGemini) {
      // Use Gemini 3 Pro Image for reference-based generation
      console.log(`   Using Gemini 3 Pro Image (references/modifications detected)...`);

      // Build request parts
      const parts: GeminiPart[] = [];

      // For modifications, add the base image FIRST
      if (isModification && isNewApi && category && imageName) {
        const bundlePath = path.join(__dirname, '../../public/stories', `${storyId}.bundle/images`);
        const mapping = getCategoryMapping(category);
        let baseImagePath: string | null = null;

        if (baseVersion === 'current') {
          // Use current image from bundle
          const extensions = ['.png', '.jpg', '.jpeg', '.webp'];
          for (const ext of extensions) {
            const testPath = path.join(bundlePath, mapping.folder, imageName + ext);
            if (fs.existsSync(testPath)) {
              baseImagePath = testPath;
              break;
            }
          }
        } else {
          // Use historical version
          const history = loadImageHistory(storyId, category, imageName);
          const versionData = history?.versions.find(v => v.version === baseVersion);
          if (versionData) {
            const historyDir = getImageHistoryPath(storyId, category, imageName);
            baseImagePath = path.join(historyDir, versionData.filename);
          }
        }

        if (baseImagePath && fs.existsSync(baseImagePath)) {
          const imageData = imageToBase64(baseImagePath);
          if (imageData) {
            parts.push({
              inline_data: {
                mime_type: imageData.mimeType,
                data: imageData.data
              }
            });
            console.log(`   Added base image for modification: ${baseImagePath}`);
          }
        } else {
          console.warn(`   Warning: Base image not found for modification`);
        }
      }

      // Add the text prompt
      parts.push({ text: fullPrompt });

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

      // Add character reference images for compositing
      if (characters && characters.length > 0) {
        const bundlePath = path.join(__dirname, '../../public/stories', `${storyId}.bundle/images/characters`);
        const extensions = ['.png', '.jpeg', '.jpg', '.webp', '.sticker-cardboard-3d.webp'];

        for (const charName of characters) {
          let charImagePath: string | null = null;

          // Find the character image file
          for (const ext of extensions) {
            const testPath = path.join(bundlePath, charName + ext);
            if (fs.existsSync(testPath)) {
              charImagePath = testPath;
              break;
            }
          }

          if (charImagePath) {
            const imageData = imageToBase64(charImagePath);
            if (imageData) {
              parts.push({
                inline_data: {
                  mime_type: imageData.mimeType,
                  data: imageData.data
                }
              });
              console.log(`   Added character reference: ${charName}`);
            }
          } else {
            console.warn(`   Warning: Character image not found for "${charName}"`);
          }
        }
      }

      // Generate images in parallel using Gemini 3
      console.log(`   Generating ${numImages} images in parallel...`);
      const generationPromises = Array.from({ length: numImages }, (_, i) =>
        generateSingleImageFromGemini(parts, i)
      );

      const results = await Promise.all(generationPromises);
      successfulImages = results.filter((r): r is NonNullable<typeof r> => r !== null);

    } else {
      // Use Imagen 4.0 for pure text-to-image (higher quality)
      console.log(`   Using Imagen 4.0 (pure text-to-image)...`);
      console.log(`   Generating ${numImages} images...`);

      const allImages: Array<{ mimeType: string; data: string }> = [];
      const requestsNeeded = Math.ceil(numImages / 4);

      for (let i = 0; i < requestsNeeded; i++) {
        const remaining = numImages - allImages.length;
        const batchSize = Math.min(remaining, 4);
        console.log(`   Batch ${i + 1}/${requestsNeeded}: requesting ${batchSize} images...`);

        const batchImages = await generateImagesFromImagen(fullPrompt, batchSize);
        allImages.push(...batchImages);

        if (batchImages.length === 0 && i === 0) {
          // First batch failed completely - abort
          break;
        }
      }

      successfulImages = allImages;
    }

    if (successfulImages.length === 0) {
      return res.status(500).json({
        error: 'All image generations failed. You may be rate limited.',
      });
    }

    console.log(`   ✅ ${successfulImages.length}/${numImages} images generated successfully`);

    const timestamp = Date.now();

    // Use first image as the current image, save all to history
    const firstImage = successfulImages[0];
    const extension = firstImage.mimeType.split('/')[1] || 'png';
    const imageBuffer = Buffer.from(firstImage.data, 'base64');

    let relativePath: string;
    let filePath: string;

    if (isNewApi && category && imageName) {
      // New API: Save to correct folder based on category
      const mapping = getCategoryMapping(category);
      const bundleImagesPath = path.join(__dirname, '../../public/stories', `${storyId}.bundle/images`, mapping.folder);

      if (!fs.existsSync(bundleImagesPath)) {
        fs.mkdirSync(bundleImagesPath, { recursive: true });
      }

      const filename = `${imageName}.${extension}`;
      filePath = path.join(bundleImagesPath, filename);
      fs.writeFileSync(filePath, imageBuffer);
      relativePath = `${mapping.folder}/${filename}`;

      console.log(`✅ First image saved as current: ${filePath}`);

      // Save ALL images to history
      const historyDir = getImageHistoryPath(storyId, category, imageName);
      if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
      }

      let history = loadImageHistory(storyId, category, imageName);
      const startVersion = history ? history.versions.length + 1 : 1;

      if (!history) {
        history = {
          imageId: imageName,
          category,
          versions: [],
          currentVersion: 0,
        };
      }

      // Save each generated image to history
      for (let i = 0; i < successfulImages.length; i++) {
        const img = successfulImages[i];
        const imgExtension = img.mimeType.split('/')[1] || 'png';
        const version = startVersion + i;
        const historyFilename = `v${version}-${timestamp + i}.${imgExtension}`;
        const historyFilePath = path.join(historyDir, historyFilename);
        const imgBuffer = Buffer.from(img.data, 'base64');
        fs.writeFileSync(historyFilePath, imgBuffer);

        history.versions.push({
          version,
          filename: historyFilename,
          timestamp: timestamp + i,
          prompt,
          charactersReferenced: characters || [],
          isModification: type === 'modify',
          baseVersion: type === 'modify' && baseVersion !== 'current' ? baseVersion as number : undefined,
        });
      }

      // Set the first one as current
      history.currentVersion = startVersion;
      saveImageHistory(storyId, history);
      console.log(`📜 Saved ${successfulImages.length} versions to history: v${startVersion} - v${startVersion + successfulImages.length - 1}`);

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
      text: (firstImage as { text?: string }).text || '',
      category,
      imageName,
      generatedCount: successfulImages.length,
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
 * Select a candidate image to use as the final image
 * Moves the selected candidate to the proper location and saves to history
 */
export async function handleSelectCandidate(req: Request, res: Response) {
  const { storyId, imageName, category, candidatePath, prompt, type, baseVersion, characters } = req.body;

  if (!storyId || !imageName || !category || !candidatePath) {
    return res.status(400).json({ error: 'storyId, imageName, category, and candidatePath are required' });
  }

  try {
    const candidateFullPath = path.join(__dirname, '../../public/stories', `${storyId}.history`, candidatePath);

    if (!fs.existsSync(candidateFullPath)) {
      return res.status(404).json({ error: 'Candidate image not found' });
    }

    const timestamp = Date.now();
    const extension = path.extname(candidatePath).slice(1) || 'png';
    const imageBuffer = fs.readFileSync(candidateFullPath);

    // Save to the proper location
    const mapping = getCategoryMapping(category);
    const bundleImagesPath = path.join(__dirname, '../../public/stories', `${storyId}.bundle/images`, mapping.folder);

    if (!fs.existsSync(bundleImagesPath)) {
      fs.mkdirSync(bundleImagesPath, { recursive: true });
    }

    const filename = `${imageName}.${extension}`;
    const filePath = path.join(bundleImagesPath, filename);
    fs.writeFileSync(filePath, imageBuffer);
    const relativePath = `${mapping.folder}/${filename}`;

    console.log(`✅ Selected candidate saved: ${filePath}`);

    // Save to history
    const historyDir = getImageHistoryPath(storyId, category, imageName);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

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

    const historyFilename = `v${nextVersion}-${timestamp}.${extension}`;
    const historyFilePath = path.join(historyDir, historyFilename);
    fs.writeFileSync(historyFilePath, imageBuffer);

    history.versions.push({
      version: nextVersion,
      filename: historyFilename,
      timestamp,
      prompt: prompt || '',
      charactersReferenced: characters || [],
      isModification: type === 'modify',
      baseVersion: type === 'modify' && baseVersion !== 'current' ? baseVersion as number : undefined,
    });
    history.currentVersion = nextVersion;

    saveImageHistory(storyId, history);
    console.log(`📜 Saved to history: v${nextVersion}`);

    // Update story.json references if needed
    await updateStoryJsonForImage(storyId, category, imageName, relativePath);

    // Clean up candidates folder
    const candidatesDir = path.dirname(candidateFullPath);
    if (fs.existsSync(candidatesDir)) {
      fs.rmSync(candidatesDir, { recursive: true });
      console.log(`🗑️ Cleaned up candidates folder`);
    }

    res.json({
      success: true,
      imagePath: relativePath,
      fullPath: filePath,
      category,
      imageName,
    });

  } catch (error) {
    console.error('Select candidate error:', error);
    res.status(500).json({
      error: 'Failed to select candidate',
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
    const clueImagesNeeded = new Map<string, { scenes: number[]; clueDescriptions?: Array<{ hotspotName: string; description: string; image: string }>; sceneDescription?: string }>();

    // Extract characters for reference images
    const characters = new Set<string>();

    storyData.scenes.forEach((scene: Record<string, unknown>, index: number) => {
      // Collect backgrounds (from text, character-flow scenes)
      if (scene.background) {
        const bgNameRaw = (scene.background as string).replace(/\.(png|jpg|jpeg|webp)$/i, '');
        // Normalize to lowercase to prevent duplicates like "bakery" vs "Bakery"
        const bgName = bgNameRaw.toLowerCase();
        const existing = backgroundsNeeded.get(bgName) || { scenes: [] };
        existing.scenes.push(index);
        // Use backgroundDescriptions if available (check both cases), otherwise fall back to scene text
        if (!existing.description) {
          existing.description = backgroundDescriptions[bgName] || backgroundDescriptions[bgNameRaw] || (scene.text as string | undefined);
        }
        backgroundsNeeded.set(bgName, existing);
      }

      // Collect story images (from image type scenes)
      if (scene.type === 'image' && scene.image) {
        const imgPath = scene.image as string;
        // Story images are in story/ subfolder - normalize to lowercase
        const imgName = imgPath.replace(/^story\//, '').replace(/\.(png|jpg|jpeg|webp)$/i, '').toLowerCase();
        const existing = storyImagesNeeded.get(imgName) || { scenes: [] };
        existing.scenes.push(index);
        // Prefer explicit description field, fall back to text
        if (scene.description) {
          existing.description = scene.description as string;
        } else if (scene.text && !existing.description) {
          existing.description = scene.text as string;
        }
        storyImagesNeeded.set(imgName, existing);
      }

      // Collect clue images (from clue-image type scenes)
      if (scene.type === 'clue-image' && scene.image) {
        // Keep original case to match actual file names
        const imgName = (scene.image as string).replace(/\.(png|jpg|jpeg|webp)$/i, '');
        const existing = clueImagesNeeded.get(imgName) || { scenes: [] };
        existing.scenes.push(index);
        if (scene.clueDescriptions) {
          existing.clueDescriptions = scene.clueDescriptions as Array<{ hotspotName: string; description: string; image: string }>;
        }
        if (scene.sceneDescription) {
          existing.sceneDescription = scene.sceneDescription as string;
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

    // Helper to check if image exists in folder (case-insensitive)
    const findImageFile = (folder: string, baseName: string): string | null => {
      const folderPath = path.join(bundlePath, 'images', folder);
      if (!fs.existsSync(folderPath)) return null;

      const extensions = ['.png', '.jpg', '.jpeg', '.webp'];

      // First try exact match
      for (const ext of extensions) {
        const filePath = path.join(folderPath, baseName + ext);
        if (fs.existsSync(filePath)) {
          return `${folder}/${baseName}${ext}`;
        }
      }

      // If no exact match, try case-insensitive search
      try {
        const files = fs.readdirSync(folderPath);
        const baseNameLower = baseName.toLowerCase();
        for (const file of files) {
          const fileNameWithoutExt = file.replace(/\.(png|jpg|jpeg|webp)$/i, '');
          if (fileNameWithoutExt.toLowerCase() === baseNameLower) {
            return `${folder}/${file}`;
          }
        }
      } catch {
        // Ignore read errors
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
      // Use black and white version from clues/ folder (colored version added separately)
      const existingPath = findImageFile('clues', name);
      clueImages.push({
        id: `clue-${name}`,
        name,
        imagePath: existingPath || `clues/${name}.png`,
        exists: !!existingPath,
        usedInScenes: data.scenes,
        // Use sceneDescription if available, otherwise fall back to hotspot names
        description: data.sceneDescription || data.clueDescriptions?.map(c => c.hotspotName).join(', ')
      });
    }

    // Build colored clue images list - one entry for each B&W clue that needs a colored version
    const coloredClueImages: ImageItem[] = [];
    for (const [name, data] of clueImagesNeeded) {
      // Check if colored version exists in cluesColored/ folder
      const existingColoredPath = findImageFile('cluesColored', name);
      coloredClueImages.push({
        id: `coloredClue-${name}`,
        name,
        imagePath: existingColoredPath || `cluesColored/${name}.png`,
        exists: !!existingColoredPath,
        usedInScenes: data.scenes,
        // Use same description as the B&W clue
        description: data.sceneDescription || data.clueDescriptions?.map(c => c.hotspotName).join(', ')
      });
    }

    // Get character images - both from folder AND referenced in story (to show missing ones)
    // Track which characters have images and which are referenced but missing
    const characterImages: Array<{ name: string; imagePath: string; exists: boolean; usedInScenes: number[] }> = [];
    const charactersPath = path.join(bundlePath, 'images/characters');
    const seenCharacters = new Set<string>();

    // Helper to find which scenes use a character
    const getCharacterScenes = (charName: string): number[] => {
      const scenes: number[] = [];
      storyData.scenes.forEach((scene: Record<string, unknown>, index: number) => {
        if (scene['left-character'] === charName || scene['right-character'] === charName) {
          scenes.push(index);
        }
      });
      return scenes;
    };

    if (fs.existsSync(charactersPath)) {
      const characterFiles = fs.readdirSync(charactersPath);

      // Prefer original formats over cardboard versions
      const preferredExtensions = ['.png', '.jpeg', '.jpg', '.webp'];

      for (const file of characterFiles) {
        // Skip cardboard versions - we'll only use them as fallback
        if (file.includes('.sticker-cardboard-3d.')) continue;

        const ext = path.extname(file).toLowerCase();
        if (!preferredExtensions.includes(ext)) continue;

        const charName = file.replace(/\.(png|jpeg|jpg|webp)$/i, '');
        if (!seenCharacters.has(charName)) {
          seenCharacters.add(charName);
          characterImages.push({
            name: charName,
            imagePath: `characters/${file}`,
            exists: true,
            usedInScenes: getCharacterScenes(charName)
          });
        }
      }

      // Add any characters that only have cardboard versions
      for (const file of characterFiles) {
        if (!file.includes('.sticker-cardboard-3d.')) continue;

        const charName = file.replace('.sticker-cardboard-3d.webp', '');
        if (!seenCharacters.has(charName)) {
          seenCharacters.add(charName);
          characterImages.push({
            name: charName,
            imagePath: `characters/${file}`,
            exists: true,
            usedInScenes: getCharacterScenes(charName)
          });
        }
      }
    }

    // Add any characters referenced in story that don't have images yet (missing)
    for (const charName of characters) {
      if (!seenCharacters.has(charName)) {
        characterImages.push({
          name: charName,
          imagePath: `characters/${charName}.png`,
          exists: false,
          usedInScenes: getCharacterScenes(charName)
        });
      }
    }

    // Sort characters by first scene appearance (story order)
    characterImages.sort((a, b) => {
      const aFirst = a.usedInScenes[0] ?? Infinity;
      const bFirst = b.usedInScenes[0] ?? Infinity;
      return aFirst - bFirst;
    });

    // Sort all image arrays by first scene appearance (story order)
    const sortByFirstScene = (a: ImageItem, b: ImageItem) => {
      const aFirst = a.usedInScenes[0] ?? Infinity;
      const bFirst = b.usedInScenes[0] ?? Infinity;
      return aFirst - bFirst;
    };

    backgrounds.sort(sortByFirstScene);
    storyImages.sort(sortByFirstScene);
    clueImages.sort(sortByFirstScene);
    coloredClueImages.sort(sortByFirstScene);

    res.json({
      storyId,
      title: storyData.title,
      backgrounds,
      storyImages,
      clueImages,
      coloredClueImages,
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
    coloredClueImages: { folder: 'cluesColored', field: 'image' },
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

    // Find and remove old image(s)
    const imagesFolder = path.join(bundlePath, 'images', mapping.folder);
    // Include cardboard variants for characters - delete all versions to avoid confusion
    const extensions = ['.png', '.jpg', '.jpeg', '.webp', '.sticker-cardboard-3d.webp'];

    for (const oldExt of extensions) {
      const oldPath = path.join(imagesFolder, imageName + oldExt);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        // Don't break - delete ALL matching extensions to clean up properly
      }
    }

    // Copy history version to images folder
    const newImagePath = path.join(imagesFolder, imageName + ext);
    fs.copyFileSync(historyImagePath, newImagePath);

    // Update history metadata
    history.currentVersion = version;
    saveImageHistory(storyId, history);

    console.log(`✅ Set version ${version} as current for ${imageId} (filename: ${imageName})`);

    // For characters, regenerate the cardboard 3D version
    if (category === 'characters') {
      try {
        const toolPath = path.join(__dirname, '../../tools/make_all_cardboard.js');
        console.log(`🎨 Regenerating cardboard for character: ${newImagePath}`);
        const { stdout, stderr } = await execAsync(`node "${toolPath}" "${newImagePath}" --force`);
        if (stdout) console.log(stdout);
        if (stderr && !stderr.includes('ExperimentalWarning')) console.error(stderr);
        console.log(`✅ Cardboard regenerated for ${imageName}`);
      } catch (cardboardError) {
        console.error(`⚠️ Failed to regenerate cardboard for ${imageName}:`, cardboardError);
        // Don't fail the request - the main image was still updated
      }
    }

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

// ============================================================================
// Update Image Description
// ============================================================================

/**
 * Update the description for an image in story.json
 * - For backgrounds: updates backgroundDescriptions object
 * - For storyImages: updates the scene's text field (if image scene)
 * - For clueImages: descriptions are managed via clueDescriptions array
 */
export async function handleUpdateDescription(req: Request, res: Response) {
  const { storyId, imageId, category, description } = req.body;

  if (!storyId || !imageId || !category) {
    return res.status(400).json({ error: 'storyId, imageId, and category are required' });
  }

  try {
    const storyPath = path.join(__dirname, '../../public/stories', `${storyId}.bundle/story.json`);

    if (!fs.existsSync(storyPath)) {
      return res.status(404).json({ error: `Story not found: ${storyId}` });
    }

    const storyData = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));
    let updated = false;

    if (category === 'backgrounds') {
      // For backgrounds, use backgroundDescriptions object
      if (!storyData.backgroundDescriptions) {
        storyData.backgroundDescriptions = {};
      }
      storyData.backgroundDescriptions[imageId] = description || '';
      updated = true;
      console.log(`📝 Updated background description for "${imageId}"`);
    } else if (category === 'storyImages') {
      // For story images, update the scene's description field (used for generation prompts)
      // The text field is what's displayed to users and should not be modified
      for (const scene of storyData.scenes) {
        if (scene.type === 'image' && scene.image) {
          const imgName = scene.image.replace(/^story\//, '').replace(/\.(png|jpg|jpeg|webp)$/i, '');
          if (imgName.toLowerCase() === imageId.toLowerCase()) {
            scene.description = description || '';
            updated = true;
          }
        }
      }
      if (updated) {
        console.log(`📝 Updated story image description for "${imageId}"`);
      }
    } else if (category === 'clueImages') {
      // For clue images, update the scene's sceneDescription field
      for (const scene of storyData.scenes) {
        if (scene.type === 'clue-image' && scene.image) {
          const imgName = scene.image.replace(/\.(png|jpg|jpeg|webp)$/i, '');
          if (imgName.toLowerCase() === imageId.toLowerCase()) {
            scene.sceneDescription = description || '';
            updated = true;
          }
        }
      }
      if (updated) {
        console.log(`📝 Updated clue image sceneDescription for "${imageId}"`);
      }
    }

    if (updated) {
      fs.writeFileSync(storyPath, JSON.stringify(storyData, null, 2));
    }

    res.json({ success: true, updated });

  } catch (error) {
    console.error('Error updating description:', error);
    res.status(500).json({
      error: 'Failed to update description',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle image upload
 * Saves uploaded image to the appropriate folder and updates history
 */
export async function handleImageUpload(req: Request, res: Response) {
  const { storyId, imageName, category } = req.body;
  const file = req.file;

  if (!storyId || !imageName || !category || !file) {
    return res.status(400).json({ error: 'storyId, imageName, category, and file are required' });
  }

  try {
    const mapping = getCategoryMapping(category as ImageCategory);
    const bundlePath = path.join(__dirname, '../../public/stories', `${storyId}.bundle`);
    const imagesFolder = path.join(bundlePath, 'images', mapping.folder);

    if (!fs.existsSync(imagesFolder)) {
      fs.mkdirSync(imagesFolder, { recursive: true });
    }

    // Determine extension from uploaded file
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const filename = `${imageName}${ext}`;
    const filePath = path.join(imagesFolder, filename);

    // Save the uploaded file
    fs.writeFileSync(filePath, file.buffer);
    console.log(`📤 Uploaded image saved to: ${filePath}`);

    // Save to history
    const historyDir = getImageHistoryPath(storyId, category as ImageCategory, imageName);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    let history = loadImageHistory(storyId, category as ImageCategory, imageName);
    if (!history) {
      history = {
        imageId: imageName,
        category: category as ImageCategory,
        versions: [],
        currentVersion: 0
      };
    }

    const newVersion = history.versions.length > 0
      ? Math.max(...history.versions.map(v => v.version)) + 1
      : 1;

    const historyFilename = `v${newVersion}${ext}`;
    const historyPath = path.join(historyDir, historyFilename);
    fs.copyFileSync(filePath, historyPath);

    history.versions.push({
      version: newVersion,
      filename: historyFilename,
      timestamp: Date.now(),
      prompt: 'Uploaded image',
      charactersReferenced: [],
      isModification: false
    });
    history.currentVersion = newVersion;

    saveImageHistory(storyId, history);
    console.log(`📤 Saved upload to history as version ${newVersion}`);

    // Update story.json
    await updateStoryJsonForImage(storyId, category as ImageCategory, imageName, `${mapping.folder}/${filename}`);

    const relativePath = `${mapping.folder}/${filename}`;

    res.json({
      success: true,
      imagePath: relativePath,
      version: newVersion
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      error: 'Failed to upload image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
