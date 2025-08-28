#!/usr/bin/env node

/**
 * Generate outline versions of images by removing white backgrounds
 * 
 * This script walks through images/clues and images/maps directories,
 * finds PNG/JPG files without corresponding .outline.webp files,
 * and generates outline versions by:
 * - Removing white backgrounds (threshold ~240 → transparent)
 * - Keeping black lines and darker colors
 * - Outputting as .outline.webp next to the original
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  bundlePatterns: [
    'stories/*.bundle',  // Story bundles
    'assets.*'          // Asset packs like assets.core
  ],
  targetDirs: ['maps', 'clues', 'images/maps', 'images/clues'],  // Possible locations within bundles
  extensions: ['.png', '.jpg', '.jpeg'],
  luminanceLow: 210,    // Start making transparent at this luminance
  luminanceHigh: 235,   // Fully transparent above this luminance
  alphaBlur: 1.0,       // Blur amount for alpha channel to remove halos
  alphaThreshold: 128,  // Threshold after blur to clean up edges
  outputFormat: 'webp'
};

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

/**
 * Log with color and formatting
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Recursively walk directory and find all files
 */
async function* walkDirectory(dir) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        yield* walkDirectory(filePath);
      } else {
        yield filePath;
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      log(`Warning: Could not read directory ${dir}: ${error.message}`, 'yellow');
    }
  }
}

/**
 * Check if file is an image we should process
 */
function isProcessableImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return CONFIG.extensions.includes(ext);
}

/**
 * Get output path for outline file
 */
function getOutlinePath(originalPath) {
  const dir = path.dirname(originalPath);
  const basename = path.basename(originalPath, path.extname(originalPath));
  return path.join(dir, `${basename}.outline.${CONFIG.outputFormat}`);
}

/**
 * Check if outline already exists
 */
async function outlineExists(outlinePath) {
  try {
    await fs.access(outlinePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Process image to create halo-free outline version
 * Simplified approach: Remove white background, keep everything else as black
 */
async function generateOutline(inputPath, outputPath) {
  try {
    // Step 1: Load image with rotation normalization
    const inputBuffer = await sharp(inputPath)
      .rotate() // Auto-rotate based on EXIF orientation
      .toBuffer();
    
    // Step 2: Get image info and prepare for processing
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    
    // Step 3: Process the image - use composite to remove white background
    // First create a version where white becomes transparent
    const processed = await sharp(inputBuffer)
      .ensureAlpha()
      .toBuffer();
    
    // Get raw pixel data for manipulation
    const { data, info } = await sharp(processed)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Create output buffer
    const outputData = Buffer.alloc(info.width * info.height * 4);
    
    // Process each pixel
    for (let i = 0; i < info.width * info.height; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      
      // Calculate luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
      
      // Determine alpha based on luminance
      let newAlpha = 255;
      
      // Make white/light pixels transparent
      if (luminance >= CONFIG.luminanceHigh) {
        newAlpha = 0;
      } else if (luminance >= CONFIG.luminanceLow) {
        // Smooth fade for edge pixels
        const range = CONFIG.luminanceHigh - CONFIG.luminanceLow;
        const position = (luminance - CONFIG.luminanceLow) / range;
        newAlpha = Math.round(255 * (1 - position));
      }
      
      // If original was already transparent, keep it transparent
      if (a < 255) {
        newAlpha = Math.min(newAlpha, a);
      }
      
      // Set output pixel as pure black with calculated alpha
      outputData[idx] = 0;       // R - black
      outputData[idx + 1] = 0;   // G - black
      outputData[idx + 2] = 0;   // B - black
      outputData[idx + 3] = newAlpha; // A
    }
    
    // Optional: Apply slight blur to alpha for smoother edges
    // This step helps remove tiny speckles and halos
    const blurredImage = await sharp(outputData, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .blur(0.5) // Very slight blur
    .raw()
    .toBuffer();
    
    // Clean up the alpha channel after blur
    for (let i = 0; i < info.width * info.height; i++) {
      const idx = i * 4 + 3; // Alpha channel
      // Apply threshold to clean up edges
      if (blurredImage[idx] < 30) {
        blurredImage[idx] = 0;
      } else if (blurredImage[idx] > 225) {
        blurredImage[idx] = 255;
      }
    }
    
    // Save as lossless WebP
    await sharp(blurredImage, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .webp({
      lossless: true,
      alphaQuality: 100,
      quality: 100
    })
    .toFile(outputPath);
    
    return true;
  } catch (error) {
    log(`Error processing ${inputPath}: ${error.message}`, 'red');
    log(`Stack trace: ${error.stack}`, 'red');
    return false;
  }
}

/**
 * Find all bundle directories matching patterns
 */
async function findBundles() {
  const bundles = [];
  const publicPath = path.resolve(process.cwd(), 'public');
  
  for (const pattern of CONFIG.bundlePatterns) {
    const baseDir = path.join(publicPath, path.dirname(pattern));
    const bundlePattern = path.basename(pattern);
    
    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        // Check if directory name matches pattern
        if (bundlePattern.includes('*')) {
          const regex = new RegExp('^' + bundlePattern.replace('*', '.*') + '$');
          if (regex.test(entry.name)) {
            bundles.push(path.join(baseDir, entry.name));
          }
        } else if (entry.name === bundlePattern) {
          bundles.push(path.join(baseDir, entry.name));
        }
      }
    } catch (error) {
      // Directory might not exist yet, that's ok
    }
  }
  
  return bundles;
}

/**
 * Find target directories (maps/clues) within a bundle
 */
async function findTargetDirs(bundlePath) {
  const targets = [];
  
  for (const targetDir of CONFIG.targetDirs) {
    const fullPath = path.join(bundlePath, targetDir);
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        targets.push({
          path: fullPath,
          relative: path.relative(path.resolve(process.cwd(), 'public'), fullPath)
        });
      }
    } catch {
      // Directory doesn't exist in this bundle, that's ok
    }
  }
  
  return targets;
}

/**
 * Main processing function
 */
async function processImages() {
  log('\n🎨 Starting outline generation (halo-free mode)...', 'bright');
  log(`Luminance cutoffs: ${CONFIG.luminanceLow}-${CONFIG.luminanceHigh}`, 'gray');
  log(`Alpha blur: ${CONFIG.alphaBlur}px, threshold: ${CONFIG.alphaThreshold}`, 'gray');
  log(`Output: Lossless ${CONFIG.outputFormat} with pure black lines`, 'gray');
  log(`Looking for bundles and asset packs...\n`, 'gray');
  
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  // Find all bundles
  const bundles = await findBundles();
  
  if (bundles.length === 0) {
    log('⚠️  No bundles found in public/stories/*.bundle or public/assets.*', 'yellow');
    return;
  }
  
  log(`📦 Found ${bundles.length} bundle(s):\n`, 'blue');
  
  for (const bundlePath of bundles) {
    const bundleName = path.basename(bundlePath);
    log(`\n📦 Processing bundle: ${bundleName}`, 'bright');
    
    // Find target directories within this bundle
    const targetDirs = await findTargetDirs(bundlePath);
    
    if (targetDirs.length === 0) {
      log(`  📭 No maps/clues directories found in ${bundleName}`, 'gray');
      continue;
    }
    
    for (const target of targetDirs) {
      log(`  📁 Processing: ${target.relative}`, 'blue');
      
      let dirProcessed = 0;
      let dirSkipped = 0;
      
      for await (const filePath of walkDirectory(target.path)) {
        if (!isProcessableImage(filePath)) continue;
        
        const outlinePath = getOutlinePath(filePath);
        
        if (await outlineExists(outlinePath)) {
          log(`    ⏩ Skipped: ${path.basename(filePath)} (outline exists)`, 'gray');
          dirSkipped++;
          totalSkipped++;
          continue;
        }
        
        log(`    ⚙️  Processing: ${path.basename(filePath)}...`, 'yellow');
        
        const success = await generateOutline(filePath, outlinePath);
        
        if (success) {
          log(`    ✅ Generated: ${path.basename(outlinePath)}`, 'green');
          dirProcessed++;
          totalProcessed++;
        } else {
          totalErrors++;
        }
      }
      
      if (dirProcessed > 0 || dirSkipped > 0) {
        log(`    📊 Subtotal: ${dirProcessed} processed, ${dirSkipped} skipped`, 'blue');
      } else {
        log(`    📭 No images found`, 'gray');
      }
    }
  }
  
  // Final summary
  log('\n' + '═'.repeat(50), 'bright');
  log('✨ Outline Generation Complete!', 'bright');
  log(`📊 Total: ${totalProcessed} generated, ${totalSkipped} skipped, ${totalErrors} errors`, 'green');
  
  if (totalErrors > 0) {
    log(`⚠️  ${totalErrors} images failed to process`, 'red');
  }
}

/**
 * Check if sharp is installed
 */
async function checkDependencies() {
  try {
    // For ES modules, just try to use it
    await import('sharp');
    return true;
  } catch {
    log('❌ Sharp is not installed!', 'red');
    log('Please run: npm install sharp', 'yellow');
    log('Or add it to package.json and run npm install', 'yellow');
    return false;
  }
}

/**
 * Main entry point
 */
async function main() {
  // Check dependencies
  if (!await checkDependencies()) {
    process.exit(1);
  }
  
  try {
    await processImages();
    process.exit(0);
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateOutline, processImages };