#!/usr/bin/env node

/**
 * Generate Hotspot Thumbnails
 *
 * This tool generates cropped PNG thumbnails from hotspot data.
 * The thumbnails are masked color clues cropped to the hotspot bounds.
 *
 * Usage:
 *   node tools/generate_hotspot_thumbnails.js <hotspot-json-file>
 *   node tools/generate_hotspot_thumbnails.js --all
 *
 * Examples:
 *   # Generate thumbnails for a specific hotspot file
 *   node tools/generate_hotspot_thumbnails.js public/stories/gingerbread.bundle/images/hotspots/cluesColored_insideBakery.json
 *
 *   # Generate thumbnails for all hotspot files
 *   node tools/generate_hotspot_thumbnails.js --all
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a thumbnail for a single hotspot
 * @param {string} sourceImagePath - Path to the source color clue image
 * @param {Object} hotspot - Hotspot data with x, y, width, height, points
 * @param {string} outputDir - Directory to save the thumbnail
 * @returns {Promise<string>} Path to the generated thumbnail
 */
async function generateHotspotThumbnail(sourceImagePath, hotspot, outputDir) {
  const { id, label, x, y, width, height, points } = hotspot;

  // Load the source image
  const image = sharp(sourceImagePath);
  const metadata = await image.metadata();

  // Convert percentage-based coordinates to pixel coordinates
  const imageWidth = metadata.width;
  const imageHeight = metadata.height;

  const pixelX = Math.floor((x / 100) * imageWidth);
  const pixelY = Math.floor((y / 100) * imageHeight);
  const pixelWidth = Math.ceil((width / 100) * imageWidth);
  const pixelHeight = Math.ceil((height / 100) * imageHeight);

  // Ensure dimensions are valid
  const cropWidth = Math.min(pixelWidth, imageWidth - pixelX);
  const cropHeight = Math.min(pixelHeight, imageHeight - pixelY);

  if (cropWidth <= 0 || cropHeight <= 0) {
    throw new Error(`Invalid crop dimensions for hotspot ${id}: ${cropWidth}x${cropHeight}`);
  }

  // Create a mask from the polygon points
  const maskBuffer = await createPolygonMask(points, pixelX, pixelY, imageWidth, imageHeight, cropWidth, cropHeight);

  // Use label for filename, fallback to id if no label
  const filename = label ? sanitizeFilename(label) : id;
  const outputPath = path.join(outputDir, `${filename}.png`);

  // First create the masked crop
  const maskedImage = await sharp(sourceImagePath)
    .extract({
      left: pixelX,
      top: pixelY,
      width: cropWidth,
      height: cropHeight
    })
    .composite([{
      input: maskBuffer,
      blend: 'dest-in'
    }])
    .png()
    .toBuffer();

  // Then resize to 60px max dimension
  await sharp(maskedImage)
    .resize(60, 60, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`✓ Generated thumbnail: ${outputPath} (${label || id})`);
  return outputPath;
}

/**
 * Sanitize filename by removing special characters
 * @param {string} name - The label to sanitize
 * @returns {string} Safe filename
 */
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Create a polygon mask as a PNG buffer
 * @param {Array} points - Array of {x, y} points in percentage coordinates
 * @param {number} cropPixelX - Crop X in pixels
 * @param {number} cropPixelY - Crop Y in pixels
 * @param {number} imageWidth - Source image width in pixels
 * @param {number} imageHeight - Source image height in pixels
 * @param {number} cropWidth - Crop width in pixels
 * @param {number} cropHeight - Crop height in pixels
 * @returns {Promise<Buffer>} PNG buffer of the mask
 */
async function createPolygonMask(points, cropPixelX, cropPixelY, imageWidth, imageHeight, cropWidth, cropHeight) {
  // Convert percentage points to pixel coordinates relative to the crop
  const pixelPoints = points.map(p => {
    const px = ((p.x / 100) * imageWidth) - cropPixelX;
    const py = ((p.y / 100) * imageHeight) - cropPixelY;
    return `${px},${py}`;
  }).join(' ');

  const maskSvg = `
    <svg width="${cropWidth}" height="${cropHeight}">
      <polygon points="${pixelPoints}" fill="white" />
    </svg>
  `;

  // Convert SVG to PNG buffer using sharp
  return await sharp(Buffer.from(maskSvg))
    .png()
    .toBuffer();
}

/**
 * Process a hotspot JSON file and generate thumbnails for all hotspots
 * @param {string} hotspotFilePath - Path to the hotspot JSON file
 */
async function processHotspotFile(hotspotFilePath) {
  console.log(`\nProcessing: ${hotspotFilePath}`);

  // Read the hotspot file
  const content = await fs.readFile(hotspotFilePath, 'utf-8');
  const data = JSON.parse(content);

  if (!data.hotspots || data.hotspots.length === 0) {
    console.log('  No hotspots found in file');
    return;
  }

  // Get the source image path
  const sourceImagePath = data.imagePath;
  if (!sourceImagePath) {
    console.error('  Error: No imagePath found in hotspot file');
    return;
  }

  // Convert relative path to absolute
  const projectRoot = path.resolve(__dirname, '..');
  const absoluteImagePath = path.join(projectRoot, 'public', sourceImagePath);

  // Check if source image exists
  try {
    await fs.access(absoluteImagePath);
  } catch (err) {
    console.error(`  Error: Source image not found: ${absoluteImagePath}`);
    return;
  }

  // Create output directory based on image name
  // Example: /stories/gingerbread.bundle/images/cluesColored/insideBakery.png
  // Output: /stories/gingerbread.bundle/images/hotspots/insideBakery/
  const imageName = path.basename(absoluteImagePath, path.extname(absoluteImagePath));
  const bundleImagesDir = path.dirname(path.dirname(absoluteImagePath)); // Go up two levels from cluesColored/image.png
  const outputDir = path.join(bundleImagesDir, 'hotspots', imageName);
  await fs.mkdir(outputDir, { recursive: true });
  console.log(`  Output directory: ${outputDir}`);

  // Generate thumbnails for each hotspot
  let successCount = 0;
  let errorCount = 0;

  for (const hotspot of data.hotspots) {
    try {
      await generateHotspotThumbnail(absoluteImagePath, hotspot, outputDir);
      successCount++;
    } catch (err) {
      console.error(`  ✗ Error generating thumbnail for ${hotspot.id}: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`  Summary: ${successCount} succeeded, ${errorCount} failed`);
}

/**
 * Find all hotspot JSON files in the project
 * @returns {Promise<string[]>} Array of hotspot file paths
 */
async function findAllHotspotFiles() {
  const projectRoot = path.resolve(__dirname, '..');
  const hotspotFiles = [];

  async function searchDirectory(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules and hidden directories
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
            continue;
          }
          await searchDirectory(fullPath);
        } else if (entry.isFile() && entry.name.startsWith('cluesColored_') && entry.name.endsWith('.json')) {
          hotspotFiles.push(fullPath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }

  const publicDir = path.join(projectRoot, 'public');
  await searchDirectory(publicDir);

  return hotspotFiles;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Generate Hotspot Thumbnails

Usage:
  node tools/generate_hotspot_thumbnails.js <hotspot-json-file>
  node tools/generate_hotspot_thumbnails.js --all

Options:
  --all          Process all hotspot JSON files in the project
  --help, -h     Show this help message

Examples:
  # Generate thumbnails for a specific hotspot file
  node tools/generate_hotspot_thumbnails.js public/stories/gingerbread.bundle/images/hotspots/cluesColored_insideBakery.json

  # Generate thumbnails for all hotspot files
  node tools/generate_hotspot_thumbnails.js --all

Output:
  Thumbnails are saved as PNG files in images/hotspots/IMAGENAME/ folder.
  Each thumbnail is named with the hotspot label (e.g., crumbs.png).
    `);
    process.exit(0);
  }

  try {
    if (args[0] === '--all') {
      console.log('Searching for all hotspot files...');
      const files = await findAllHotspotFiles();

      if (files.length === 0) {
        console.log('No hotspot files found.');
        return;
      }

      console.log(`Found ${files.length} hotspot file(s)`);

      for (const file of files) {
        await processHotspotFile(file);
      }

      console.log('\n✓ All files processed');
    } else {
      const hotspotFile = path.resolve(args[0]);
      await processHotspotFile(hotspotFile);
      console.log('\n✓ Done');
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  generateHotspotThumbnail,
  processHotspotFile,
  findAllHotspotFiles
};
