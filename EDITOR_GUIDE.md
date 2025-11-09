# Image Hotspot Editor Guide

## Overview

The Image Hotspot Editor is a standalone tool for annotating images with polygon-shaped hotspots. Use it to mark clues, points of interest, or interactive regions on your story images.

## Accessing the Editor

1. **Development**: Navigate to `http://localhost:5174/editor.html` when running `npm run dev`
2. **Production**: After building, open `dist/editor.html`

## Features

### 🎯 Lasso Tool
- **Draw freehand polygons** over images to create hotspot regions
- **Auto-closes** the polygon when you release the mouse
- **Smart sampling** - Records points every 3 pixels for smooth curves

### ⚙️ Manage Tool
- **View all hotspots** in a sidebar list
- **Edit labels** - Click the edit button (✏️) to rename hotspots
- **Delete hotspots** - Remove unwanted selections
- **Hover preview** - Hover over a hotspot in the list to highlight it on the image

### 💾 Persistence
- **Auto-save** - Hotspots are automatically saved to browser localStorage per image
- **Export** - Save hotspots as a JSON file for backup or sharing
- **Import** - Load hotspots from a previously exported JSON file

### 🖼️ Image Selection
- **Browse by category** - Filter clues, story images, backgrounds, or maps
- **Bundle filtering** - Show only images from specific story bundles
- **Visual preview** - See thumbnails of all available images

## How to Use

### Creating Hotspots

1. **Select an image** from the image selector gallery
2. **Click the Lasso Tool** (✏️) in the left toolbar
3. **Draw around the area** you want to mark by clicking and dragging
4. **Release the mouse** to complete the selection
5. The hotspot is automatically created and added to the list

### Editing Hotspots

1. **Click the Manage Tool** (⚙️) in the left toolbar
2. The sidebar shows all hotspots for the current image
3. **Click the edit button** (✏️) next to a hotspot
4. **Change the label** in the text field
5. **Click Save** to update the hotspot

### Deleting Hotspots

1. Open the **Manage Tool** sidebar
2. **Click the delete button** (🗑️) next to the hotspot
3. Confirm the deletion

### Exporting Hotspots

1. Click the **Export button** (💾) in the left toolbar
2. A JSON file downloads with all hotspots for the current image
3. The file is named based on the image path

### Importing Hotspots

1. Click the **Import button** (📥) in the left toolbar
2. Select a previously exported JSON file
3. Hotspots are loaded and replace current ones

### Clearing All Hotspots

1. Click the **Clear All button** (🗑️) in the left toolbar
2. Confirm you want to delete all hotspots
3. All hotspots for the current image are removed

## Visual States (Preview Feature)

When viewing hotspots with the Manage Tool active, you can click on a hotspot outline to cycle through visual preview states:

- **None** - No visual effect
- **Colored** - Shows a colored overlay (if a colored version of the image is available)
- **Glimmer** - Animated gold gradient effect

These states are for previewing effects and don't affect the saved hotspot data.

## Data Storage

### LocalStorage Format
```
Key: hotspots:<imagePath>
Value: JSON array of Hotspot objects
```

### Hotspot Structure
```typescript
{
  id: string;              // Unique identifier
  x: number;               // Bounding box X (percentage)
  y: number;               // Bounding box Y (percentage)
  width: number;           // Bounding box width (percentage)
  height: number;          // Bounding box height (percentage)
  label: string;           // User-defined label
  description?: string;    // Optional description
  points: Point[];         // Polygon vertices (pixels)
  createdAt: string;       // ISO timestamp
  mapId?: string;          // Image identifier
  imageUrl?: string;       // Image path
}
```

### Export File Format
```json
{
  "image": "/path/to/image.png",
  "hotspots": [...],
  "exportedAt": "2025-11-09T16:00:00.000Z"
}
```

## Adding New Images

To add new images to the selector, edit `src/features/editor/ImageSelector.tsx` and add entries to the `availableImages` array:

```typescript
{
  path: '/stories/your-bundle/images/clues/your-image.png',
  name: 'Your Image Name',
  category: 'clues',
  bundle: 'your-bundle'
}
```

## Keyboard Shortcuts

Currently, the editor uses mouse-based interactions. Keyboard shortcuts may be added in future versions.

## Tips & Best Practices

1. **Start with important clues** - Mark the most critical areas first
2. **Use descriptive labels** - Clear labels help identify hotspots later
3. **Export regularly** - Save backups of your hotspot data
4. **Draw carefully** - Take your time with the lasso tool for accurate selections
5. **Test on different screen sizes** - Hotspots use percentages, so they scale with the image

## Troubleshooting

### Hotspots Not Saving
- Check browser console for errors
- Ensure localStorage is enabled in your browser
- Try exporting hotspots as a backup

### Image Not Loading
- Verify the image path is correct
- Check that the image exists in the public directory
- Look for 404 errors in the browser console

### Lasso Tool Not Working
- Make sure the Lasso Tool is selected (blue highlight)
- Check that you're drawing on the image (not outside it)
- Try refreshing the page

## Future Enhancements

Potential features for future versions:
- Backend API for persistent storage
- Collaborative editing
- Undo/Redo functionality
- Keyboard shortcuts
- Shape tools (rectangle, circle)
- Hotspot grouping/tagging
- Export to different formats
- Integration with story runtime for interactive hotspots
