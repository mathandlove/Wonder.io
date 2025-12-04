/**
 * Hotspot Data Loader
 *
 * Loads and parses hotspot JSON data for clue-image scenes.
 * Hotspot files define clickable polygon regions mapped to image coordinates.
 */

export interface HotspotPoint {
  x: number;
  y: number;
}

export interface Hotspot {
  id: string;
  x: number; // Bounding box x (percentage)
  y: number; // Bounding box y (percentage)
  width: number; // Bounding box width (percentage)
  height: number; // Bounding box height (percentage)
  label: string; // Human-readable label (e.g., "Hair", "Potion")
  description?: string;
  points: HotspotPoint[]; // Polygon coordinates (percentage)
  createdAt: string;
  mapId: string;
  imageUrl: string;
}

export interface HotspotData {
  version: string;
  imagePath: string;
  hotspots: Hotspot[];
  lastModified: string;
}

/**
 * Load hotspot data for a clue image
 * @param imageName - The base name of the image (e.g., "insideBakery")
 * @param storyPath - Path to story bundle (e.g., "/stories/gingerbread.bundle")
 * @returns Parsed hotspot data
 */
export async function loadHotspotData(
  imageName: string,
  storyPath: string = "/stories/gingerbread.bundle"
): Promise<HotspotData> {
  // imageName should already have extension stripped by caller
  const hotspotPath = `${storyPath}/images/hotspots/cluesColored_${imageName}.json`;

  try {
    const response = await fetch(hotspotPath);
    if (!response.ok) {
      throw new Error(`Failed to load hotspot data: ${response.statusText}`);
    }

    const data: HotspotData = await response.json();

    // Validate required fields
    if (!data.hotspots || !Array.isArray(data.hotspots)) {
      throw new Error('Invalid hotspot data: missing hotspots array');
    }

    return data;
  } catch (error) {
    console.error(`[HotspotLoader] Error loading ${hotspotPath}:`, error);
    throw error;
  }
}

/**
 * Get hotspot by label
 * @param hotspots - Array of hotspots
 * @param label - The label to search for (case-insensitive)
 * @returns The matching hotspot or undefined
 */
export function getHotspotByLabel(
  hotspots: Hotspot[],
  label: string
): Hotspot | undefined {
  return hotspots.find(
    h => h.label.toLowerCase() === label.toLowerCase()
  );
}

/**
 * Calculate the center point of a hotspot's bounding box
 * @param hotspot - The hotspot
 * @returns Center point as {x, y} percentages
 */
export function getHotspotCenter(hotspot: Hotspot): { x: number; y: number } {
  return {
    x: hotspot.x + hotspot.width / 2,
    y: hotspot.y + hotspot.height / 2,
  };
}

/**
 * Convert hotspot polygon points to SVG path string
 * @param points - Array of points with x, y percentages
 * @returns SVG path data string
 */
export function pointsToSVGPath(points: HotspotPoint[]): string {
  if (points.length === 0) return '';

  const pathParts = points.map((point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${command} ${point.x} ${point.y}`;
  });

  pathParts.push('Z'); // Close path
  return pathParts.join(' ');
}

/**
 * Calculate optimal dialog position relative to hotspot
 * Checks available space in all four directions and returns the best position
 * @param hotspot - The hotspot to position relative to
 * @param viewportWidth - Viewport width in pixels
 * @param viewportHeight - Viewport height in pixels
 * @param dialogWidth - Dialog bubble width in pixels
 * @param dialogHeight - Dialog bubble height in pixels
 * @returns Position ('top', 'bottom', 'left', 'right')
 */
export function calculateDialogPosition(
  hotspot: Hotspot,
  viewportWidth: number,
  viewportHeight: number,
  dialogWidth: number,
  dialogHeight: number
): 'top' | 'bottom' | 'left' | 'right' {
  // Convert percentage coordinates to pixels
  const centerX = (hotspot.x + hotspot.width / 2) * viewportWidth / 100;
  const centerY = (hotspot.y + hotspot.height / 2) * viewportHeight / 100;
  const hotspotWidthPx = hotspot.width * viewportWidth / 100;
  const hotspotHeightPx = hotspot.height * viewportHeight / 100;

  // Calculate available space in each direction (from edge of hotspot)
  const spaceTop = centerY - hotspotHeightPx / 2;
  const spaceBottom = viewportHeight - (centerY + hotspotHeightPx / 2);
  const spaceLeft = centerX - hotspotWidthPx / 2;
  const spaceRight = viewportWidth - (centerX + hotspotWidthPx / 2);

  // Find direction with most space
  const spaces = [
    { direction: 'top' as const, space: spaceTop, required: dialogHeight },
    { direction: 'bottom' as const, space: spaceBottom, required: dialogHeight },
    { direction: 'left' as const, space: spaceLeft, required: dialogWidth },
    { direction: 'right' as const, space: spaceRight, required: dialogWidth },
  ];

  // Sort by available space (descending)
  spaces.sort((a, b) => b.space - a.space);

  // Return direction with most space (if sufficient), otherwise default to top
  return spaces[0].space >= spaces[0].required ? spaces[0].direction : 'top';
}
