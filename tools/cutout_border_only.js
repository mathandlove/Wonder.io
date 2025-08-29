#!/usr/bin/env node
/**
 * Border-only background remover:
 * - Flood-fills from image borders through near-white pixels to find true background.
 * - Sets only that region's alpha to 0 (interior whites are preserved).
 * - Optional feather/erosion trims halos.
 *
 * Usage:
 *   node tools/cutout_border_only.js <input> <output> [tolerance=235] [feather=1]
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


async function cutoutBorderOnly(input, output, tolerance = 220, feather = 2, preblur = 0.6) {
  tolerance = Math.max(0, Math.min(255, +tolerance || 220));
  feather = Math.max(0, Math.min(5, +feather || 2));
  preblur = Math.max(0, Math.min(2, +preblur || 0.6));

  // Step 1: Apply configurable blur to reduce noise before processing
  const blurredImage = await sharp(input)
    .rotate()
    .blur(preblur) // Configurable blur to merge tiny speckles
    .toBuffer();

  const { data, info } = await sharp(blurredImage)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
    
  const { width: W, height: H, channels: C } = info;
  if (C !== 4) throw new Error('Expected RGBA');

  // Step 2: Mark near-white pixels using luminance for better detection
  const nearWhite = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < nearWhite.length; i++, p += 4) {
    const r = data[p], g = data[p+1], b = data[p+2];
    // Use luminance calculation for better white detection
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    nearWhite[i] = (luminance >= tolerance) ? 1 : 0;
  }

  // Step 3: Flood-fill from borders to find connected background
  const bg = new Uint8Array(W * H); // 1 = background to remove
  const q = [];
  const pushIf = i => { 
    if (i >= 0 && i < bg.length && nearWhite[i] && !bg[i]) { 
      bg[i] = 1; 
      q.push(i); 
    } 
  };

  // Start flood-fill from all border pixels
  for (let x = 0; x < W; x++) { 
    pushIf(x);              // Top row
    pushIf((H-1)*W + x);    // Bottom row
  }
  for (let y = 0; y < H; y++) { 
    pushIf(y*W);            // Left column
    pushIf(y*W + (W-1));    // Right column
  }

  // Perform flood-fill
  while (q.length) {
    const i = q.pop();
    const y = (i / W) | 0, x = i - y*W;
    if (x > 0)   pushIf(i-1);
    if (x < W-1) pushIf(i+1);
    if (y > 0)   pushIf(i-W);
    if (y < H-1) pushIf(i+W);
  }

  // Step 4: Enhanced feather/erosion with despeckle
  if (feather > 0) {
    const contracted = new Uint8Array(bg.length);
    const r = feather;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y*W + x;
        if (!bg[i]) continue;
        
        // Check if all pixels within radius are background
        let allBg = true;
        for (let dy = -r; dy <= r && allBg; dy++) {
          const yy = y + dy; 
          if (yy < 0 || yy >= H) { 
            allBg = false; 
            break; 
          }
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx; 
            if (xx < 0 || xx >= W || !bg[yy*W + xx]) { 
              allBg = false; 
              break; 
            }
          }
        }
        if (allBg) contracted[i] = 1;
      }
    }
    contracted.forEach((v, i) => bg[i] = v);
  }

  // Step 5: Create output with original color data but processed alpha
  const out = Buffer.from(data);
  for (let i = 0, p = 0; i < bg.length; i++, p += 4) {
    if (bg[i]) {
      out[p+3] = 0; // Make background transparent
    } else if (out[p+3] === 0) {
      out[p+3] = 255; // Ensure non-background is opaque
    }
  }

  // Step 6: Apply additional cleanup with blur and threshold on alpha
  const cleanedImage = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .blur(0.4) // Slight blur to smooth alpha edges
    .raw()
    .toBuffer();

  // Step 7: Clean up alpha channel after blur
  for (let i = 0, p = 3; i < W * H; i++, p += 4) {
    const alpha = cleanedImage[p];
    // Apply threshold to clean up speckled edges
    if (alpha < 30) {
      cleanedImage[p] = 0; // Fully transparent
    } else if (alpha > 220) {
      cleanedImage[p] = 255; // Fully opaque
    }
    // Keep intermediate values for smooth antialiasing
  }

  // Step 8: Find largest connected component (main character silhouette)
  const opaque = new Uint8Array(W * H);
  for (let i = 0, p = 3; i < opaque.length; i++, p += 4) {
    opaque[i] = cleanedImage[p] > 128 ? 1 : 0; // Mark opaque pixels
  }
  
  // Find all connected components
  const visited = new Uint8Array(W * H);
  const components = [];
  
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!opaque[i] || visited[i]) continue;
      
      // Flood-fill to find this component
      const component = new Set();
      const queue = [i];
      visited[i] = 1;
      
      while (queue.length > 0) {
        const curr = queue.shift();
        component.add(curr);
        const cy = Math.floor(curr / W);
        const cx = curr % W;
        
        // Check 8-connected neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = cy + dy;
            const nx = cx + dx;
            if (ny < 0 || ny >= H || nx < 0 || nx >= W) continue;
            
            const ni = ny * W + nx;
            if (!opaque[ni] || visited[ni]) continue;
            
            visited[ni] = 1;
            queue.push(ni);
          }
        }
      }
      
      if (component.size > 10) { // Ignore very small components
        components.push(component);
      }
    }
  }
  
  // Find largest component
  let largestComponent = null;
  let maxSize = 0;
  
  for (const component of components) {
    if (component.size > maxSize) {
      maxSize = component.size;
      largestComponent = component;
    }
  }
  
  // Step 9: Keep only the largest connected component
  const final = Buffer.from(cleanedImage);
  
  if (largestComponent) {
    // Mark everything as transparent first
    for (let i = 0, p = 3; i < W * H; i++, p += 4) {
      if (final[p] > 50) { // If was opaque
        if (!largestComponent.has(i)) {
          final[p] = 0; // Make transparent if not in largest component
        }
      }
    }
  }
  
  // Step 10: Final despeckle filter for edge cleanup
  const despeckled = Buffer.from(final);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const p = i * 4 + 3; // Alpha channel
      
      if (final[p] < 50) continue; // Skip already transparent
      
      // Count transparent neighbors in 3x3 area
      let transparentNeighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const neighborIdx = ((y + dy) * W + (x + dx)) * 4 + 3;
          if (final[neighborIdx] < 50) {
            transparentNeighbors++;
          }
        }
      }
      
      // If mostly surrounded by transparent pixels, make this transparent too
      if (transparentNeighbors >= 6) {
        despeckled[p] = 0;
      }
    }
  }

  // Save as lossless WebP
  await sharp(despeckled, { raw: { width: W, height: H, channels: 4 } })
    .webp({ lossless: true, alphaQuality: 100, quality: 100 })
    .toFile(output);

  const componentInfo = largestComponent ? ` (kept largest: ${largestComponent.size} pixels of ${components.length} components)` : '';
  console.log(`✔ Border-only cutout: ${input} -> ${output} (tol=${tolerance}, feather=${feather}, blur=${preblur})${componentInfo}`);
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
 * Process all images in character folders
 */
async function processAllCharacters(tolerance = 220, feather = 2, preblur = 0.6) {
  console.log('🎭 Processing all character images with border cutout...\n');
  
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
        const ext = path.extname(file).toLowerCase();
        if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;
        
        const inputPath = path.join(folder, file);
        const outputPath = path.join(folder, `${path.basename(file, ext)}.cutout.webp`);
        
        // Skip if cutout already exists
        try {
          await fs.access(outputPath);
          console.log(`  ⏩ Skipped: ${file} (cutout exists)`);
          folderSkipped++;
          totalSkipped++;
          continue;
        } catch {
          // File doesn't exist, proceed
        }
        
        console.log(`  ⚙️  Processing: ${file}...`);
        
        try {
          await cutoutBorderOnly(inputPath, outputPath, tolerance, feather, preblur);
          console.log(`  ✅ Generated: ${path.basename(outputPath)}`);
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
        console.log(`  📭 No images found\n`);
      }
    } catch (error) {
      console.log(`  ❌ Could not read folder: ${error.message}\n`);
      totalErrors++;
    }
  }
  
  // Final summary
  console.log('═'.repeat(50));
  console.log('✨ Character Cutout Complete!');
  console.log(`📊 Total: ${totalProcessed} generated, ${totalSkipped} skipped, ${totalErrors} errors`);
  
  if (totalErrors > 0) {
    console.log(`⚠️  ${totalErrors} images failed to process`);
  }
}

// CLI entry point
(async () => {
  const [,, input, output, tol, feather, preblur] = process.argv;
  
  // If no arguments, process all character folders
  if (!input && !output) {
    await processAllCharacters(tol, feather, preblur).catch(err => {
      console.error('✖', err.message);
      process.exit(1);
    });
    return;
  }
  
  // Single file mode
  if (!input || !output) {
    console.error('Usage: node tools/cutout_border_only.js [<input> <output>] [tolerance=220] [feather=2] [preblur=0.6]');
    console.error('\nModes:');
    console.error('  No arguments: Process all images in character folders');
    console.error('  Two arguments: Process single file');
    console.error('\nParameters:');
    console.error('  tolerance: Luminance threshold for white (0-255, default: 220)');
    console.error('  feather:   Erosion radius to avoid halos (0-5, default: 2)');
    console.error('  preblur:   Initial blur to merge speckles (0-2, default: 0.6)');
    console.error('\nFeatures:');
    console.error('  - Removes only border-connected white background');
    console.error('  - Keeps largest connected component (main character)');
    console.error('  - Discards stray dots and stipple');
    console.error('  - Outputs transparent lossless WebP');
    console.error('\nExamples:');
    console.error('  node tools/cutout_border_only.js                        # Process all characters');
    console.error('  node tools/cutout_border_only.js image.png out.webp     # Process single file');
    console.error('  node tools/cutout_border_only.js "" "" 230 3 0.8        # All characters with custom params');
    process.exit(1);
  }
  
  await cutoutBorderOnly(input, output, tol, feather, preblur).catch(err => {
    console.error('✖', err.message);
    process.exit(1);
  });
})();