import sharp from 'sharp';

async function checkImages() {
  const cutout = 'public/stories/gingerbread.bundle/images/characters/fox.cutout.webp';
  const sticker = 'public/stories/gingerbread.bundle/images/characters/fox.sticker.webp';
  
  const cutoutMeta = await sharp(cutout).metadata();
  const stickerMeta = await sharp(sticker).metadata();
  
  console.log('Cutout metadata:', {
    width: cutoutMeta.width,
    height: cutoutMeta.height,
    channels: cutoutMeta.channels
  });
  
  console.log('Sticker metadata:', {
    width: stickerMeta.width,
    height: stickerMeta.height,
    channels: stickerMeta.channels
  });
  
  console.log('Difference:', {
    width: stickerMeta.width - cutoutMeta.width,
    height: stickerMeta.height - cutoutMeta.height
  });
}

checkImages().catch(console.error);