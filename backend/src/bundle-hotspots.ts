import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Hotspot } from './types';

const execAsync = promisify(exec);

// Path to public folder containing story bundles
const PUBLIC_PATH = path.join(__dirname, '../../public');
const PROJECT_ROOT = path.join(__dirname, '../..');

/**
 * Get the hotspot file path for a specific image in a bundle
 * Example: /stories/gingerbread.bundle/images/clues/insideBakery.png
 * Returns: /stories/gingerbread.bundle/images/hotspots/clues_insideBakery.json
 */
function getHotspotFilePath(imagePath: string): string {
  // Extract bundle and image path components
  const match = imagePath.match(/stories\/([^/]+\.bundle)\/images\/(.+)/);
  if (!match) {
    throw new Error(`Invalid image path format: ${imagePath}`);
  }

  const [, bundlePath, imageRelativePath] = match;

  // Convert image path to hotspot filename
  // clues/insideBakery.png -> clues_insideBakery.json
  const hotspotFileName = imageRelativePath
    .replace(/\.(png|jpg|jpeg|webp)$/i, '.json')
    .replace(/\//g, '_');

  return path.join(PUBLIC_PATH, 'stories', bundlePath, 'images', 'hotspots', hotspotFileName);
}

/**
 * Load hotspots for a specific image from its bundle
 * GET /api/bundle/hotspots?image=/stories/gingerbread.bundle/images/clues/insideBakery.png
 */
export async function handleLoadBundleHotspots(req: Request, res: Response) {
  try {
    const imagePath = req.query.image as string;

    if (!imagePath) {
      return res.status(400).json({ error: 'Missing image parameter' });
    }

    const hotspotFilePath = getHotspotFilePath(imagePath);

    // Check if hotspot file exists
    if (!fs.existsSync(hotspotFilePath)) {
      // No hotspots yet - return empty array
      return res.json({ hotspots: [], imagePath });
    }

    // Read and parse hotspot file
    const data = fs.readFileSync(hotspotFilePath, 'utf8');
    const parsed = JSON.parse(data);

    res.json({
      hotspots: parsed.hotspots || [],
      imagePath,
      lastModified: parsed.lastModified
    });
  } catch (error) {
    console.error('Error loading bundle hotspots:', error);
    res.status(500).json({
      error: 'Failed to load hotspots',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Save hotspots for a specific image to its bundle
 * POST /api/bundle/hotspots
 * Body: { image: string, hotspots: Hotspot[] }
 */
export async function handleSaveBundleHotspots(req: Request, res: Response) {
  try {
    const { image, hotspots } = req.body;

    if (!image || !Array.isArray(hotspots)) {
      return res.status(400).json({ error: 'Missing image or hotspots data' });
    }

    const hotspotFilePath = getHotspotFilePath(image);
    const hotspotDir = path.dirname(hotspotFilePath);

    // Ensure hotspots directory exists
    if (!fs.existsSync(hotspotDir)) {
      fs.mkdirSync(hotspotDir, { recursive: true });
    }

    // Prepare data to save
    const data = {
      version: '1.0.0',
      imagePath: image,
      hotspots,
      lastModified: new Date().toISOString()
    };

    // Write to file
    fs.writeFileSync(hotspotFilePath, JSON.stringify(data, null, 2), 'utf8');

    console.log(`✅ Saved ${hotspots.length} hotspots to ${hotspotFilePath}`);

    res.json({
      success: true,
      path: hotspotFilePath.replace(PUBLIC_PATH, ''),
      count: hotspots.length
    });
  } catch (error) {
    console.error('Error saving bundle hotspots:', error);
    res.status(500).json({
      error: 'Failed to save hotspots',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * List all images in a bundle that could have hotspots
 * GET /api/bundle/images?bundle=gingerbread.bundle
 */
export async function handleListBundleImages(req: Request, res: Response) {
  try {
    const bundleName = req.query.bundle as string;

    if (!bundleName) {
      return res.status(400).json({ error: 'Missing bundle parameter' });
    }

    const bundlePath = path.join(PUBLIC_PATH, 'stories', bundleName);
    const imagesPath = path.join(bundlePath, 'images');

    if (!fs.existsSync(imagesPath)) {
      return res.status(404).json({ error: 'Bundle images folder not found' });
    }

    // Recursively find all image files
    const images: string[] = [];

    function scanDirectory(dir: string, relativePath = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hotspots folder
        if (entry.name === 'hotspots') continue;

        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          scanDirectory(fullPath, relPath);
        } else if (/\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
          // Convert to web path format
          const webPath = `/stories/${bundleName}/images/${relPath}`.replace(/\\/g, '/');
          images.push(webPath);
        }
      }
    }

    scanDirectory(imagesPath);

    res.json({
      bundle: bundleName,
      images,
      count: images.length
    });
  } catch (error) {
    console.error('Error listing bundle images:', error);
    res.status(500).json({
      error: 'Failed to list images',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Generate thumbnails for hotspots
 * POST /api/bundle/hotspots/generate-thumbnails
 * Body: { image: string }
 */
export async function handleGenerateThumbnails(req: Request, res: Response) {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Missing image parameter' });
    }

    const hotspotFilePath = getHotspotFilePath(image);

    // Check if hotspot file exists
    if (!fs.existsSync(hotspotFilePath)) {
      return res.status(404).json({ error: 'No hotspots found for this image' });
    }

    // Run the thumbnail generation tool
    const toolPath = path.join(PROJECT_ROOT, 'tools', 'generate_hotspot_thumbnails.js');
    const command = `node "${toolPath}" "${hotspotFilePath}"`;

    console.log(`🖼️  Generating thumbnails for ${image}...`);

    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('ExperimentalWarning')) {
      console.error('Thumbnail generation stderr:', stderr);
    }

    console.log('Thumbnail generation output:', stdout);

    // Parse output to count successes
    const successMatch = stdout.match(/(\d+) succeeded/);
    const successCount = successMatch ? parseInt(successMatch[1]) : 0;

    res.json({
      success: true,
      message: `Generated ${successCount} thumbnail(s)`,
      count: successCount,
      output: stdout
    });
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    res.status(500).json({
      error: 'Failed to generate thumbnails',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
