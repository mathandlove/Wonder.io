# Cardboard Cutout Quick Start 🎨

## TL;DR

Process all character images into 3D cardboard cutouts in one command:

```bash
node tools/make_all_cardboard.js
```

That's it! ✨

## What It Does

Automatically finds all PNG/JPG images in character folders and creates:

1. ✂️ `.cutout.webp` - Background removed
2. 🏷️ `.sticker.webp` - White border added
3. 📦 `.sticker-cardboard-3d.webp` - 3D cardboard effect

## Common Commands

```bash
# Preview what will be processed (safe, no changes)
node tools/make_all_cardboard.js --dry-run

# Process all new images (skips existing)
node tools/make_all_cardboard.js

# Regenerate everything (overwrites existing)
node tools/make_all_cardboard.js --force

# Process just one image
node tools/make_all_cardboard.js path/to/character.png

# Get help
node tools/make_all_cardboard.js --help
```

## Where It Looks

The tool automatically searches these folders:

- `public/stories/*.bundle/images/characters/`
- `public/stories/*.bundle/characters/`

Just drop PNG or JPG files in any of these locations!

## Example Output

For `fox.png`, you'll get:

```
fox.png                      # Original (kept)
fox.cutout.webp             # Transparent background
fox.sticker.webp            # With white border
fox.sticker-cardboard-3d.webp # Final 3D cardboard ⭐
```

The final `.sticker-cardboard-3d.webp` is what you want!

## Customizing Settings

Edit the `CONFIG` object in [make_all_cardboard.js](make_all_cardboard.js) (around line 40):

```javascript
const CONFIG = {
  cutout: {
    tolerance: 220,   // Higher = removes more (0-255)
    feather: 2,       // Edge smoothing (0-5)
    preblur: 0.6      // Noise reduction (0-2)
  },
  sticker: {
    strokePx: 21,     // Border width in pixels
    softness: 0.8,    // Border blur amount
    shadow: true      // Add drop shadow
  },
  cardboardEdge: {
    edgePx: 100,      // Cardboard ring width
    offsetPx: 0,      // Distance from edge
    color: '#8c4b15'  // Brown cardboard color
  },
  bevel: {
    bevelPx: 16,      // 3D rim thickness
    lightDir: 40,     // Light angle (0=right, 90=down)
    intensity: 0.35   // Shading strength (0-1)
  }
};
```

## Troubleshooting

### "No character folders found"
- Make sure you're running from the project root
- Check that `public/` directory exists
- Character images must be in the specific folders listed above

### Background not removed cleanly
- Lower `tolerance` value (try 200-210)
- Increase `preblur` to merge speckles
- Make sure background is actually white

### Border looks jagged
- Increase `softness` for smoother edges
- Use `--vectorSmooth` flag (edit the tool to enable)

### 3D effect not visible enough
- Increase `bevel.intensity` (up to 1.0)
- Try different `lightDir` angles (0-360)

## Required Files

Make sure these textures exist:

- `public/VisualAssets/cardboard.png` - Cardboard texture
- `public/VisualAssets/CardboardEdge.png` - Corrugated edge detail

## How Long Does It Take?

- **Per image:** ~5-15 seconds depending on size
- **Batch mode:** Processes one at a time sequentially
- **Already processed:** Skipped instantly

## For More Info

See the full [README.md](README.md) for:
- Individual tool documentation
- Advanced usage examples
- Algorithm explanations
- Custom pipeline workflows

---

**Pro tip:** Run with `--dry-run` first to preview what will happen! 🚀
