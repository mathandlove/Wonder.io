import sharp from 'sharp';

const outlineFile = 'public/assets.core/maps/cityMap.outline.webp';

async function verify() {
  
  try {
    // Get metadata of generated file
    const metadata = await sharp(outlineFile).metadata();
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      format: metadata.format,
      hasAlpha: metadata.hasAlpha,
      density: metadata.density
    });
    
    // Try to read and get stats
    const stats = await sharp(outlineFile).stats();
      channels: stats.channels.length,
      isOpaque: stats.isOpaque
    });
    
    // Extract a small sample of pixels to verify
    const { data, info } = await sharp(outlineFile)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
      width: info.width,
      height: info.height,
      channels: info.channels,
      bufferSize: data.length
    });
    
    // Check first few pixels
    for (let i = 0; i < 3; i++) {
      const idx = i * 4;
    }
    
  } catch (error) {
    console.error('❌ Error verifying outline:', error.message);
  }
}

verify().catch(console.error);