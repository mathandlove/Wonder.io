#!/usr/bin/env node
/**
 * Vectorize Images Tool
 *
 * Uses Gemini 3 Pro Image to convert PNG images to vector-style illustrations.
 * Processes all character and story images from the story bundle.
 *
 * Output:
 * - Character images → vector-character/
 * - Story images → vector-story/
 *
 * Usage:
 *   node tools/vectorize_images.js                    # Process all images
 *   node tools/vectorize_images.js --dry-run          # Preview what would be processed
 *   node tools/vectorize_images.js --force            # Regenerate existing images
 *   node tools/vectorize_images.js --characters-only  # Only process characters
 *   node tools/vectorize_images.js --story-only       # Only process story images
 *   node tools/vectorize_images.js <image.png>        # Process single image
 *
 * Environment:
 *   GEMINI_API_KEY - Required API key for Gemini
 */

import { promises as fs, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env manually
function loadEnvFile(envPath) {
  try {
    const content = readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    }
  } catch {
    // Env file doesn't exist, rely on environment variables
  }
}

loadEnvFile(path.join(__dirname, '../backend/.env'));

// Gemini 3 Pro Image endpoint (latest model as of Dec 2025)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent';

// ANSI colors for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Vectorization prompt
const VECTOR_PROMPT = `Transform this image into a clean vector-style illustration.
Keep the same subject, composition, and overall design but render it as if it were:
- A flat vector graphic with clean edges
- Simplified shapes with solid colors
- Minimal gradients, prefer flat shading
- Bold outlines where appropriate
- Suitable for a children's storybook illustration

Maintain the character's recognizable features and expression. Output a high-quality vector-style version of the input image.`;

/**
 * Convert an image file to base64
 */
async function imageToBase64(imagePath) {
  try {
    const buffer = await fs.readFile(imagePath);
    const base64 = buffer.toString('base64');

    const ext = path.extname(imagePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp'
    };

    return {
      mimeType: mimeTypes[ext] || 'image/png',
      data: base64
    };
  } catch (error) {
    log(`Error reading image ${imagePath}: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Generate vector version using Gemini 3
 */
async function generateVectorImage(imagePath, outputPath) {
  const imageData = await imageToBase64(imagePath);
  if (!imageData) {
    return { success: false, error: 'Failed to read image' };
  }

  const parts = [
    {
      inline_data: {
        mime_type: imageData.mimeType,
        data: imageData.data
      }
    },
    { text: VECTOR_PROMPT }
  ];

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
      const errorText = await response.text();
      return { success: false, error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const candidates = data.candidates;

    if (!candidates || candidates.length === 0) {
      return { success: false, error: 'No candidates in response' };
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      return { success: false, error: 'No content in response' };
    }

    // Find the image in the response
    let outputImageData = null;
    for (const part of content.parts) {
      if (part.inlineData) {
        outputImageData = {
          mimeType: part.inlineData.mimeType,
          data: part.inlineData.data
        };
        break;
      }
    }

    if (!outputImageData) {
      return { success: false, error: 'No image in response' };
    }

    // Save the output image
    const outputBuffer = Buffer.from(outputImageData.data, 'base64');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, outputBuffer);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Find all processable images in a folder
 */
async function findImages(folder) {
  const images = [];
  const validExtensions = ['.png', '.jpg', '.jpeg'];

  try {
    const files = await fs.readdir(folder);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      // Skip already processed cardboard images
      if (file.includes('.sticker-cardboard-3d.') || file.includes('.cutout.') || file.includes('.sticker.')) {
        continue;
      }

      if (validExtensions.includes(ext)) {
        const fullPath = path.join(folder, file);
        const stats = await fs.stat(fullPath);

        if (stats.isFile()) {
          images.push({
            path: fullPath,
            name: file,
            baseName: path.basename(file, ext),
            folder: folder,
            ext: ext
          });
        }
      }
    }
  } catch (error) {
    log(`Could not read folder: ${error.message}`, 'yellow');
  }

  return images;
}

/**
 * Check if output file already exists
 */
async function outputExists(outputPath) {
  try {
    await fs.access(outputPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Process a single image
 */
async function processImage(image, outputFolder, dryRun = false, force = false) {
  const outputPath = path.join(outputFolder, `${image.baseName}.png`);

  // Check if output already exists
  if (!force && await outputExists(outputPath)) {
    log(`  ⏭️  ${image.name} (already exists)`, 'gray');
    return { skipped: true };
  }

  log(`  🎨 ${image.name}`, 'cyan');

  if (dryRun) {
    log(`      Would save to: ${path.relative(process.cwd(), outputPath)}`, 'gray');
    return { success: true, dryRun: true };
  }

  log(`      Processing...`, 'dim');

  const result = await generateVectorImage(image.path, outputPath);

  if (result.success) {
    log(`      ✅ Saved to ${path.relative(process.cwd(), outputPath)}`, 'green');
    return { success: true };
  } else {
    log(`      ❌ Error: ${result.error}`, 'red');
    return { success: false, error: result.error };
  }
}

/**
 * Process a single file from command line
 */
async function processSingleFile(imagePath, force = false) {
  const ext = path.extname(imagePath).toLowerCase();
  const baseName = path.basename(imagePath, ext);
  const folder = path.dirname(imagePath);

  // Determine output folder based on input location
  let outputFolder;
  if (imagePath.includes('/characters/')) {
    outputFolder = path.join(folder, '..', 'vector-character');
  } else if (imagePath.includes('/story/')) {
    outputFolder = path.join(folder, '..', 'vector-story');
  } else {
    outputFolder = path.join(folder, 'vector-output');
  }

  const image = {
    path: imagePath,
    name: path.basename(imagePath),
    baseName,
    folder,
    ext
  };

  log(`\n${'═'.repeat(60)}`, 'bright');
  log(`🎨 Vectorizing Single Image`, 'bright');
  log(`${'═'.repeat(60)}`, 'bright');

  const result = await processImage(image, outputFolder, false, force);

  if (result.success) {
    log(`\n✅ Successfully vectorized ${image.name}!`, 'green');
  } else if (result.skipped) {
    log(`\n⏭️  Skipped ${image.name} (already exists, use --force to regenerate)`, 'yellow');
  } else {
    log(`\n❌ Failed to vectorize ${image.name}`, 'red');
    process.exit(1);
  }
}

/**
 * Main processing function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  const force = args.includes('--force');
  const dryRun = args.includes('--dry-run');
  const help = args.includes('--help') || args.includes('-h');
  const charactersOnly = args.includes('--characters-only');
  const storyOnly = args.includes('--story-only');

  // Check for single file processing
  const fileArg = args.find(arg => !arg.startsWith('--'));

  if (help) {
    log('\n🎨 Vectorize Images Tool', 'bright');
    log('\nConverts PNG images to vector-style illustrations using Gemini 3', 'gray');
    log('\nUsage:', 'cyan');
    log('  node tools/vectorize_images.js                    # Process all', 'gray');
    log('  node tools/vectorize_images.js --force            # Regenerate all', 'gray');
    log('  node tools/vectorize_images.js --dry-run          # Preview only', 'gray');
    log('  node tools/vectorize_images.js --characters-only  # Only characters', 'gray');
    log('  node tools/vectorize_images.js --story-only       # Only story images', 'gray');
    log('  node tools/vectorize_images.js <image.png>        # Single file', 'gray');
    log('\nOutput Folders:', 'cyan');
    log('  • Characters → images/vector-character/', 'gray');
    log('  • Story      → images/vector-story/', 'gray');
    log('\nEnvironment:', 'cyan');
    log('  GEMINI_API_KEY - Required (set in backend/.env)', 'gray');
    log('');
    return;
  }

  // Check for API key
  if (!GEMINI_API_KEY) {
    log('\n❌ GEMINI_API_KEY not found!', 'red');
    log('Please set it in backend/.env file', 'yellow');
    process.exit(1);
  }

  if (fileArg) {
    // Single file mode
    try {
      await fs.access(fileArg);
      await processSingleFile(fileArg, force);
    } catch {
      log(`\n❌ File not found: ${fileArg}`, 'red');
      process.exit(1);
    }
    return;
  }

  // Batch processing mode
  log(`\n${'═'.repeat(60)}`, 'bright');
  log(`🎨 Vectorize Images Tool`, 'bright');
  log(`${'═'.repeat(60)}`, 'bright');

  if (dryRun) {
    log('🔍 DRY RUN MODE - No files will be modified', 'yellow');
  }
  if (force) {
    log('⚡ FORCE MODE - Regenerating all files', 'yellow');
  }

  // Find story bundles
  const publicPath = path.resolve(process.cwd(), 'public/stories');
  let bundles = [];

  try {
    const entries = await fs.readdir(publicPath, { withFileTypes: true });
    bundles = entries
      .filter(e => e.isDirectory() && e.name.endsWith('.bundle'))
      .map(e => path.join(publicPath, e.name));
  } catch (error) {
    log(`\n❌ Could not find stories folder: ${error.message}`, 'red');
    process.exit(1);
  }

  if (bundles.length === 0) {
    log('\n⚠️  No story bundles found!', 'yellow');
    return;
  }

  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const bundle of bundles) {
    const bundleName = path.basename(bundle);
    log(`\n📦 ${bundleName}`, 'blue');

    const imagesPath = path.join(bundle, 'images');

    // Process characters
    if (!storyOnly) {
      const charactersPath = path.join(imagesPath, 'characters');
      const vectorCharPath = path.join(imagesPath, 'vector-character');

      try {
        await fs.access(charactersPath);
        log(`\n  📁 Characters → vector-character/`, 'cyan');

        const characterImages = await findImages(charactersPath);

        for (const image of characterImages) {
          const result = await processImage(image, vectorCharPath, dryRun, force);

          if (result.skipped) {
            totalSkipped++;
          } else if (result.success) {
            totalProcessed++;
          } else {
            totalErrors++;
          }

          // Rate limiting - wait between API calls
          if (!dryRun && result.success) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch {
        log(`  ⚠️  No characters folder found`, 'gray');
      }
    }

    // Process story images
    if (!charactersOnly) {
      const storyPath = path.join(imagesPath, 'story');
      const vectorStoryPath = path.join(imagesPath, 'vector-story');

      try {
        await fs.access(storyPath);
        log(`\n  📁 Story → vector-story/`, 'cyan');

        const storyImages = await findImages(storyPath);

        for (const image of storyImages) {
          const result = await processImage(image, vectorStoryPath, dryRun, force);

          if (result.skipped) {
            totalSkipped++;
          } else if (result.success) {
            totalProcessed++;
          } else {
            totalErrors++;
          }

          // Rate limiting - wait between API calls
          if (!dryRun && result.success) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch {
        log(`  ⚠️  No story folder found`, 'gray');
      }
    }
  }

  // Final summary
  log(`\n${'═'.repeat(60)}`, 'bright');
  log(`✨ Processing Complete!`, 'bright');
  log(`${'═'.repeat(60)}`, 'bright');
  log(`✅ Processed: ${totalProcessed}`, 'green');
  log(`⏭️  Skipped:  ${totalSkipped}`, 'gray');

  if (totalErrors > 0) {
    log(`❌ Errors:    ${totalErrors}`, 'red');
  }

  log('');
}

// Run
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});
