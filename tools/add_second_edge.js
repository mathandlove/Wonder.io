#!/usr/bin/env node
/**
 * Add a thin brown ring around the alpha edge of an image.
 *
 * Usage:
 *   node tools/add_second_edge.js <input> <output> [edgePx=100] [offsetPx=0] [--color "#8c4b15"]
 */

import sharp from "sharp";

function hexToRGB(hex) {
  const m = /^#?([a-fA-F0-9]{6})$/.exec(hex || "");
  if (!m) return { r: 140, g: 75, b: 21 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      'Usage: node tools/add_second_edge.js <input> <output> [edgePx=100] [offsetPx=0] [--color "#8c4b15"]'
    );
    process.exit(1);
  }
  const input = args[0];
  const output = args[1];
  const edgePx = args[2] ? Math.max(1, parseInt(args[2], 10) || 100) : 100;
  const offsetPx = args[3] ? Math.max(0, parseInt(args[3], 10) || 0) : 0;
  let color = "#8c4b15";
  for (let i = 4; i < args.length; i++) {
    if (args[i] === "--color" && i + 1 < args.length) color = args[++i];
  }
  const { r: Rb, g: Gb, b: Bb } = hexToRGB(color);

  // Load and expand
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height;
  const pad = Math.max(edgePx + offsetPx, 100); // Ensure minimum 100px padding
  const newW = W + 2 * pad,
    newH = H + 2 * pad;

  // Copy into expanded buffer
  const expanded = Buffer.alloc(newW * newH * 4, 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const si = (y * W + x) * 4;
      const di = ((y + pad) * newW + (x + pad)) * 4;
      expanded[di] = data[si];
      expanded[di + 1] = data[si + 1];
      expanded[di + 2] = data[si + 2];
      expanded[di + 3] = data[si + 3];
    }
  }

  // Mask from alpha
  const mask = new Uint8Array(newW * newH);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) mask[i] = expanded[p + 3] > 0 ? 1 : 0;

  // Distance field
  const df = new Float32Array(newW * newH);
  const INF = 1e9;
  for (let i = 0; i < df.length; i++) df[i] = mask[i] ? 0 : INF;

  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const i = y * newW + x;
      if (y > 0) {
        df[i] = Math.min(df[i], df[(y - 1) * newW + x] + 1);
        if (x > 0) df[i] = Math.min(df[i], df[(y - 1) * newW + (x - 1)] + Math.SQRT2);
        if (x + 1 < newW) df[i] = Math.min(df[i], df[(y - 1) * newW + (x + 1)] + Math.SQRT2);
      }
      if (x > 0) df[i] = Math.min(df[i], df[y * newW + (x - 1)] + 1);
    }
  }
  for (let y = newH - 1; y >= 0; y--) {
    for (let x = newW - 1; x >= 0; x--) {
      const i = y * newW + x;
      if (y + 1 < newH) {
        df[i] = Math.min(df[i], df[(y + 1) * newW + x] + 1);
        if (x > 0) df[i] = Math.min(df[i], df[(y + 1) * newW + (x - 1)] + Math.SQRT2);
        if (x + 1 < newW) df[i] = Math.min(df[i], df[(y + 1) * newW + (x + 1)] + Math.SQRT2);
      }
      if (x + 1 < newW) df[i] = Math.min(df[i], df[y * newW + (x + 1)] + 1);
    }
  }

  // Ring alpha
  const ringA = new Uint8Array(newW * newH);
  const inner = offsetPx,
    outer = offsetPx + edgePx;
  for (let i = 0; i < ringA.length; i++) {
    const d = df[i];
    ringA[i] = mask[i] === 0 && d > inner && d <= outer ? 255 : 0;
  }

  // Load cardboard texture resized to canvas size
  const cardboard = await sharp("public/VisualAssets/cardboard.png")
    .resize(newW, newH, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer();

  // Use ringA as alpha channel to mask cardboard
  const maskRGBA = Buffer.alloc(newW * newH * 4, 0);
  for (let i = 0, p = 0; i < ringA.length; i++, p += 4) {
    const a = ringA[i];
    if (a) {
      maskRGBA[p] = cardboard[p];
      maskRGBA[p + 1] = cardboard[p + 1];
      maskRGBA[p + 2] = cardboard[p + 2];
      maskRGBA[p + 3] = a;
    }
  }

  // Composite
  await sharp(maskRGBA, { raw: { width: newW, height: newH, channels: 4 } })
    .composite([{ input, left: pad, top: pad, blend: "over" }])
    .webp({ lossless: true, quality: 100, alphaQuality: 100 })
    .toFile(output);

  console.log(`✔ Second edge added: ${output} (edgePx=${edgePx}, offsetPx=${offsetPx}, color=${color})`);
}

main().catch((err) => {
  console.error("✖", err);
  process.exit(1);
});