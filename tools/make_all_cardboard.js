#!/usr/bin/env node
/**
 * Complete Cardboard Cutout Pipeline
 *
 * Automatically processes all character images through the full pipeline:
 * 1. Background removal (.cutout.webp)
 * 2. White sticker border (.sticker.webp)
 * 3. Cardboard ring and 3D bevel (.sticker-cardboard-3d.webp)
 *
 * Searches for images in:
 * - public/stories/*.bundle/images/characters/
 * - public/assets.core/images/characters/
 *
 * Usage:
 *   node tools/make_all_cardboard.js              # Process all missing cardboard cutouts
 *   node tools/make_all_cardboard.js --force      # Regenerate all, even existing ones
 *   node tools/make_all_cardboard.js --dry-run    # Show what would be processed
 *   node tools/make_all_cardboard.js <image.png>  # Process single image
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
}

/**
 * Configuration for the cardboard cutout pipeline
 */
const CONFIG = {
  // Cutout settings (background removal)
  cutout: {
    tolerance: 220,    // Luminance threshold for white detection
    feather: 2,        // Erosion to avoid halos
    preblur: 0.6       // Initial blur to merge speckles
  },

  // Sticker border settings
  sticker: {
    strokePx: 21,      // Border thickness
    softness: 0.8,     // Blur for border growth
    shadow: true,      // Add drop shadow
    vectorSmooth: false // Use vector-like smoothing
  },

  // Cardboard edge settings
  cardboardEdge: {
    edgePx: 100,       // Width of cardboard ring
    offsetPx: 0,       // Offset from edge
    color: '#8c4b15'   // Brown cardboard color
  },

  // 3D bevel settings
  bevel: {
    bevelPx: 16,       // Rim thickness
    lightDir: 40,      // Light angle (0=right, 90=down)
    intensity: 0.35,   // Shading strength
    mode: 'soft-light' // Blend mode
  }
};

/**
 * Find all character folders in the project
 */
async function findCharacterFolders() {
  const folders = [];
  const publicPath = path.resolve(process.cwd(), 'public');

  const searchPaths = [
    'stories/*.bundle/images/characters',
    'stories/*.bundle/characters',
    'assets.core/images/characters',
    'assets.core/characters'
  ];

  for (const searchPath of searchPaths) {
    const parts = searchPath.split('/');
    let currentPaths = [publicPath];

    for (const part of parts) {
      const nextPaths = [];

      for (const currentPath of currentPaths) {
        try {
          const entries = await fs.readdir(currentPath, { withFileTypes: true });

          for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            if (part.includes('*')) {
              const regex = new RegExp('^' + part.replace('*', '.*') + '$');
              if (regex.test(entry.name)) {
                nextPaths.push(path.join(currentPath, entry.name));
              }
            } else if (entry.name === part) {
              nextPaths.push(path.join(currentPath, entry.name));
            }
          }
        } catch {
          // Directory doesn't exist, skip
        }
      }

      currentPaths = nextPaths;
    }

    folders.push(...currentPaths);
  }

  return [...new Set(folders)]; // Remove duplicates
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
      if (validExtensions.includes(ext)) {
        const fullPath = path.join(folder, file);
        const stats = await fs.stat(fullPath);

        if (stats.isFile()) {
          images.push({
            path: fullPath,
            name: file,
            baseName: path.basename(file, ext),
            folder: folder
          });
        }
      }
    }
  } catch (error) {
    log(`  ⚠️  Could not read folder: ${error.message}`, 'yellow');
  }

  return images;
}

/**
 * Check which processing steps are needed for an image
 */
async function checkProcessingNeeded(image, force = false) {
  const { folder, baseName } = image;

  const files = {
    cutout: path.join(folder, `${baseName}.cutout.webp`),
    sticker: path.join(folder, `${baseName}.sticker.webp`),
    cardboard3d: path.join(folder, `${baseName}.sticker-cardboard-3d.webp`)
  };

  const exists = {};
  for (const [key, filePath] of Object.entries(files)) {
    try {
      await fs.access(filePath);
      exists[key] = true;
    } catch {
      exists[key] = false;
    }
  }

  return {
    files,
    exists,
    needsProcessing: force || !exists.cardboard3d,
    steps: {
      cutout: force || !exists.cutout,
      sticker: force || !exists.sticker,
      cardboard3d: force || !exists.cardboard3d
    }
  };
}

/**
 * Run a tool script
 */
async function runTool(toolName, args, description) {
  const toolPath = path.join(__dirname, toolName);
  const command = `node "${toolPath}" ${args.map(arg => `"${arg}"`).join(' ')}`;

  log(`      ${description}...`, 'dim');

  try {
    const { stdout, stderr } = await execAsync(command);
    // Only show output if there's an error or important info
    if (stderr && !stderr.includes('✔')) {
      log(`      ${stderr.trim()}`, 'gray');
    }
    return true;
  } catch (error) {
    log(`      ❌ Error: ${error.message}`, 'red');
    if (error.stdout) log(`      ${error.stdout}`, 'gray');
    if (error.stderr) log(`      ${error.stderr}`, 'gray');
    return false;
  }
}

/**
 * Process a single image through the complete pipeline
 */
async function processImage(image, processing, dryRun = false) {
  const { path: imagePath, name, baseName } = image;
  const { files, steps } = processing;

  log(`  📸 ${name}`, 'cyan');

  if (dryRun) {
    log(`      Would process: ${Object.entries(steps).filter(([_, v]) => v).map(([k]) => k).join(' → ')}`, 'gray');
    return true;
  }

  let success = true;

  // Step 1: Remove background
  if (steps.cutout) {
    const result = await runTool(
      'cutout_border_only.js',
      [imagePath, files.cutout, CONFIG.cutout.tolerance, CONFIG.cutout.feather, CONFIG.cutout.preblur],
      '1️⃣  Removing background'
    );
    if (!result) {
      success = false;
      log(`      ⏭️  Skipping remaining steps due to error`, 'yellow');
      return false;
    }
    log(`      ✅ Created ${baseName}.cutout.webp`, 'green');
  } else {
    log(`      ⏭️  Using existing ${baseName}.cutout.webp`, 'gray');
  }

  // Step 2: Add white sticker border
  if (steps.sticker) {
    const inputFile = files.cutout;
    const result = await runTool(
      'make_sticker_border.js',
      [inputFile, files.sticker, CONFIG.sticker.strokePx, CONFIG.sticker.softness, CONFIG.sticker.shadow],
      '2️⃣  Adding white sticker border'
    );
    if (!result) {
      success = false;
      log(`      ⏭️  Skipping remaining steps due to error`, 'yellow');
      return false;
    }
    log(`      ✅ Created ${baseName}.sticker.webp`, 'green');
  } else {
    log(`      ⏭️  Using existing ${baseName}.sticker.webp`, 'gray');
  }

  // Step 3: Add cardboard edge and 3D bevel
  if (steps.cardboard3d) {
    const tempCardboard = path.join(image.folder, `${baseName}-temp-cardboard.webp`);

    // 3a: Add cardboard ring
    const result1 = await runTool(
      'add_second_edge.js',
      [files.sticker, tempCardboard, CONFIG.cardboardEdge.edgePx, CONFIG.cardboardEdge.offsetPx],
      '3️⃣  Adding cardboard ring'
    );
    if (!result1) {
      success = false;
      return false;
    }

    // 3b: Add 3D bevel effect
    const result2 = await runTool(
      'add_cardboard_bevel.js',
      [tempCardboard, files.cardboard3d, '--bevelPx', CONFIG.bevel.bevelPx, '--lightDir', CONFIG.bevel.lightDir, '--intensity', CONFIG.bevel.intensity],
      '4️⃣  Adding 3D bevel effect'
    );

    // Clean up temp file
    try {
      await fs.unlink(tempCardboard);
    } catch {
      // Ignore cleanup errors
    }

    if (!result2) {
      success = false;
      return false;
    }

    log(`      ✅ Created ${baseName}.sticker-cardboard-3d.webp`, 'green');
  } else {
    log(`      ⏭️  Using existing ${baseName}.sticker-cardboard-3d.webp`, 'gray');
  }

  if (success) {
    // Clean up intermediate files - keep only original and final cardboard
    try {
      await fs.unlink(files.cutout);
      log(`      🗑️  Deleted intermediate ${baseName}.cutout.webp`, 'gray');
    } catch {
      // Ignore if file doesn't exist
    }
    try {
      await fs.unlink(files.sticker);
      log(`      🗑️  Deleted intermediate ${baseName}.sticker.webp`, 'gray');
    } catch {
      // Ignore if file doesn't exist
    }
    log(`  ✨ Complete!`, 'bright');
  }

  return success;
}

/**
 * Process a single image file from command line
 */
async function processSingleFile(imagePath, force = false) {
  const ext = path.extname(imagePath).toLowerCase();
  const baseName = path.basename(imagePath, ext);
  const folder = path.dirname(imagePath);

  const image = {
    path: imagePath,
    name: path.basename(imagePath),
    baseName,
    folder
  };

  const processing = await checkProcessingNeeded(image, force);

  log(`\n${'═'.repeat(60)}`, 'bright');
  log(`🎨 Processing Single Image`, 'bright');
  log(`${'═'.repeat(60)}`, 'bright');

  const success = await processImage(image, processing);

  if (success) {
    log(`\n✅ Successfully processed ${image.name}!`, 'green');
  } else {
    log(`\n❌ Failed to process ${image.name}`, 'red');
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

  // Check for single file processing
  const fileArg = args.find(arg => !arg.startsWith('--'));

  if (help) {
    log('\n🎨 Cardboard Cutout Generator', 'bright');
    log('\nUsage:', 'cyan');
    log('  node tools/make_all_cardboard.js              # Process all missing', 'gray');
    log('  node tools/make_all_cardboard.js --force      # Regenerate all', 'gray');
    log('  node tools/make_all_cardboard.js --dry-run    # Preview only', 'gray');
    log('  node tools/make_all_cardboard.js <image.png>  # Process single file', 'gray');
    log('\nPipeline Steps:', 'cyan');
    log('  1. Background Removal  → .cutout.webp', 'gray');
    log('  2. White Border        → .sticker.webp', 'gray');
    log('  3. Cardboard Ring      → temp file', 'gray');
    log('  4. 3D Bevel Effect     → .sticker-cardboard-3d.webp', 'gray');
    log('\nSearches in:', 'cyan');
    log('  • public/stories/*.bundle/images/characters/', 'gray');
    log('  • public/assets.core/images/characters/', 'gray');
    log('');
    return;
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
  log(`🎨 Cardboard Cutout Generator`, 'bright');
  log(`${'═'.repeat(60)}`, 'bright');

  if (dryRun) {
    log('🔍 DRY RUN MODE - No files will be modified', 'yellow');
  }
  if (force) {
    log('⚡ FORCE MODE - Regenerating all files', 'yellow');
  }

  log('\n📁 Searching for character folders...', 'blue');
  const folders = await findCharacterFolders();

  if (folders.length === 0) {
    log('\n⚠️  No character folders found!', 'yellow');
    log('Expected locations:', 'gray');
    log('  • public/stories/*.bundle/images/characters/', 'gray');
    log('  • public/assets.core/images/characters/', 'gray');
    return;
  }

  log(`\n✓ Found ${folders.length} character folder(s)\n`, 'green');

  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalImages = 0;

  for (const folder of folders) {
    const relativePath = path.relative(process.cwd(), folder);
    log(`📦 ${relativePath}`, 'blue');

    const images = await findImages(folder);

    if (images.length === 0) {
      log(`  📭 No images found\n`, 'gray');
      continue;
    }

    totalImages += images.length;
    let folderProcessed = 0;
    let folderSkipped = 0;

    for (const image of images) {
      const processing = await checkProcessingNeeded(image, force);

      if (!processing.needsProcessing) {
        log(`  ⏭️  ${image.name} (already complete)`, 'gray');
        folderSkipped++;
        totalSkipped++;
        continue;
      }

      const success = await processImage(image, processing, dryRun);

      if (success && !dryRun) {
        folderProcessed++;
        totalProcessed++;
      } else if (!success) {
        totalErrors++;
      }
    }

    if (folderProcessed > 0 || folderSkipped > 0) {
      log(`  📊 ${folderProcessed} processed, ${folderSkipped} skipped\n`, 'cyan');
    }
  }

  // Final summary
  log(`${'═'.repeat(60)}`, 'bright');
  log(`✨ Processing Complete!`, 'bright');
  log(`${'═'.repeat(60)}`, 'bright');
  log(`📊 Total Images: ${totalImages}`, 'cyan');
  log(`✅ Processed:    ${totalProcessed}`, 'green');
  log(`⏭️  Skipped:     ${totalSkipped}`, 'gray');

  if (totalErrors > 0) {
    log(`❌ Errors:       ${totalErrors}`, 'red');
  }

  log('');
}

// Run
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});
