import sharp from 'sharp';

const testFile = 'public/assets.core/maps/cityMap.png';

async function test() {
  
  // Get original metadata
  const metadata = await sharp(testFile).metadata();
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    format: metadata.format
  });
  
  // Test the processing pipeline
  const processed = await sharp(testFile)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
    width: processed.info.width,
    height: processed.info.height,
    channels: processed.info.channels,
    bufferSize: processed.data.length,
    expectedSize: processed.info.width * processed.info.height * processed.info.channels
  });
  
  // Verify buffer size matches
  const expectedSize = processed.info.width * processed.info.height * processed.info.channels;
  if (processed.data.length === expectedSize) {
  } else {
  }
}

test().catch(console.error);