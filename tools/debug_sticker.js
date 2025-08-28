import sharp from 'sharp';

async function debugStickerBorder(input, strokePx = 80, softness = 1.2) {
  console.log(`🔍 Debugging sticker border creation...`);

  // Step 1: Load and get image info
  const image = sharp(input).rotate();
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const { width: W, height: H } = info;
  console.log(`   📏 Original size: ${W}x${H}`);
  
  // Calculate expanded canvas size
  const borderWidth = strokePx * 2;
  const newW = W + borderWidth * 2;
  const newH = H + borderWidth * 2;
  const offsetX = borderWidth;
  const offsetY = borderWidth;
  
  console.log(`   📐 Expanded size: ${newW}x${newH} (border: ${borderWidth}px on each side)`);

  // Step 2: Create expanded canvas and place original image in center
  const expandedData = Buffer.alloc(newW * newH * 4);
  expandedData.fill(0);
  
  // Copy original image data to center
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const srcIdx = (y * W + x) * 4;
      const dstIdx = ((y + offsetY) * newW + (x + offsetX)) * 4;
      
      expandedData[dstIdx] = data[srcIdx];
      expandedData[dstIdx + 1] = data[srcIdx + 1];
      expandedData[dstIdx + 2] = data[srcIdx + 2];
      expandedData[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  
  // Step 3: Extract alpha from expanded canvas
  const expandedAlpha = Buffer.alloc(newW * newH);
  for (let i = 0, p = 3; i < expandedAlpha.length; i++, p += 4) {
    expandedAlpha[i] = expandedData[p];
  }

  // Check expanded alpha stats before blur
  let expandedNonZero = 0;
  let expandedMaxValue = 0;
  for (let i = 0; i < expandedAlpha.length; i++) {
    if (expandedAlpha[i] > 0) expandedNonZero++;
    if (expandedAlpha[i] > expandedMaxValue) expandedMaxValue = expandedAlpha[i];
  }
  console.log(`   📊 Expanded alpha stats: ${expandedNonZero} non-zero pixels, max value: ${expandedMaxValue}`);

  // Save the expanded alpha as debug image
  console.log(`   💾 Saving expanded alpha as debug image...`);
  await sharp(expandedAlpha, {
    raw: { width: newW, height: newH, channels: 1 }
  })
  .png()
  .toFile('/tmp/debug_expanded_alpha.png');

  // Step 4: Create grown border mask
  let currentAlpha = expandedAlpha;
  const iterations = Math.min(Math.ceil(strokePx / 30), 8);
  const blurPerIteration = strokePx * softness / iterations;
  
  console.log(`   🔄 Using ${iterations} blur iterations of ${blurPerIteration.toFixed(1)}px each...`);
  
  for (let i = 0; i < iterations; i++) {
    currentAlpha = await sharp(currentAlpha, {
      raw: { width: newW, height: newH, channels: 1 }
    })
    .blur(blurPerIteration)
    .raw()
    .toBuffer();
  }
  
  // Save the grown alpha as debug image
  console.log(`   💾 Saving grown alpha as debug image...`);
  await sharp(currentAlpha, {
    raw: { width: newW, height: newH, channels: 1 }
  })
  .png()
  .toFile('/tmp/debug_grown_alpha.png');

  // Check if grown alpha has any non-zero values
  let nonZeroCount = 0;
  let maxValue = 0;
  for (let i = 0; i < currentAlpha.length; i++) {
    if (currentAlpha[i] > 0) nonZeroCount++;
    if (currentAlpha[i] > maxValue) maxValue = currentAlpha[i];
  }
  
  console.log(`   📊 Grown alpha stats: ${nonZeroCount} non-zero pixels, max value: ${maxValue}`);
  
  // Create border mask visualization
  const borderMask = Buffer.alloc(newW * newH * 4);
  borderMask.fill(0);
  
  for (let i = 0, p = 0; i < newW * newH; i++, p += 4) {
    if (currentAlpha[i] > 0) {
      borderMask[p] = 255;     // R - red for border areas
      borderMask[p + 1] = 0;   // G
      borderMask[p + 2] = 0;   // B
      borderMask[p + 3] = 255; // A
    }
  }
  
  console.log(`   💾 Saving border mask visualization...`);
  await sharp(borderMask, {
    raw: { width: newW, height: newH, channels: 4 }
  })
  .png()
  .toFile('/tmp/debug_border_mask.png');
  
  console.log(`✔ Debug images saved to /tmp/debug_*.png`);
}

const input = 'public/stories/gingerbread.bundle/images/characters/fox.cutout.webp';
debugStickerBorder(input).catch(console.error);