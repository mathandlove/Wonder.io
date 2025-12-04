import sharp from 'sharp';

async function analyze() {
  const originalFile = 'public/stories/gingerbread.bundle/images/mapsColored/cityMapColored.jpg';
  const outlineFile = 'public/stories/gingerbread.bundle/images/mapsColored/cityMapColored.outline.webp';
  
  
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
}

analyze().catch(console.error);