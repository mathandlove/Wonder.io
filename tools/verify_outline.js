import sharp from 'sharp';

const outlineFile = 'public/assets.core/maps/cityMap.outline.webp';

async function verify() {
  console.log('Verifying generated outline...\n');
  
  try {
    // Get metadata of generated file
    const metadata = await sharp(outlineFile).metadata();
    console.log('Generated outline metadata:', {
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      format: metadata.format,
      hasAlpha: metadata.hasAlpha,
      density: metadata.density
    });
    
    // Try to read and get stats
    const stats = await sharp(outlineFile).stats();
    console.log('\nImage statistics:', {
      channels: stats.channels.length,
      isOpaque: stats.isOpaque
    });
    
    // Extract a small sample of pixels to verify
    const { data, info } = await sharp(outlineFile)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    console.log('\nRaw data info:', {
      width: info.width,
      height: info.height,
      channels: info.channels,
      bufferSize: data.length
    });
    
    // Check first few pixels
    console.log('\nFirst 3 pixels (RGBA):');
    for (let i = 0; i < 3; i++) {
      const idx = i * 4;
      console.log(`Pixel ${i}: R=${data[idx]}, G=${data[idx+1]}, B=${data[idx+2]}, A=${data[idx+3]}`);
    }
    
    console.log('\n✅ Outline file appears to be valid');
  } catch (error) {
    console.error('❌ Error verifying outline:', error.message);
  }
}

verify().catch(console.error);