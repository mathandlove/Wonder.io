#!/usr/bin/env node
/**
 * Complete pipeline to create 3D cardboard stickers from original stickers
 * 
 * Usage:
 *   node tools/make_cardboard_3d.js <input.sticker.webp> <output-cardboard-3d.webp>
 *   node tools/make_cardboard_3d.js --all  # Process all stickers that don't have -cardboard-3d versions
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

const execAsync = promisify(exec);

async function runTool(toolPath, args) {
  const command = `node ${toolPath} ${args.join(' ')}`;
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) console.error(stderr.trim());
  } catch (error) {
    console.error(`Error running ${toolPath}:`, error.message);
    throw error;
  }
}

async function processSticker(inputPath, outputPath) {
  
  // Step 1: Create cardboard background
  const tempCardboard = inputPath.replace('.webp', '-temp-cardboard.webp');
  await runTool('tools/add_second_edge.js', [inputPath, tempCardboard]);
  
  // Step 2: Add 3D bevel effect
  await runTool('tools/add_cardboard_bevel.js', [tempCardboard, outputPath, '--bevelPx', '16']);
  
  // Step 3: Clean up temporary file
  try {
    const { execSync } = await import('child_process');
    execSync(`rm -f "${tempCardboard}"`);
  } catch (error) {
    console.warn(`Warning: Could not remove temp file ${tempCardboard}`);
  }
  
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
  node tools/make_cardboard_3d.js <input.sticker.webp> <output-cardboard-3d.webp>
  node tools/make_cardboard_3d.js --all  # Process all stickers missing -cardboard-3d versions`);
    process.exit(0);
  }
  
  if (args[0] === '--all') {
    
    // Find all .sticker.webp files recursively
    function findStickerFiles(dir) {
      const files = [];
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...findStickerFiles(fullPath));
        } else if (item.endsWith('.sticker.webp')) {
          files.push(fullPath);
        }
      }
      
      return files;
    }
    
    const stickerFiles = findStickerFiles('public');
    
    let processed = 0;
    for (const stickerFile of stickerFiles) {
      // Check if corresponding -cardboard-3d version exists
      const cardboard3dFile = stickerFile.replace('.sticker.webp', '.sticker-cardboard-3d.webp');
      
      if (!existsSync(cardboard3dFile)) {
        await processSticker(stickerFile, cardboard3dFile);
        processed++;
      } else {
      }
    }
    
    
  } else if (args.length === 2) {
    // Single file processing
    const [inputPath, outputPath] = args;
    
    if (!existsSync(inputPath)) {
      console.error(`❌ Input file does not exist: ${inputPath}`);
      process.exit(1);
    }
    
    await processSticker(inputPath, outputPath);
    
  } else {
    console.error('❌ Invalid arguments. Use --help for usage information.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Pipeline failed:', error.message);
  process.exit(1);
});