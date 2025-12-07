#!/usr/bin/env node

/**
 * Convert JPG/JPEG files to PNG format
 *
 * This script walks through specified directories (or the entire public folder),
 * finds JPG/JPEG files, and converts them to PNG format using sharp.
 *
 * Usage:
 *   node tools/convert_jpg_to_png.js                    # Convert all JPGs in public/ (deletes originals)
 *   node tools/convert_jpg_to_png.js path/to/folder    # Convert JPGs in specific folder
 *   node tools/convert_jpg_to_png.js --keep             # Keep original JPGs after conversion
 *
 * Options:
 *   --keep, -k       Keep original JPG files after conversion (default: delete)
 *   --help, -h       Show this help message
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  extensions: ['.jpg', '.jpeg'],
  outputFormat: 'png',
  compressionLevel: 9, // 0-9, higher = better compression (slower)
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
  const colorCode = colors[color] || colors.reset;
  console.log(`${colorCode}${message}${colors.reset}`);
}

/**
 * Show help message
 */
function showHelp() {
  log('\n📸 JPG to PNG Converter', 'bright');
  log('\nUsage:', 'blue');
  log('  node tools/convert_jpg_to_png.js [directory] [options]', 'gray');
  log('\nExamples:', 'blue');
  log('  node tools/convert_jpg_to_png.js', 'gray');
  log('  node tools/convert_jpg_to_png.js public/stories', 'gray');
  log('  node tools/convert_jpg_to_png.js --keep', 'gray');
  log('  node tools/convert_jpg_to_png.js public/stories --keep', 'gray');
  log('\nOptions:', 'blue');
  log('  --keep, -k       Keep original JPG files after conversion (default: delete)', 'gray');
  log('  --help, -h       Show this help message', 'gray');
  log('');
}

/**
 * Recursively walk directory and find all files
 */
async function* walkDirectory(dir) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(dir, file.name);

      // Skip node_modules and hidden directories
      if (file.isDirectory() && (file.name === 'node_modules' || file.name.startsWith('.'))) {
        continue;
      }

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
 * Check if file is a JPG/JPEG file
 */
function isJpgFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return CONFIG.extensions.includes(ext);
}

/**
 * Get output PNG path for a JPG file
 */
function getPngPath(jpgPath) {
  const dir = path.dirname(jpgPath);
  const basename = path.basename(jpgPath, path.extname(jpgPath));
  return path.join(dir, `${basename}.png`);
}

/**
 * Check if PNG already exists
 */
async function pngExists(pngPath) {
  try {
    await fs.access(pngPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert JPG to PNG
 */
async function convertToPng(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .rotate() // Auto-rotate based on EXIF orientation
      .png({
        compressionLevel: CONFIG.compressionLevel,
        adaptiveFiltering: true,
        palette: false // Use full color
      })
      .toFile(outputPath);

    return true;
  } catch (error) {
    log(`Error converting ${inputPath}: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Delete file safely
 */
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    log(`Error deleting ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Get file size in human-readable format
 */
async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const bytes = stats.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } catch {
    return 'unknown';
  }
}

/**
 * Main processing function
 */
async function processJpgFiles(targetDir, deleteOriginal = true) {
  log('\n🖼️  Starting JPG to PNG conversion...', 'bright');
  log(`Target directory: ${targetDir}`, 'gray');
  log(`Delete originals: ${deleteOriginal ? 'Yes' : 'No'}`, 'gray');
  log(`Compression level: ${CONFIG.compressionLevel}`, 'gray');
  log('');

  let totalConverted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalDeleted = 0;

  for await (const filePath of walkDirectory(targetDir)) {
    if (!isJpgFile(filePath)) continue;

    const pngPath = getPngPath(filePath);
    const relPath = path.relative(process.cwd(), filePath);

    // Check if PNG already exists
    if (await pngExists(pngPath)) {
      log(`⏩ Skipped: ${relPath} (PNG exists)`, 'gray');
      totalSkipped++;
      continue;
    }

    log(`⚙️  Converting: ${relPath}...`, 'yellow');

    const jpgSize = await getFileSize(filePath);
    const success = await convertToPng(filePath, pngPath);

    if (success) {
      const pngSize = await getFileSize(pngPath);
      log(`✅ Converted: ${path.basename(pngPath)} (${jpgSize} → ${pngSize})`, 'green');
      totalConverted++;

      // Delete original if requested
      if (deleteOriginal) {
        const deleted = await deleteFile(filePath);
        if (deleted) {
          log(`   🗑️  Deleted: ${path.basename(filePath)}`, 'gray');
          totalDeleted++;
        }
      }
    } else {
      totalErrors++;
    }
  }

  // Final summary
  log('\n' + '═'.repeat(50), 'bright');
  log('✨ Conversion Complete!', 'bright');
  log(`📊 Total: ${totalConverted} converted, ${totalSkipped} skipped, ${totalErrors} errors`, 'green');

  if (deleteOriginal && totalDeleted > 0) {
    log(`🗑️  Deleted: ${totalDeleted} original JPG files`, 'blue');
  }

  if (totalErrors > 0) {
    log(`⚠️  ${totalErrors} files failed to convert`, 'red');
  }

  log('');
}

/**
 * Check if sharp is installed
 */
async function checkDependencies() {
  try {
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
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let targetDir = path.resolve(process.cwd(), 'public');
  let deleteOriginal = true; // Default to deleting originals

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--keep' || arg === '-k') {
      deleteOriginal = false;
    } else if (!arg.startsWith('-')) {
      targetDir = path.resolve(process.cwd(), arg);
    }
  }

  return { targetDir, deleteOriginal };
}

/**
 * Main entry point
 */
async function main() {
  // Parse arguments
  const { targetDir, deleteOriginal } = parseArgs();

  // Check dependencies
  if (!await checkDependencies()) {
    process.exit(1);
  }

  // Check if target directory exists
  try {
    const stats = await fs.stat(targetDir);
    if (!stats.isDirectory()) {
      log(`❌ Error: ${targetDir} is not a directory`, 'red');
      process.exit(1);
    }
  } catch {
    log(`❌ Error: Directory ${targetDir} does not exist`, 'red');
    process.exit(1);
  }

  try {
    await processJpgFiles(targetDir, deleteOriginal);
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

export { convertToPng, processJpgFiles };
