import sharp from 'sharp';

const testFile = 'public/stories/gingerbread.bundle/images/mapsColored/cityMapColored.jpg';

async function test() {
  
  // Get original metadata
  const metadata = await sharp(testFile).metadata();
  console.log('Original metadata:', {
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

  console.log('Processed:', {
    width: processed.info.width,
    height: processed.info.height,
    channels: processed.info.channels,
    bufferSize: processed.data.length,
    expectedSize: processed.info.width * processed.info.height * processed.info.channels
  });

  // Verify buffer size matches
  const expectedSize = processed.info.width * processed.info.height * processed.info.channels;
  if (processed.data.length === expectedSize) {
    console.log('✅ Buffer size matches expected size');
  } else {
    console.error('❌ Buffer size mismatch!');
  }
}

test().catch(console.error);