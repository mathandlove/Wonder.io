# Image Processing Tools

This directory contains tools for creating cardboard cutout effects and processing character images.

## Quick Start

### Process All Character Images

To automatically create cardboard cutouts for all character images:

```bash
# Preview what would be processed
node tools/make_all_cardboard.js --dry-run

# Process all images that don't have cardboard versions
node tools/make_all_cardboard.js

# Force regenerate all images (even existing ones)
node tools/make_all_cardboard.js --force
```

### Process a Single Image

```bash
node tools/make_all_cardboard.js path/to/character.png
```

## The Cardboard Cutout Pipeline

The complete pipeline transforms a character PNG into a 3D cardboard cutout:

```
character.png
    ↓
┌─────────────────────────────────────┐
│ 1. Background Removal               │
│    → character.cutout.webp          │
│    Removes white background,        │
│    keeps largest component          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. White Sticker Border             │
│    → character.sticker.webp         │
│    Adds white border using          │
│    distance field algorithm         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. Cardboard Ring                   │
│    → temp file                      │
│    Adds brown cardboard texture     │
│    ring around the edge             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 4. 3D Bevel Effect                  │
│    → character.sticker-cardboard-3d │
│    Applies directional lighting     │
│    and corrugated texture           │
└─────────────────────────────────────┘
```

## Individual Tools

### Main Tool

#### `make_all_cardboard.js` ⭐ **Recommended**
Complete automated pipeline processor.

```bash
node tools/make_all_cardboard.js [options]

Options:
  --dry-run    Preview what would be processed
  --force      Regenerate all files
  --help       Show help

Single file:
  node tools/make_all_cardboard.js image.png
```

**Searches in:**
- `public/stories/*.bundle/images/characters/`

### Pipeline Components

#### `cutout_border_only.js`
Removes white backgrounds using flood-fill algorithm.

```bash
# Process single file
node tools/cutout_border_only.js input.png output.cutout.webp [tolerance] [feather] [preblur]

# Process all character folders
node tools/cutout_border_only.js

Parameters:
  tolerance: 0-255, luminance threshold (default: 220)
  feather:   0-5, erosion to avoid halos (default: 2)
  preblur:   0-2, initial blur (default: 0.6)
```

**Features:**
- Flood-fill from borders (preserves interior whites)
- Component labeling (removes stray pixels)
- Despeckle filter for clean edges

#### `make_sticker_border.js`
Adds white border with optional 3D beveling.

```bash
node tools/make_sticker_border.js input.webp output.webp [strokePx] [softness] [shadow] [options]

Parameters:
  strokePx:  1-500, border thickness (default: 21)
  softness:  0.1-5, blur amount (default: 0.8)
  shadow:    true/false, add drop shadow (default: true)

Options:
  --vectorSmooth           Use morphological smoothing
  --bevelPx <N>           Add 3D bevel effect (0 = off)
  --lightDir <deg>        Light direction (default: 45)
  --bevelIntensity <0-1>  Shading strength (default: 0.35)
```

**Algorithms:**
- Distance field for smooth borders
- Sobel edge detection for normals
- Vector or raster smoothing modes

#### `add_second_edge.js`
Adds cardboard texture ring.

```bash
node tools/add_second_edge.js input.webp output.webp [edgePx] [offsetPx] [--color "#hex"]

Parameters:
  edgePx:    Width of cardboard ring (default: 100)
  offsetPx:  Offset from edge (default: 0)
  --color:   Cardboard color (default: #8c4b15)
```

**Uses:** `public/VisualAssets/cardboard.png` for texture

#### `add_cardboard_bevel.js`
Applies 3D lighting and shading effect.

```bash
node tools/add_cardboard_bevel.js input.webp output.webp [options]

Options:
  --bevelPx <N>          Rim thickness (default: 4)
  --lightDir <deg>       Light angle, 0=right (default: 45)
  --intensity <0-1>      Shading strength (default: 0.35)
  --mode <blend-mode>    soft-light|overlay|normal (default: soft-light)
  --debug <bool>         Dump debug PNGs (default: false)
```

**Uses:** `public/VisualAssets/CardboardEdge.png` for corrugated texture

**Techniques:**
- Sobel operator for gradient calculation
- Directional lighting (lambert shading)
- Texture mapping for cardboard grooves

### Legacy/Alternative Tools

#### `make_cardboard_3d.js`
Earlier pipeline orchestrator (now superseded by `make_all_cardboard.js`).

```bash
# Process single sticker
node tools/make_cardboard_3d.js input.sticker.webp output.cardboard-3d.webp

# Process all .sticker.webp files
node tools/make_cardboard_3d.js --all
```

⚠️ **Note:** Requires `.sticker.webp` files to already exist. Use `make_all_cardboard.js` instead.

### Support Tools

#### `convert_jpg_to_png.js`
Converts JPG/JPEG files to PNG format.

```bash
# Convert all JPGs in public/ directory (deletes originals by default)
node tools/convert_jpg_to_png.js

# Convert JPGs in specific directory
node tools/convert_jpg_to_png.js path/to/folder

# Keep original JPGs after conversion
node tools/convert_jpg_to_png.js --keep

# Show help
node tools/convert_jpg_to_png.js --help
```

**Features:**
- Recursively searches directories (skips node_modules)
- Preserves EXIF orientation
- High compression PNG output (level 9)
- Size comparison before/after
- Deletes original JPG files by default (use `--keep` to preserve)

#### `generate_hotspot_thumbnails.js`
Generates cropped PNG thumbnails from hotspot data with mask applied.

```bash
# Generate thumbnails for a specific hotspot file
node tools/generate_hotspot_thumbnails.js public/stories/gingerbread.bundle/images/hotspots/cluesColored_insideBakery.json

# Generate thumbnails for all hotspot files
node tools/generate_hotspot_thumbnails.js --all

# Show help
node tools/generate_hotspot_thumbnails.js --help
```

**Features:**
- Creates masked thumbnails cropped to hotspot bounds
- Applies polygon mask from hotspot points
- Outputs to `images/hotspots/IMAGENAME/` directory
- Names thumbnails by hotspot label
- High compression PNG output (level 9)

**Output:**
Each hotspot gets a PNG file (e.g., `crumbs.png`, `frosting.png`) containing:
- The color clue image cropped to the hotspot's bounding box
- A polygon mask applied to show only the hotspot region
- Transparent background outside the mask
- Files organized by image name for better clue reusability

#### `gen_outlines.js`
Creates black outlines from maps/clues (different use case).

```bash
node tools/gen_outlines.js
```

Searches `maps/` and `clues/` directories for PNG/JPG files and creates `.outline.webp` versions.

#### Testing Tools
- `test_outline.js` - Test outline generation
- `verify_outline.js` - Verify outline quality
- `analyze_outline.js` - Analyze outline metrics
- `check_sticker.js` - Check sticker format
- `debug_sticker.js` - Debug sticker issues
- `simple_sticker.js` - Simple sticker test

## Configuration

All pipeline settings are defined in `make_all_cardboard.js`:

```javascript
const CONFIG = {
  cutout: {
    tolerance: 220,   // White detection threshold
    feather: 2,       // Edge erosion
    preblur: 0.6      // Noise reduction
  },
  sticker: {
    strokePx: 21,     // Border width
    softness: 0.8,    // Border blur
    shadow: true      // Drop shadow
  },
  cardboardEdge: {
    edgePx: 100,      // Ring width
    offsetPx: 0,      // Ring offset
    color: '#8c4b15'  // Brown color
  },
  bevel: {
    bevelPx: 16,      // Rim thickness
    lightDir: 40,     // Light angle
    intensity: 0.35   // Shading strength
  }
};
```

Edit these values to customize the output style.

## Image Processing Techniques

### Distance Field Transform
Used for precise border placement and smooth rings.

**How it works:**
1. Mark all character pixels as distance 0
2. Propagate distances outward using multiple passes
3. Use distance thresholds to create rings

### Sobel Edge Detection
Calculates gradients for normal map generation.

**Kernels:**
```
X-gradient:        Y-gradient:
[-1  0  1]        [-1 -2 -1]
[-2  0  2]        [ 0  0  0]
[-1  0  1]        [ 1  2  1]
```

### Flood Fill
Removes only border-connected backgrounds.

**Algorithm:**
1. Start from all border pixels
2. Mark connected white pixels as background
3. Preserve interior whites (eyes, teeth, etc.)

### Morphological Operations
Erosion and dilation for smoothing and feathering.

**Uses:**
- Remove halos around edges
- Smooth jagged boundaries
- Fill small gaps

## Required Assets

Place these textures in `public/VisualAssets/`:

- `cardboard.png` - Full cardboard texture (tiled for rings)
- `CardboardEdge.png` - Corrugated edge detail for 3D effect

## Output File Naming Convention

For an input file `character.png`:

```
character.png              # Original image
character.cutout.webp      # Background removed
character.sticker.webp     # White border added
character.sticker-cardboard-3d.webp  # Final 3D cardboard
```

All outputs are **lossless WebP** format for maximum quality.

## Troubleshooting

### Background not removed properly
- Adjust `tolerance` in cutout settings (lower = more aggressive)
- Increase `preblur` to merge noise before processing
- Check that background is border-connected

### White border has gaps
- Increase `strokePx` for thicker border
- Try `--vectorSmooth` mode for cleaner edges
- Reduce `softness` for sharper borders

### 3D effect not visible
- Increase `bevel.intensity` (up to 1.0)
- Try different `lightDir` angles
- Check that `CardboardEdge.png` exists and has visible texture

### Processing is slow
- Pipeline processes one image at a time
- Each step involves multiple blur/convolution operations
- Larger images take longer (consider resizing if needed)

## Examples

### Basic usage
```bash
# Process all new character images
node tools/make_all_cardboard.js
```

### Preview before processing
```bash
# See what would be processed
node tools/make_all_cardboard.js --dry-run
```

### Force regenerate everything
```bash
# Useful after changing CONFIG settings
node tools/make_all_cardboard.js --force
```

### Process a specific character
```bash
# Single file mode
node tools/make_all_cardboard.js public/stories/gingerbread.bundle/images/characters/fox.png
```

### Custom settings for one image
```bash
# Manual pipeline with custom parameters
node tools/cutout_border_only.js input.png temp1.webp 230 3 0.8
node tools/make_sticker_border.js temp1.webp temp2.webp 30 1.0 true --vectorSmooth
node tools/add_second_edge.js temp2.webp temp3.webp 120 0
node tools/add_cardboard_bevel.js temp3.webp final.webp --bevelPx 20 --intensity 0.5
```

## Dependencies

All tools require:
- **sharp** - High-performance image processing library

Install with:
```bash
npm install sharp
```

## License

Part of the Wonder.io project.
