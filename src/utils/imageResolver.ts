/**
 * Utility functions for resolving image paths from multiple asset sources.
 * Supports both gingerbread.bundle and assets.core directories.
 */

/**
 * Resolves background image path, checking both asset locations
 */
export function resolveBackgroundImage(imageName: string): string {
  // First check if it's explicitly prefixed
  if (imageName.startsWith('assets.core/')) {
    return `/${imageName}`;
  }

  if (imageName.startsWith('gingerbread.bundle/')) {
    return `/stories/${imageName}`;
  }

  // For unprefixed images, try gingerbread.bundle first (primary source)
  // The browser will handle 404s gracefully, but ideally we'd check availability
  return `/stories/gingerbread.bundle/images/backgrounds/${imageName}`;
}

/**
 * Resolves story image path, checking both asset locations
 */
export function resolveStoryImage(imageName: string): string {
  // First check if it's explicitly prefixed
  if (imageName.startsWith('assets.core/')) {
    return `/${imageName}`;
  }

  if (imageName.startsWith('gingerbread.bundle/')) {
    return `/stories/${imageName}`;
  }

  // For unprefixed images, try gingerbread.bundle first (primary source)
  return `/stories/gingerbread.bundle/images/${imageName}`;
}

/**
 * Gets the full URL for a background image that might be in either asset location
 */
export function getBackgroundImageUrl(imageName: string): string {
  const imagePath = resolveBackgroundImage(imageName);
  return `url(${imagePath})`;
}