/**
 * Image Generation Service using Google Gemini API
 *
 * Uses Gemini 2.5 Flash Image model (aka "Nano Banana") for AI image generation.
 * Supports text-to-image with optional reference images for style consistency.
 */
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent';

interface ImageGenerationRequest {
  prompt: string;
  artStyle: string;
  referenceImages?: string[]; // Paths to reference images in the bundle
  storyId: string;
  sceneIndex: number;
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
 * Build the prompt with art style and description
 */
function buildPrompt(description: string, artStyle: string): string {
  const stylePrompt = artStyle
    ? `Art style: ${artStyle}. `
    : '';

  return `${stylePrompt}Generate an illustration: ${description}. The image should be suitable for a children's storybook.`;
}

/**
 * Handle image generation request
 */
export async function handleImageGeneration(req: Request, res: Response) {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY not configured. Add it to backend/.env'
    });
  }

  const { prompt, artStyle, referenceImages, storyId, sceneIndex } = req.body as ImageGenerationRequest;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!storyId) {
    return res.status(400).json({ error: 'storyId is required' });
  }

  try {
    console.log(`🎨 Generating image for scene ${sceneIndex} in story ${storyId}`);
    console.log(`   Prompt: ${prompt}`);
    console.log(`   Art style: ${artStyle || 'default'}`);

    // Build the full prompt
    const fullPrompt = buildPrompt(prompt, artStyle);

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

    // Save the generated image to the bundle
    const bundleImagesPath = path.join(__dirname, '../../public/stories', `${storyId}.bundle/images/story`);

    // Ensure directory exists
    if (!fs.existsSync(bundleImagesPath)) {
      fs.mkdirSync(bundleImagesPath, { recursive: true });
    }

    // Generate filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const extension = imageData.mimeType.split('/')[1] || 'png';
    const filename = `generated-scene-${sceneIndex}-${timestamp}.${extension}`;
    const filePath = path.join(bundleImagesPath, filename);

    // Write the image file
    const imageBuffer = Buffer.from(imageData.data, 'base64');
    fs.writeFileSync(filePath, imageBuffer);

    console.log(`✅ Generated image saved: ${filePath}`);

    // Return the relative path for use in story.json
    const relativePath = `story/${filename}`;

    res.json({
      success: true,
      imagePath: relativePath,
      fullPath: filePath,
      text: responseText
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
        if (scene.text) existing.description = scene.text as string;
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
