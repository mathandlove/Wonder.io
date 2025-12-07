# Image Hotspot Editor - Architecture

## Overview

The Image Hotspot Editor is a standalone React application that runs parallel to the main story application within the same Vite project. It allows users to annotate images with freehand polygon selections for marking clues, points of interest, or interactive regions.

## Project Structure

```
/Users/mathandlove/Projects/Wonder.io-2.0/
├── editor.html                          # Editor entry point
├── index.html                           # Story entry point
├── src/
│   ├── app/
│   │   ├── editor.tsx                   # Editor bootstrap
│   │   └── main.tsx                     # Story bootstrap
│   ├── features/
│   │   └── editor/                      # Editor-specific features
│   │       ├── InteractiveMap.tsx       # Image display with hotspot overlays
│   │       ├── LassoSelection.tsx       # Freehand polygon drawing tool
│   │       ├── ConfigHighlights.tsx     # Hotspot management sidebar
│   │       ├── EditToolbar.tsx          # Left toolbar with tools
│   │       └── ImageSelector.tsx        # Image browser gallery
│   ├── pages/
│   │   ├── EditorApp.tsx               # Main editor component
│   │   └── StoryModeScroll.tsx         # Main story component
│   └── shared/
│       └── types/
│           └── hotspot.ts              # Shared type definitions
└── vite.config.ts                      # Multi-page build config
```

## Key Components

### EditorApp (`src/pages/EditorApp.tsx`)
**Purpose**: Main orchestrator for the editor interface

**Responsibilities**:
- Manages application state (hotspots, active tool, current image)
- Handles localStorage persistence (auto-save/load)
- Coordinates communication between child components
- Provides export/import functionality

**State**:
```typescript
activeTool: string | null           // Currently selected tool
hoveredHotspot: string | null       // ID of hovered hotspot
hotspots: Hotspot[]                 // Array of all hotspots
currentImage: string | null         // Path to current image
showImageSelector: boolean          // Toggle image selector
```

### InteractiveMap (`src/features/editor/InteractiveMap.tsx`)
**Purpose**: Displays the image with interactive hotspot overlays

**Features**:
- Renders base image with responsive sizing
- Displays hotspot polygons with SVG paths
- Supports visual states (none, colored, glimmer)
- Shows hover effects for hotspots
- Integrates LassoSelection component

**Key Props**:
```typescript
mapImage: string                    // Image to display
hotspots: Hotspot[]                 // Hotspots to render
activeTool: string | null           // Current tool mode
onHotspotCreated: (hotspot) => void // Creation callback
onHotspotHover: (id) => void        // Hover callback
```

### LassoSelection (`src/features/editor/LassoSelection.tsx`)
**Purpose**: Freehand polygon drawing tool

**How it works**:
1. User clicks and drags to draw
2. Component samples points every 3 pixels
3. On mouse up, polygon is auto-closed
4. Bounding box calculated from polygon vertices
5. Hotspot created with both polygon and bbox data

**Key Algorithm**:
```typescript
// Convert pixel coordinates to percentages
const x = (minX / containerWidth) * 100
const y = (minY / containerHeight) * 100
const width = ((maxX - minX) / containerWidth) * 100
const height = ((maxY - minY) / containerHeight) * 100
```

### ConfigHighlights (`src/features/editor/ConfigHighlights.tsx`)
**Purpose**: Sidebar for managing existing hotspots

**Features**:
- Lists all hotspots with thumbnails
- Edit labels and descriptions
- Delete hotspots
- Hover to highlight on map
- Shows hotspot metadata

### ImageSelector (`src/features/editor/ImageSelector.tsx`)
**Purpose**: Gallery for browsing and selecting images

**Features**:
- Grid layout with image previews
- Filter by category (clues, story, backgrounds, maps)
- Filter by story bundle
- Visual indicators for current selection
- Fallback images for 404s

### EditToolbar (`src/features/editor/EditToolbar.tsx`)
**Purpose**: Left sidebar with tool buttons

**Tools**:
- ✏️ Lasso Tool - Draw new hotspots
- ⚙️ Manage - View/edit hotspots
- 💾 Export - Download JSON
- 📥 Import - Load JSON
- 🗑️ Clear All - Delete all hotspots

## Data Flow

### Creating a Hotspot
```
User draws with mouse
  ↓
LassoSelection captures points
  ↓
On mouse up, creates partial hotspot object
  ↓
Calls onHotspotCreated prop
  ↓
EditorApp receives partial hotspot
  ↓
EditorApp adds metadata (id, timestamp, imageUrl)
  ↓
Complete hotspot added to state
  ↓
useEffect saves to localStorage
  ↓
InteractiveMap re-renders with new hotspot
```

### Loading Hotspots
```
User selects image
  ↓
currentImage state changes
  ↓
useEffect triggered
  ↓
Reads localStorage key: "hotspots:<imagePath>"
  ↓
Parses JSON and sets hotspots state
  ↓
Components re-render with loaded hotspots
```

## Storage Strategy

### LocalStorage
- **Key Pattern**: `hotspots:<imagePath>`
- **Value**: JSON-stringified array of Hotspot objects
- **Persistence**: Per-image, survives page refresh
- **Limitations**: ~5-10MB per domain (browser dependent)

### Export Files
- **Format**: JSON with metadata
- **Structure**:
  ```json
  {
    "image": "/path/to/image.png",
    "hotspots": [...],
    "exportedAt": "ISO timestamp"
  }
  ```
- **Purpose**: Backup, sharing, version control

## Type System

### Hotspot
```typescript
interface Hotspot {
  id: string;              // Unique identifier (timestamp-based)
  x: number;               // Bounding box X (percentage 0-100)
  y: number;               // Bounding box Y (percentage 0-100)
  width: number;           // Bounding box width (percentage)
  height: number;          // Bounding box height (percentage)
  label: string;           // User-defined label
  description?: string;    // Optional description
  points?: Point[];        // Polygon vertices (pixels)
  createdAt: string;       // ISO timestamp
  mapId?: string;          // Image identifier
  imageUrl?: string;       // Path to annotated image
}
```

### Point
```typescript
interface Point {
  x: number;  // Pixel coordinate
  y: number;  // Pixel coordinate
}
```

### HotspotState
```typescript
type HotspotState = 'none' | 'colored' | 'glimmer';
```

## Build Configuration

### Multi-Page Setup (vite.config.ts)
```typescript
build: {
  rollupOptions: {
    input: {
      main: path.resolve(__dirname, 'index.html'),
      editor: path.resolve(__dirname, 'editor.html'),
    },
  },
}
```

This configuration tells Vite to:
1. Create two separate bundles
2. Generate `dist/index.html` and `dist/editor.html`
3. Each with their own entry point and dependencies

## Styling

### Tailwind Classes
- Dark theme: `bg-gray-800`, `bg-gray-900`
- Accent colors: `blue-600`, `purple-600`
- Interactive states: `hover:`, `group-hover:`
- Responsive: `sm:`, `lg:`, `xl:`

### Custom Animations
```css
@keyframes diagonal-sweep {
  0% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}
```

## Event Handling

### Mouse Events (Lasso Tool)
- `mousedown` - Start drawing, record first point
- `mousemove` - Track cursor, add points at intervals
- `mouseup` - Complete selection, create hotspot

### Hover Events (Config Tool)
- `onMouseEnter` - Highlight hotspot on map
- `onMouseLeave` - Remove highlight

## Performance Considerations

### Optimization Strategies
1. **Point sampling** - Only record every 3px to reduce polygon complexity
2. **Percentage coordinates** - Store bounding boxes as percentages for responsiveness
3. **LocalStorage caching** - Avoid re-parsing on every render
4. **Lazy loading** - Image selector loads list on mount, not per-render

### Potential Improvements
- Implement polygon simplification (Douglas-Peucker algorithm)
- Add virtual scrolling for large image lists
- Debounce localStorage writes
- Use IndexedDB for larger datasets

## Integration with Story Runtime

### Future Integration Pattern
```typescript
// In story runtime
import hotspots from './path/to/image.hotspots.json';

// Match click coordinates to hotspot polygons
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  // Ray casting algorithm
  // ...
}

// On image click
const clickedHotspot = hotspots.find(h =>
  isPointInPolygon(clickPoint, h.points)
);

if (clickedHotspot) {
  // Trigger clue discovery, dialogue, etc.
}
```

## Development Workflow

### Running the Editor
```bash
npm run dev
# Navigate to http://localhost:5174/editor.html
```

### Building for Production
```bash
npm run build
# Creates dist/editor.html and dist/index.html
```

### Adding New Images
Edit `src/features/editor/ImageSelector.tsx`:
```typescript
const availableImages: ImageInfo[] = [
  {
    path: '/path/to/image.png',
    name: 'Display Name',
    category: 'clues',
    bundle: 'story-bundle-name'
  },
  // ...
];
```

## Extensibility

### Adding New Tools
1. Add tool definition to `EditToolbar.tsx`
2. Handle tool state in `EditorApp.tsx`
3. Conditional render in `InteractiveMap.tsx`

### Adding Visual States
1. Add state to `HotspotState` type
2. Update `handleHotspotClick` in `InteractiveMap.tsx`
3. Add rendering logic in overlay section

### Backend Integration
Replace localStorage with API calls:
```typescript
// In EditorApp.tsx
const saveHotspot = async (hotspot: Hotspot) => {
  await fetch('/api/hotspots', {
    method: 'POST',
    body: JSON.stringify(hotspot)
  });
};
```

## Testing Strategy

### Manual Testing Checklist
- [ ] Draw hotspot with lasso tool
- [ ] Edit hotspot label
- [ ] Delete hotspot
- [ ] Export hotspots to JSON
- [ ] Import hotspots from JSON
- [ ] Switch between images (verify persistence)
- [ ] Clear all hotspots
- [ ] Hover over hotspot in list (verify highlight)
- [ ] Click hotspot polygon (verify state cycling)
- [ ] Filter images by category
- [ ] Filter images by bundle

### Future Automated Testing
- Unit tests for polygon algorithms
- Integration tests for state management
- E2E tests for drawing workflows

## Known Limitations

1. **No undo/redo** - Destructive operations can't be reversed
2. **Browser-only storage** - Data lost if localStorage cleared
3. **No collaboration** - Single-user editing only
4. **Fixed image list** - Must edit code to add images
5. **No polygon editing** - Can't modify existing polygons, only delete/recreate

## Future Enhancements

### Short Term
- [ ] Undo/Redo stack
- [ ] Polygon simplification
- [ ] Keyboard shortcuts
- [ ] Rectangle/circle drawing tools

### Long Term
- [ ] Backend API with database
- [ ] Real-time collaboration
- [ ] Image upload interface
- [ ] Hotspot animation editor
- [ ] Integration with story gameplay
- [ ] Analytics on hotspot interactions
