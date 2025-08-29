#!/usr/bin/env node
/**
 * Sticker border generator:
 * - Reads RGBA image
 * - Grows alpha channel by blurring + thresholding to create border mask
 * - Renders white border layer using grown alpha
 * - Composites original image on top
 * - Optionally adds subtle drop shadow
 * - Outputs transparent lossless WebP
 *
 * Usage:
 *   node tools/make_sticker_border.js <input> <output> [strokePx=8] [softness=0.6] [shadow=true] [--vectorSmooth]
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

/**
 * Apply ultra-aggressive boundary smoothing using multiple Gaussian blur passes
 */
async function applyUltraSmoothBoundary(binaryMask, width, height, smoothRadius) {
  // Convert binary mask to grayscale for Sharp processing
  const grayData = Buffer.alloc(width * height);
  for (let i = 0; i < binaryMask.length; i++) {
    grayData[i] = binaryMask[i] * 255;
  }
  
  // Apply multiple passes of aggressive Gaussian blur
  let smoothed = await sharp(grayData, {
    raw: { width, height, channels: 1 }
  })
  .blur(smoothRadius * 2) // First pass - ultra-aggressive blur
  .raw()
  .toBuffer();
  
  // Second pass - even more aggressive
  smoothed = await sharp(smoothed, {
    raw: { width, height, channels: 1 }
  })
  .blur(smoothRadius * 3) // Even more aggressive
  .raw()
  .toBuffer();
  
  // Third pass for glass-smooth results
  smoothed = await sharp(smoothed, {
    raw: { width, height, channels: 1 }
  })
  .blur(smoothRadius * 2) // Final smoothing pass
  .raw()
  .toBuffer();
  
  // Convert back to binary with high threshold for clean edges
  const result = new Uint8Array(width * height);
  for (let i = 0; i < smoothed.length; i++) {
    result[i] = smoothed[i] > 200 ? 1 : 0; // High threshold for sharp edges after blur
  }
  
  return result;
}

async function makeStickerBorder(input, output, strokePx = 16, softness = 0.8, shadow = true, vectorSmooth = false) {
  strokePx = Math.max(1, Math.min(500, +strokePx || 16)); // Allow up to 500px strokes
  softness = Math.max(0.1, Math.min(5.0, +softness || 0.8)); // Allow higher softness
  shadow = shadow !== false && shadow !== 'false' && shadow !== '0';
  
  console.log(`🔖 Creating sticker border: ${strokePx}px stroke, ${softness} softness${shadow ? ', with shadow' : ''}${vectorSmooth ? ', vector smoothed' : ''}`);

  // Step 1: Load image and get RGBA data
  const image = sharp(input).rotate();
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const { width: W, height: H } = info;
  console.log(`   📏 Original size: ${W}x${H}`);
  
  // Step 1.5: Normalize off-white (cream, yellowish) to pure white
  console.log(`   🎨 Normalizing off-whites to pure white...`);
  const rgba = Buffer.from(data); // Create a copy to modify
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i], g = rgba[i+1], b = rgba[i+2];
    if (r > 220 && g > 220 && b > 220) { // light pixel
      const maxDiff = Math.max(Math.abs(r-g), Math.abs(r-b), Math.abs(g-b));
      if (maxDiff < 20) { // near neutral (not pink, red, etc.)
        rgba[i] = 255;
        rgba[i+1] = 255;
        rgba[i+2] = 255;
      }
    }
  }
  
  // Step 2: Calculate expanded canvas size
  const padding = strokePx;
  const newW = W + padding * 2;
  const newH = H + padding * 2;
  
  console.log(`   📐 Expanded size: ${newW}x${newH} (padding: ${padding}px on each side)`);
  
  // Step 3: Create expanded transparent canvas
  const expandedData = Buffer.alloc(newW * newH * 4);
  expandedData.fill(0); // Fill with transparent
  
  // Copy normalized image to center
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const srcIdx = (y * W + x) * 4;
      const dstIdx = ((y + padding) * newW + (x + padding)) * 4;
      
      expandedData[dstIdx] = rgba[srcIdx];     // R
      expandedData[dstIdx + 1] = rgba[srcIdx + 1]; // G
      expandedData[dstIdx + 2] = rgba[srcIdx + 2]; // B
      expandedData[dstIdx + 3] = rgba[srcIdx + 3]; // A
    }
  }
  
  // Step 4: Create border using vector smoothing or improved raster method
  let borderData;
  
  if (vectorSmooth) {
    console.log(`   🎯 Creating vector-smoothed ${strokePx}px border...`);
    borderData = await createVectorSmoothBorder(expandedData, newW, newH, strokePx);
  } else {
    console.log(`   🔍 Creating raster-smoothed ${strokePx}px border...`);
    borderData = await createRasterSmoothBorder(expandedData, newW, newH, strokePx, softness);
  }
  
  // Step 5: Save as lossless WebP
  console.log(`   💾 Saving as lossless WebP...`);
  await sharp(borderData, {
    raw: {
      width: newW,
      height: newH,
      channels: 4
    }
  })
  .webp({
    lossless: true,
    alphaQuality: 100,
    quality: 100
  })
  .toFile(output);

  console.log(`✔ Sticker border complete: ${input} -> ${output}`);
}

/**
 * Find all character folders in bundles
 */
async function findCharacterFolders() {
  const folders = [];
  const publicPath = path.resolve(process.cwd(), 'public');
  
  // Look for character folders in stories and assets
  const bundlePatterns = [
    'stories/*.bundle',
    'assets.*'
  ];
  
  for (const pattern of bundlePatterns) {
    const baseDir = path.join(publicPath, path.dirname(pattern));
    const bundlePattern = path.basename(pattern);
    
    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        // Check if directory matches pattern
        if (bundlePattern.includes('*')) {
          const regex = new RegExp('^' + bundlePattern.replace('*', '.*') + '$');
          if (regex.test(entry.name)) {
            const bundlePath = path.join(baseDir, entry.name);
            
            // Look for characters folders
            const characterPaths = [
              path.join(bundlePath, 'images', 'characters'),
              path.join(bundlePath, 'characters')
            ];
            
            for (const charPath of characterPaths) {
              try {
                const stats = await fs.stat(charPath);
                if (stats.isDirectory()) {
                  folders.push(charPath);
                }
              } catch {
                // Directory doesn't exist, continue
              }
            }
          }
        }
      }
    } catch (error) {
      // Directory might not exist yet, that's ok
    }
  }
  
  return folders;
}

/**
 * Create clean white border without black artifacts
 */
async function createVectorSmoothBorder(expandedData, newW, newH, strokePx) {
  console.log(`   🎯 Creating clean white border without dark edges...`);
  
  const borderData = Buffer.alloc(newW * newH * 4);
  borderData.fill(0); // Start transparent
  
  // Step 1: First, create the white border background
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const idx = (y * newW + x) * 4;
      
      // Check if this pixel should be part of the white border
      let shouldBeBorder = false;
      
      // Look for character pixels within strokePx distance
      for (let dy = -strokePx; dy <= strokePx && !shouldBeBorder; dy++) {
        for (let dx = -strokePx; dx <= strokePx && !shouldBeBorder; dx++) {
          const checkY = y + dy;
          const checkX = x + dx;
          
          if (checkY >= 0 && checkY < newH && checkX >= 0 && checkX < newW) {
            const checkIdx = (checkY * newW + checkX) * 4;
            if (expandedData[checkIdx + 3] > 0) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= strokePx) {
                shouldBeBorder = true;
              }
            }
          }
        }
      }
      
      if (shouldBeBorder) {
        // Set white border
        borderData[idx] = 255;     // R - white
        borderData[idx + 1] = 255; // G - white
        borderData[idx + 2] = 255; // B - white
        borderData[idx + 3] = 255; // A - fully opaque
      }
    }
  }
  
  // Step 2: Now overlay the original character on top, ensuring no gaps
  for (let i = 0; i < borderData.length; i += 4) {
    const originalAlpha = expandedData[i + 3];
    
    if (originalAlpha > 0) {
      // Character pixel - always takes priority over border
      borderData[i] = expandedData[i];     // R
      borderData[i + 1] = expandedData[i + 1]; // G  
      borderData[i + 2] = expandedData[i + 2]; // B
      borderData[i + 3] = originalAlpha;        // A
    }
  }
  
  return borderData;
}

/**
 * Create improved raster-smoothed border with optional shape simplification
 */
async function createRasterSmoothBorder(expandedData, newW, newH, strokePx, softness = 0.8) {
  const borderData = Buffer.alloc(newW * newH * 4);
  
  // Step 1: Build binary mask from expandedData alpha
  const binaryMask = new Uint8Array(newW * newH);
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const idx = y * newW + x;
      const pixelIdx = idx * 4;
      binaryMask[idx] = expandedData[pixelIdx + 3] > 127 ? 1 : 0;
    }
  }
  
  // Step 2: Use binary mask directly (no smoothing for now)
  let processedMask = binaryMask;
  
  // Step 3: Create distance field for smooth borders
  const distanceField = new Float32Array(newW * newH);
  
  // Initialize with large values
  distanceField.fill(strokePx * 2);
  
  // Mark character pixels as distance 0 using processed mask
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const idx = y * newW + x;
      
      if (processedMask[idx] === 1) {
        distanceField[idx] = 0;
      }
    }
  }
  
  // Step 4: Calculate distance field using multiple passes
  
  // Forward pass
  for (let y = 1; y < newH - 1; y++) {
    for (let x = 1; x < newW - 1; x++) {
      const idx = y * newW + x;
      const current = distanceField[idx];
      
      const neighbors = [
        distanceField[(y - 1) * newW + (x - 1)] + Math.SQRT2,
        distanceField[(y - 1) * newW + x] + 1,
        distanceField[(y - 1) * newW + (x + 1)] + Math.SQRT2,
        distanceField[y * newW + (x - 1)] + 1
      ];
      
      distanceField[idx] = Math.min(current, ...neighbors);
    }
  }
  
  // Backward pass
  for (let y = newH - 2; y > 0; y--) {
    for (let x = newW - 2; x > 0; x--) {
      const idx = y * newW + x;
      const current = distanceField[idx];
      
      const neighbors = [
        distanceField[y * newW + (x + 1)] + 1,
        distanceField[(y + 1) * newW + (x - 1)] + Math.SQRT2,
        distanceField[(y + 1) * newW + x] + 1,
        distanceField[(y + 1) * newW + (x + 1)] + Math.SQRT2
      ];
      
      distanceField[idx] = Math.min(current, ...neighbors);
    }
  }
  
  // Step 5: Generate base sticker border  
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const idx = (y * newW + x) * 4;
      const distance = distanceField[y * newW + x];
      
      if (expandedData[idx + 3] > 0) {
        // Copy original character pixel
        borderData[idx] = expandedData[idx];
        borderData[idx + 1] = expandedData[idx + 1];
        borderData[idx + 2] = expandedData[idx + 2];
        borderData[idx + 3] = expandedData[idx + 3];
      } else if (distance <= strokePx) {
        // White border - fully opaque
        borderData[idx] = 255;     // R - white
        borderData[idx + 1] = 255; // G - white  
        borderData[idx + 2] = 255; // B - white
        borderData[idx + 3] = 255; // A - fully opaque
      }
    }
  }
  
  
  return borderData;
}

/**
 * Process all character cutout images
 */
async function processAllCharacters(strokePx = 16, softness = 0.8, shadow = true, vectorSmooth = false, simplifyPx = 0) {
  console.log('🔖 Processing all character images with sticker borders...\n');
  
  const characterFolders = await findCharacterFolders();
  
  if (characterFolders.length === 0) {
    console.log('⚠️  No character folders found');
    return;
  }
  
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (const folder of characterFolders) {
    const relativePath = path.relative(process.cwd(), folder);
    console.log(`📁 Processing: ${relativePath}`);
    
    let folderProcessed = 0;
    let folderSkipped = 0;
    
    try {
      const files = await fs.readdir(folder);
      
      for (const file of files) {
        // Only process .cutout.webp files
        if (!file.endsWith('.cutout.webp')) continue;
        
        const inputPath = path.join(folder, file);
        const baseName = path.basename(file, '.cutout.webp');
        const outputPath = path.join(folder, `${baseName}.sticker.webp`);
        
        // Skip if sticker already exists
        try {
          await fs.access(outputPath);
          console.log(`  ⏩ Skipped: ${file} (sticker exists)`);
          folderSkipped++;
          totalSkipped++;
          continue;
        } catch {
          // File doesn't exist, proceed
        }
        
        console.log(`  ⚙️  Processing: ${file}...`);
        
        try {
          await makeStickerBorder(inputPath, outputPath, strokePx, softness, shadow, vectorSmooth, simplifyPx);
          console.log(`  ✅ Generated: ${baseName}.sticker.webp`);
          folderProcessed++;
          totalProcessed++;
        } catch (error) {
          console.log(`  ❌ Error: ${file} - ${error.message}`);
          totalErrors++;
        }
      }
      
      if (folderProcessed > 0 || folderSkipped > 0) {
        console.log(`  📊 Subtotal: ${folderProcessed} processed, ${folderSkipped} skipped\n`);
      } else {
        console.log(`  📭 No cutout images found\n`);
      }
    } catch (error) {
      console.log(`  ❌ Could not read folder: ${error.message}\n`);
      totalErrors++;
    }
  }
  
  // Final summary
  console.log('═'.repeat(50));
  console.log('✨ Sticker Border Complete!');
  console.log(`📊 Total: ${totalProcessed} generated, ${totalSkipped} skipped, ${totalErrors} errors`);
  
  if (totalErrors > 0) {
    console.log(`⚠️  ${totalErrors} images failed to process`);
  }
}

// CLI entry point
(async () => {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let input, output, strokePx, softness, shadow;
  let vectorSmooth = false;
  let simplifyPx = 0;
  
  // Check for --vectorSmooth flag
  const vectorSmoothIndex = args.indexOf('--vectorSmooth');
  if (vectorSmoothIndex !== -1) {
    vectorSmooth = true;
    args.splice(vectorSmoothIndex, 1); // Remove flag from args
  }
  
  // Check for --simplifyPx flag
  const simplifyIndex = args.indexOf('--simplifyPx');
  if (simplifyIndex !== -1 && simplifyIndex + 1 < args.length) {
    simplifyPx = args[simplifyIndex + 1];
    args.splice(simplifyIndex, 2); // Remove flag and value from args
  }
  
  [input, output, strokePx, softness, shadow] = args;
  
  // If no arguments, process all character cutouts
  if (!input && !output) {
    await processAllCharacters(strokePx, softness, shadow, vectorSmooth, simplifyPx).catch(err => {
      console.error('✖', err.message);
      process.exit(1);
    });
    return;
  }
  
  // Single file mode
  if (!input || !output) {
    console.error('Usage: node tools/make_sticker_border.js [<input> <output>] [strokePx=16] [softness=0.8] [shadow=true] [--vectorSmooth] [--simplifyPx <pixels>]');
    console.error('\nModes:');
    console.error('  No arguments: Process all .cutout.webp files in character folders');
    console.error('  Two arguments: Process single file');
    console.error('\nParameters:');
    console.error('  strokePx: Border thickness in pixels (1-500, default: 16)');
    console.error('  softness: Blur amount for border growth (0.1-5.0, default: 0.8)');
    console.error('  shadow:   Add drop shadow (true/false, default: true)');
    console.error('  --vectorSmooth: Use vector-like morphological smoothing (default: false)');
    console.error('  --simplifyPx <N>: Close tiny gaps/concavities by N px for cleaner curves (0-50, default: 0)');
    console.error('\nFeatures:');
    console.error('  - Creates white sticker border around image');
    console.error('  - Vector smoothing: Advanced morphological operations for ultra-smooth borders');
    console.error('  - Raster smoothing: Distance field with hard ring generation for clean edges');
    console.error('  - Shape simplification: Morphological closing to smooth out small concavities');
    console.error('  - Optional subtle drop shadow');
    console.error('  - Outputs transparent lossless WebP');
    console.error('  - Auto-normalizes off-white (cream/yellow) to pure white');
    console.error('\nExamples:');
    console.error('  node tools/make_sticker_border.js                                   # Process all character cutouts');
    console.error('  node tools/make_sticker_border.js char.webp sticker.webp           # Process single file');
    console.error('  node tools/make_sticker_border.js "" "" 24 1.2 false --vectorSmooth    # All characters, vector smoothed');
    console.error('  node tools/make_sticker_border.js "" "" 16 0.8 true --simplifyPx 3     # All characters, simplified curves');
    process.exit(1);
  }
  
  await makeStickerBorder(input, output, strokePx, softness, shadow, vectorSmooth, simplifyPx).catch(err => {
    console.error('✖', err.message);
    process.exit(1);
  });
})();