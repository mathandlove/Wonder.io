import sharp from 'sharp';

async function analyze() {
  const originalFile = 'public/assets.core/maps/cityMap.png';
  const outlineFile = 'public/assets.core/maps/cityMap.outline.webp';
  
  console.log('Analyzing original vs outline...\n');
  
  // Get original image data
  const { data: origData, info: origInfo } = await sharp(originalFile)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // Get outline data
  const { data: outData, info: outInfo } = await sharp(outlineFile)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // Sample pixels from different areas
  const samplePoints = [
    { x: 100, y: 100, label: 'Near top-left' },
    { x: origInfo.width / 2 | 0, y: origInfo.height / 2 | 0, label: 'Center' },
    { x: origInfo.width - 100, y: origInfo.height - 100, label: 'Near bottom-right' },
    { x: 300, y: 300, label: 'Offset position' }
  ];
  
  console.log('Pixel comparison (Original → Outline):\n');
  
  for (const point of samplePoints) {
    const idx = (point.y * origInfo.width + point.x) * 4;
    
    const origR = origData[idx];
    const origG = origData[idx + 1];
    const origB = origData[idx + 2];
    const origA = origData[idx + 3];
    const origLum = Math.round(0.299 * origR + 0.587 * origG + 0.114 * origB);
    
    const outR = outData[idx];
    const outG = outData[idx + 1];
    const outB = outData[idx + 2];
    const outA = outData[idx + 3];
    
    console.log(`${point.label} (${point.x}, ${point.y}):`);
    console.log(`  Original: RGB(${origR}, ${origG}, ${origB}) A=${origA} Lum=${origLum}`);
    console.log(`  Outline:  RGB(${outR}, ${outG}, ${outB}) A=${outA}`);
    console.log('');
  }
  
  // Count non-transparent pixels in outline
  let transparentCount = 0;
  let opaqueCount = 0;
  let semiTransparentCount = 0;
  
  for (let i = 0; i < outInfo.width * outInfo.height; i++) {
    const alpha = outData[i * 4 + 3];
    if (alpha === 0) transparentCount++;
    else if (alpha === 255) opaqueCount++;
    else semiTransparentCount++;
  }
  
  const total = outInfo.width * outInfo.height;
  console.log('Outline pixel statistics:');
  console.log(`  Transparent (A=0): ${transparentCount} (${(transparentCount/total*100).toFixed(1)}%)`);
  console.log(`  Opaque (A=255): ${opaqueCount} (${(opaqueCount/total*100).toFixed(1)}%)`);
  console.log(`  Semi-transparent: ${semiTransparentCount} (${(semiTransparentCount/total*100).toFixed(1)}%)`);
}

analyze().catch(console.error);