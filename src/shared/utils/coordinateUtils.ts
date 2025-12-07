/**
 * Coordinate Conversion Utilities
 *
 * Utilities for converting between pixel coordinates and percentage-based coordinates
 * for image hotspot annotations. This ensures hotspots remain perfectly aligned with
 * images regardless of display size or window resizing.
 */

import type { Point } from '../types/hotspot';

/**
 * Calculates the rendered dimensions and position of an image with object-contain behavior
 * @param containerWidth - Width of the container element
 * @param containerHeight - Height of the container element
 * @param naturalWidth - Natural width of the image
 * @param naturalHeight - Natural height of the image
 * @returns Object with width, height, left, and top positions in pixels
 */
export function calculateImageBounds(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number
): { width: number; height: number; left: number; top: number } {
  if (naturalWidth === 0 || naturalHeight === 0) {
    return { width: 0, height: 0, left: 0, top: 0 };
  }

  const containerAspect = containerWidth / containerHeight;
  const imageAspect = naturalWidth / naturalHeight;

  let displayWidth: number;
  let displayHeight: number;

  // Replicate object-contain behavior
  if (imageAspect > containerAspect) {
    // Image is wider - constrain by width
    displayWidth = containerWidth;
    displayHeight = containerWidth / imageAspect;
  } else {
    // Image is taller - constrain by height
    displayHeight = containerHeight;
    displayWidth = containerHeight * imageAspect;
  }

  // Center the image within the container
  const left = (containerWidth - displayWidth) / 2;
  const top = (containerHeight - displayHeight) / 2;

  return {
    width: displayWidth,
    height: displayHeight,
    left,
    top
  };
}

/**
 * Converts pixel coordinates to percentage coordinates relative to image dimensions
 * @param pixelX - X coordinate in pixels
 * @param pixelY - Y coordinate in pixels
 * @param imageWidth - Current display width of the image
 * @param imageHeight - Current display height of the image
 * @returns Point with x and y as percentages (0-100)
 */
export function pixelsToPercent(
  pixelX: number,
  pixelY: number,
  imageWidth: number,
  imageHeight: number
): Point {
  if (imageWidth === 0 || imageHeight === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (pixelX / imageWidth) * 100,
    y: (pixelY / imageHeight) * 100
  };
}

/**
 * Converts percentage coordinates to pixel coordinates relative to image dimensions
 * @param percentX - X coordinate as percentage (0-100)
 * @param percentY - Y coordinate as percentage (0-100)
 * @param imageWidth - Current display width of the image
 * @param imageHeight - Current display height of the image
 * @returns Point with x and y in pixels
 */
export function percentToPixels(
  percentX: number,
  percentY: number,
  imageWidth: number,
  imageHeight: number
): Point {
  return {
    x: (percentX / 100) * imageWidth,
    y: (percentY / 100) * imageHeight
  };
}

/**
 * Converts an array of pixel points to percentage points
 * @param points - Array of points in pixel coordinates
 * @param imageWidth - Current display width of the image
 * @param imageHeight - Current display height of the image
 * @returns Array of points as percentages (0-100)
 */
export function pointsToPercent(
  points: Point[],
  imageWidth: number,
  imageHeight: number
): Point[] {
  return points.map(point =>
    pixelsToPercent(point.x, point.y, imageWidth, imageHeight)
  );
}

/**
 * Converts an array of percentage points to pixel points
 * @param points - Array of points as percentages (0-100)
 * @param imageWidth - Current display width of the image
 * @param imageHeight - Current display height of the image
 * @returns Array of points in pixel coordinates
 */
export function pointsToPixels(
  points: Point[],
  imageWidth: number,
  imageHeight: number
): Point[] {
  return points.map(point =>
    percentToPixels(point.x, point.y, imageWidth, imageHeight)
  );
}

/**
 * Converts screen coordinates to image-relative coordinates
 * @param screenX - X coordinate relative to viewport
 * @param screenY - Y coordinate relative to viewport
 * @param imageBounds - DOMRect or bounds object with left, top, width, height
 * @returns Point relative to image top-left corner in pixels
 */
export function screenToImageCoords(
  screenX: number,
  screenY: number,
  imageBounds: { left: number; top: number; width: number; height: number }
): Point {
  return {
    x: screenX - imageBounds.left,
    y: screenY - imageBounds.top
  };
}

/**
 * Finds the midpoint of the longest continuous visible segment in a path
 * A visible segment is a sequence of consecutive points with opacity > 0
 * @param points - Array of path points
 * @param opacities - Array of opacity values per point (0-1), defaults to all visible
 * @returns The point index that represents the center of the longest visible segment
 */
export function findLongestVisibleSegmentMidpoint(
  points: Point[],
  opacities?: number[]
): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return 0;

  // If no opacities, treat all as visible - return middle
  if (!opacities || opacities.length === 0) {
    return Math.floor(points.length / 2);
  }

  // Ensure opacities array matches points length
  const normalizedOpacities = opacities.length === points.length
    ? opacities
    : points.map((_, i) => opacities[i] ?? 1);

  // Find all visible segments (continuous runs of opacity > 0)
  const segments: { start: number; end: number; length: number }[] = [];
  let segmentStart: number | null = null;

  for (let i = 0; i < normalizedOpacities.length; i++) {
    const isVisible = normalizedOpacities[i] > 0;

    if (isVisible && segmentStart === null) {
      // Start of a new visible segment
      segmentStart = i;
    } else if (!isVisible && segmentStart !== null) {
      // End of current visible segment
      segments.push({
        start: segmentStart,
        end: i - 1,
        length: i - segmentStart
      });
      segmentStart = null;
    }
  }

  // Handle segment that extends to the end
  if (segmentStart !== null) {
    segments.push({
      start: segmentStart,
      end: normalizedOpacities.length - 1,
      length: normalizedOpacities.length - segmentStart
    });
  }

  // If no visible segments, fall back to center
  if (segments.length === 0) {
    return Math.floor(points.length / 2);
  }

  // Find the longest segment
  let longestSegment = segments[0];
  for (const segment of segments) {
    if (segment.length > longestSegment.length) {
      longestSegment = segment;
    }
  }

  // Return the midpoint of the longest segment
  return Math.floor((longestSegment.start + longestSegment.end) / 2);
}
