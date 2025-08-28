import sharp from 'sharp';

async function createSimpleBorder(input, output, strokePx = 80) {
  console.log(`🔖 Creating simple sticker border: ${strokePx}px`);

  // Step 1: Load image
  const image = sharp(input).rotate();
  const { width: W, height: H } = await image.metadata();
  
  console.log(`   📏 Original size: ${W}x${H}`);
  
  // Step 2: Create expanded canvas
  const padding = strokePx;
  const newW = W + padding * 2;
  const newH = H + padding * 2;
  
  console.log(`   📐 New size: ${newW}x${newH} (padding: ${padding}px)`);
  
  // Step 3: Create white background
  const whiteBackground = sharp({
    create: {
      width: newW,
      height: newH,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  });
  
  // Step 4: Composite original image on top, centered
  const result = whiteBackground.composite([{
    input: await image.png().toBuffer(),
    top: padding,
    left: padding
  }]);
  
  // Step 5: Save as WebP
  await result
    .webp({
      lossless: true,
      alphaQuality: 100,
      quality: 100
    })
    .toFile(output);
  
  console.log(`✅ Simple border complete: ${input} -> ${output}`);
}

const input = 'public/stories/gingerbread.bundle/images/characters/fox.cutout.webp';
const output = '/tmp/fox_simple_border.webp';
createSimpleBorder(input, output, 80).catch(console.error);