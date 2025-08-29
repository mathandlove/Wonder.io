#!/usr/bin/env node
// Add a directional bevel/emboss to a sticker using Sharp only.
// Usage:
//   node tools/add_bevel.js in.webp out.webp --bevelPx 4 --lightDir 40 --intensity 0.35
// Flags:
//   --bevelPx <px>        Rim thickness (1..50, default 4)
//   --lightDir <deg>      Light angle in degrees (0=right, 90=down; default 45)
//   --intensity <0..1>    Shading strength (default 0.35)
//   --mode <soft-light|overlay|normal>  Blend mode (default soft-light)
//   --debug <true|false>  Dump rim & height PNGs (default false)

import sharp from "sharp";
import fs from "node:fs";

function argBool(v, d=false){ if(v==null) return d; const s=String(v).toLowerCase(); return s==="1"||s==="true"||s==="yes";}
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

function parseArgs() {
  const a = process.argv.slice(2);
  if (a.length < 2) {
    console.error("Usage: node tools/add_bevel.js <input> <output> [--bevelPx N] [--lightDir deg] [--intensity 0..1] [--mode soft-light|overlay|normal] [--debug true]");
    process.exit(1);
  }
  const input = a[0], output = a[1];
  let bevelPx=4, lightDir=45, intensity=0.35, mode="soft-light", debug=false;
  for (let i=2;i<a.length;i++){
    const k=a[i];
    if(k==="--bevelPx") bevelPx = clamp(parseInt(a[++i]||"4",10)||4, 1, 50);
    else if(k==="--lightDir") lightDir = parseFloat(a[++i]||"45");
    else if(k==="--intensity") intensity = clamp(parseFloat(a[++i]||"0.35"), 0, 1);
    else if(k==="--mode") mode = String(a[++i]||"soft-light").toLowerCase();
    else if(k==="--debug") debug = argBool(a[++i], false);
  }
  return { input, output, bevelPx, lightDir, intensity, mode, debug };
}

// 3x3 erosion (shrinks mask by ~1px); repeat R times to approximate radius
function erode3x3(mask, w, h) {
  const out = new Uint8Array(w*h);
  for (let y=1;y<h-1;y++){
    for (let x=1;x<w-1;x++){
      let all=1;
      for(let dy=-1;dy<=1 && all;dy++){
        for(let dx=-1;dx<=1 && all;dx++){
          if(!mask[(y+dy)*w+(x+dx)]) all=0;
        }
      }
      out[y*w+x]=all?1:0;
    }
  }
  // borders → 0
  for(let x=0;x<w;x++){ out[x]=0; out[(h-1)*w+x]=0; }
  for(let y=0;y<h;y++){ out[y*w]=0; out[y*w+(w-1)]=0; }
  return out;
}

function blurAlpha(rgba, w, h, sigma) {
  // Sharp blur on alpha channel only: extract alpha → blur → return Uint8Array
  return sharp(rgba, { raw:{ width:w, height:h, channels:4 } })
    .extractChannel(3)
    .blur(sigma)
    .raw()
    .toBuffer();
}

// Simple Sobel on float height array (0..1). Returns gx, gy as floats.
function sobel(height, w, h) {
  const gx = new Float32Array(w*h);
  const gy = new Float32Array(w*h);
  const Kx = [-1,0,1,-2,0,2,-1,0,1];
  const Ky = [-1,-2,-1, 0,0,0, 1,2,1];
  for(let y=1;y<h-1;y++){
    for(let x=1;x<w-1;x++){
      let sx=0, sy=0, k=0;
      for(let dy=-1; dy<=1; dy++){
        for(let dx=-1; dx<=1; dx++){
          const v = height[(y+dy)*w + (x+dx)];
          sx += v * Kx[k];
          sy += v * Ky[k];
          k++;
        }
      }
      gx[y*w+x]=sx; gy[y*w+x]=sy;
    }
  }
  return { gx, gy };
}

async function main(){
  const { input, output, bevelPx, lightDir, intensity, mode, debug } = parseArgs();

  const img = sharp(input);
  const meta = await img.metadata();
  if(!meta.width || !meta.height) throw new Error("Could not read image size");
  const W=meta.width, H=meta.height;

  // Read RGBA raw
  const rgba = await img.ensureAlpha().raw().toBuffer();

  // --- Build binary alpha mask (0/1) ---
  const alphaMask = new Uint8Array(W*H);
  for(let i=0,p=0;i<alphaMask.length;i++,p+=4) alphaMask[i] = rgba[p+3] > 0 ? 1 : 0;

  // --- Inner rim (within bevelPx of the edge, inside the sticker) ---
  const r = clamp(Math.round(bevelPx), 1, 50);
  // Erode alpha r times → interior shrunk; rim = alphaMask - eroded
  let eroded = alphaMask;
  for(let i=0;i<r;i++) eroded = erode3x3(eroded, W, H);
  const rimMask = new Uint8Array(W*H);
  let rimCount=0;
  for(let i=0;i<rimMask.length;i++){
    const v = alphaMask[i] && !eroded[i] ? 1 : 0;
    rimMask[i]=v; if(v) rimCount++;
  }

  // --- Height map from blurred alpha (soft ramp near edges) ---
  const sigma = Math.max(0.6, r * 0.6);
  const alphaBlur = await blurAlpha(rgba, W, H, sigma); // Uint8 0..255
  // convert to float 0..1
  const height = new Float32Array(W*H);
  for(let i=0;i<height.length;i++) height[i] = alphaBlur[i]/255;

  // --- Gradients & directional shading ---
  const { gx, gy } = sobel(height, W, H);
  const rad = (lightDir * Math.PI) / 180;
  const lx = Math.cos(rad), ly = Math.sin(rad);

  // Build separate shadow and highlight maps
  const shadowRGBA = Buffer.alloc(W*H*4, 0);
  const highlightRGBA = Buffer.alloc(W*H*4, 0);
  
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const i = y*W + x;
      if(!rimMask[i]) continue; // only on rim
      let nx = gx[i], ny = gy[i];
      const len = Math.hypot(nx, ny) || 1e-6;
      nx/=len; ny/=len;
      const ndotl = nx*lx + ny*ly; // -1..1
      const p = i*4;
      
      if (ndotl < 0) {
        // Shadow pass: dark grayscale, blend with multiply
        const shadowAlpha = Math.round(255 * intensity * Math.abs(ndotl));
        shadowRGBA[p] = 0;     // Dark shadow
        shadowRGBA[p+1] = 0;
        shadowRGBA[p+2] = 0;
        shadowRGBA[p+3] = shadowAlpha;
      } else {
        // Highlight pass: white, blend with screen
        const highlightAlpha = Math.round(255 * intensity * Math.abs(ndotl));
        highlightRGBA[p] = 255;   // White highlight
        highlightRGBA[p+1] = 255;
        highlightRGBA[p+2] = 255;
        highlightRGBA[p+3] = highlightAlpha;
      }
    }
  }

  if (debug) {
    const rim8 = Buffer.from(rimMask.map(v=>v?255:0));
    await sharp(rim8, { raw:{width:W,height:H,channels:1} }).png().toFile(output.replace(/\.(png|webp)$/i, ".rim.png"));
    await sharp(alphaBlur, { raw:{width:W,height:H,channels:1} }).png().toFile(output.replace(/\.(png|webp)$/i, ".height.png"));
  }

  // --- Composite shadow and highlight passes over original ---
  // Start with original RGBA buffer, apply shadow first (multiply), then highlights (screen)
  let comp = sharp(rgba, { raw:{ width:W, height:H, channels:4 } })
    .composite([
      { input: shadowRGBA, raw:{ width:W, height:H, channels:4 }, blend: 'multiply' },
      { input: highlightRGBA, raw:{ width:W, height:H, channels:4 }, blend: 'screen' }
    ]);

  const outExt = output.toLowerCase().endsWith(".png") ? "png" : "webp";
  if (outExt==="png") {
    await comp.png().toFile(output);
  } else {
    await comp.webp({ quality:100, lossless:true }).toFile(output);
  }

  console.log(`✔ Bevel added -> ${output}  (bevelPx=${bevelPx}, lightDir=${lightDir}°, intensity=${intensity}, mode=${mode}, rimPx≈${r})`);
}

main().catch(err => { console.error("✖", err.stack || err); process.exit(1); });