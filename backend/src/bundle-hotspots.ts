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
 * Extract bundle name and image name from an image path
 * Example: /stories/gingerbread.bundle/images/clues/insideBakery.png
 * Returns: { bundleName: 'gingerbread.bundle', imageName: 'insideBakery' }
 */
function extractImageInfo(imagePath: string): { bundleName: string; imageName: string } | null {
  const match = imagePath.match(/stories\/([^/]+\.bundle)\/images\/(?:clues\/)?([^/]+)\.(png|jpg|jpeg|webp)$/i);
  if (match) {
    return {
      bundleName: match[1],
      imageName: match[2]
    };
  }
  return null;
}

/**
 * Sync hotspot descriptions to story.json clueDescriptions
 * This keeps the story.json in sync when descriptions are edited in the hotspot editor
 */
function syncDescriptionsToStoryJson(imagePath: string, hotspots: Hotspot[]): void {
  const imageInfo = extractImageInfo(imagePath);
  if (!imageInfo) {
    console.log(`⏭️  Skipping story.json sync - not a clue image: ${imagePath}`);
    return;
  }

  const { bundleName, imageName } = imageInfo;
  const storyJsonPath = path.join(PUBLIC_PATH, 'stories', bundleName, 'story.json');

  if (!fs.existsSync(storyJsonPath)) {
    console.log(`⚠️  story.json not found at ${storyJsonPath}`);
    return;
  }

  try {
    const storyData = JSON.parse(fs.readFileSync(storyJsonPath, 'utf8'));

    // Find clue-image scenes that reference this image
    let updated = false;
    for (const scene of storyData.scenes || []) {
      if (scene.type === 'clue-image' && scene.image === imageName) {
        // Update clueDescriptions from hotspots
        if (scene.clueDescriptions && Array.isArray(scene.clueDescriptions)) {
          for (const clueDesc of scene.clueDescriptions) {
            // Find matching hotspot by label/hotspotName
            const matchingHotspot = hotspots.find(
              h => h.label === clueDesc.hotspotName || h.label === clueDesc.image
            );
            if (matchingHotspot && matchingHotspot.description) {
              if (clueDesc.description !== matchingHotspot.description) {
                clueDesc.description = matchingHotspot.description;
                updated = true;
                console.log(`📝 Updated description for "${clueDesc.hotspotName}" in story.json`);
              }
            }
          }
        }
      }
    }

    if (updated) {
      fs.writeFileSync(storyJsonPath, JSON.stringify(storyData, null, 2), 'utf8');
      console.log(`✅ Synced descriptions to ${storyJsonPath}`);
    }
  } catch (error) {
    console.error(`❌ Failed to sync descriptions to story.json:`, error);
  }
}

interface MapInfo {
  path: string;
  name: string;
  bundle: string;
}

/**
 * Get the hotspot file path for a specific image in a bundle
 * Example: /stories/gingerbread.bundle/images/clues/insideBakery.png
 * Returns: /stories/gingerbread.bundle/images/hotspots/clues_insideBakery.json
 *
 * Also supports maps (under images/maps/):
 * Example: /stories/gingerbread.bundle/images/maps/cityMap.jpeg
 * Returns: /stories/gingerbread.bundle/images/hotspots/maps_cityMap.json
 */
function getHotspotFilePath(imagePath: string): string {
  // Match images path (includes maps since they're now under images/maps/)
  const imageMatch = imagePath.match(/stories\/([^/]+\.bundle)\/images\/(.+)/);
  if (imageMatch) {
    const [, bundlePath, imageRelativePath] = imageMatch;

    // Check if this is a map (images/maps/*)
    if (imageRelativePath.startsWith('maps/')) {
      // For maps, save hotspots in images/hotspots/ with maps_ prefix
      const mapFileName = imageRelativePath.replace(/^maps\//, '');
      const hotspotFileName = `maps_${mapFileName}`
        .replace(/\.(png|jpg|jpeg|webp)$/i, '.json');

      return path.join(PUBLIC_PATH, 'stories', bundlePath, 'images', 'hotspots', hotspotFileName);
    }

    // For other images (clues, etc.), save in images/hotspots/
    const hotspotFileName = imageRelativePath
      .replace(/\.(png|jpg|jpeg|webp)$/i, '.json')
      .replace(/\//g, '_');

    return path.join(PUBLIC_PATH, 'stories', bundlePath, 'images', 'hotspots', hotspotFileName);
  }

  throw new Error(`Invalid image/map path format: ${imagePath}`);
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
      paths: parsed.paths || [],
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
    const { image, hotspots, paths } = req.body;

    if (!image || !Array.isArray(hotspots)) {
      return res.status(400).json({ error: 'Missing image or hotspots data' });
    }

    const hotspotFilePath = getHotspotFilePath(image);
    const hotspotDir = path.dirname(hotspotFilePath);

    // Ensure hotspots directory exists
    if (!fs.existsSync(hotspotDir)) {
      fs.mkdirSync(hotspotDir, { recursive: true });
    }

    // Prepare data to save (include paths if provided)
    const data = {
      version: '1.0.0',
      imagePath: image,
      hotspots,
      paths: paths || [],
      lastModified: new Date().toISOString()
    };

    // Write to file
    fs.writeFileSync(hotspotFilePath, JSON.stringify(data, null, 2), 'utf8');

    console.log(`✅ Saved ${hotspots.length} hotspots and ${(paths || []).length} paths to ${hotspotFilePath}`);

    // Sync descriptions to story.json
    syncDescriptionsToStoryJson(image, hotspots);

    res.json({
      success: true,
      path: hotspotFilePath.replace(PUBLIC_PATH, ''),
      count: hotspots.length,
      pathCount: (paths || []).length
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

/**
 * Save story.json for a bundle
 * POST /api/bundle/story
 * Body: { bundle: string, story: StoryData }
 */
export async function handleSaveStory(req: Request, res: Response) {
  try {
    const { bundle, story } = req.body;

    if (!bundle || !story) {
      return res.status(400).json({ error: 'Missing bundle or story data' });
    }

    const storyFilePath = path.join(PUBLIC_PATH, 'stories', bundle, 'story.json');

    // Check if bundle exists
    const bundlePath = path.join(PUBLIC_PATH, 'stories', bundle);
    if (!fs.existsSync(bundlePath)) {
      return res.status(404).json({ error: `Bundle not found: ${bundle}` });
    }

    // Write the story.json file
    fs.writeFileSync(storyFilePath, JSON.stringify(story, null, 2), 'utf8');

    console.log(`✅ Saved story.json for ${bundle} (${story.scenes?.length || 0} scenes)`);

    res.json({
      success: true,
      path: `/stories/${bundle}/story.json`,
      sceneCount: story.scenes?.length || 0
    });
  } catch (error) {
    console.error('Error saving story:', error);
    res.status(500).json({
      error: 'Failed to save story',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * List all maps in a bundle
 * GET /api/bundle/maps?bundle=gingerbread.bundle
 *
 * Maps are stored in images/maps/ folder
 */
export async function handleListBundleMaps(req: Request, res: Response) {
  try {
    const bundleName = req.query.bundle as string;

    if (!bundleName) {
      return res.status(400).json({ error: 'Missing bundle parameter' });
    }

    const bundlePath = path.join(PUBLIC_PATH, 'stories', bundleName);
    const mapsPath = path.join(bundlePath, 'images', 'maps');

    if (!fs.existsSync(mapsPath)) {
      return res.status(404).json({ error: 'Bundle maps folder not found' });
    }

    const maps: MapInfo[] = [];

    // Get map files
    const mapFiles = fs.readdirSync(mapsPath, { withFileTypes: true })
      .filter(entry => !entry.isDirectory() && /\.(png|jpg|jpeg|webp)$/i.test(entry.name))
      .map(entry => entry.name);

    // Build map list
    for (const mapFile of mapFiles) {
      const baseName = mapFile.replace(/\.(png|jpg|jpeg|webp)$/i, '');
      const webPath = `/stories/${bundleName}/images/maps/${mapFile}`.replace(/\\/g, '/');

      maps.push({
        path: webPath,
        name: baseName.replace(/([A-Z])/g, ' $1').trim(), // Convert camelCase to words
        bundle: bundleName.replace('.bundle', '')
      });
    }

    res.json({
      bundle: bundleName,
      maps,
      count: maps.length
    });
  } catch (error) {
    console.error('Error listing bundle maps:', error);
    res.status(500).json({
      error: 'Failed to list maps',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get the paths file path for a map
 * Example: /stories/gingerbread.bundle/images/mapsColored/cityMapColored.jpg
 * Returns: /public/stories/gingerbread.bundle/images/mapsColored/paths/cityMap.json
 *
 * Also supports: /stories/gingerbread.bundle/images/maps/cityMap.jpeg
 * Returns: /public/stories/gingerbread.bundle/images/hotspots/maps_cityMap.json
 */
function getMapPathsFilePath(mapPath: string): string {
  // Match mapsColored path
  const mapsColoredMatch = mapPath.match(/stories\/([^/]+\.bundle)\/images\/mapsColored\/([^/]+)/);
  if (mapsColoredMatch) {
    const [, bundlePath, mapFile] = mapsColoredMatch;
    // Remove "Colored" suffix and extension to get base name
    const baseName = mapFile
      .replace(/Colored\.(jpg|jpeg|png|webp)$/i, '')
      .replace(/\.(jpg|jpeg|png|webp)$/i, '');

    return path.join(PUBLIC_PATH, 'stories', bundlePath, 'images', 'mapsColored', 'paths', `${baseName}.json`);
  }

  // Match regular maps path (images/maps/)
  const mapsMatch = mapPath.match(/stories\/([^/]+\.bundle)\/images\/maps\/([^/]+)/);
  if (mapsMatch) {
    const [, bundlePath, mapFile] = mapsMatch;
    const baseName = mapFile.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    return path.join(PUBLIC_PATH, 'stories', bundlePath, 'images', 'hotspots', `maps_${baseName}.json`);
  }

  throw new Error(`Invalid map path format: ${mapPath}`);
}

/**
 * Load paths for a specific map
 * GET /api/bundle/map-paths?map=/stories/gingerbread.bundle/images/mapsColored/cityMapColored.jpg
 */
export async function handleLoadMapPaths(req: Request, res: Response) {
  try {
    const mapPath = req.query.map as string;

    if (!mapPath) {
      return res.status(400).json({ error: 'Missing map parameter' });
    }

    const pathsFilePath = getMapPathsFilePath(mapPath);

    if (!fs.existsSync(pathsFilePath)) {
      // Return empty paths if file doesn't exist
      return res.json({ paths: [] });
    }

    const data = JSON.parse(fs.readFileSync(pathsFilePath, 'utf-8'));
    res.json({ paths: data.paths || [] });
  } catch (error) {
    console.error('Error loading map paths:', error);
    res.status(500).json({
      error: 'Failed to load map paths',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Save paths for a specific map
 * POST /api/bundle/map-paths
 * Body: { map: string, paths: MapPath[] }
 */
export async function handleSaveMapPaths(req: Request, res: Response) {
  try {
    const { map, paths } = req.body;

    if (!map) {
      return res.status(400).json({ error: 'Missing map parameter' });
    }

    const pathsFilePath = getMapPathsFilePath(map);

    // Ensure directory exists
    const dir = path.dirname(pathsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save paths
    fs.writeFileSync(pathsFilePath, JSON.stringify({ paths: paths || [] }, null, 2));

    res.json({ success: true, path: pathsFilePath });
  } catch (error) {
    console.error('Error saving map paths:', error);
    res.status(500).json({
      error: 'Failed to save map paths',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
