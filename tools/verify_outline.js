import sharp from 'sharp';

const outlineFile = 'public/assets.core/maps/cityMap.outline.webp';

async function verify() {
  
  try {
    // Get metadata of generated file
    const metadata = await sharp(outlineFile).metadata();
    console.log('Metadata:', {
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      format: metadata.format,
      hasAlpha: metadata.hasAlpha,
      density: metadata.density
    });

    // Try to read and get stats
    const stats = await sharp(outlineFile).stats();
    console.log('Stats:', {
      channels: stats.channels.length,
      isOpaque: stats.isOpaque
    });

    // Extract a small sample of pixels to verify
    const { data, info } = await sharp(outlineFile)
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log('Buffer info:', {
      width: info.width,
      height: info.height,
      channels: info.channels,
      bufferSize: data.length
    });

    // Check first few pixels
    console.log('First 3 pixels (RGBA):');
    for (let i = 0; i < 3; i++) {
      const idx = i * 4;
      console.log(`  Pixel ${i}:`, { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] });
    }

  } catch (error) {
    console.error('❌ Error verifying outline:', error.message);
  }
}

verify().catch(console.error);