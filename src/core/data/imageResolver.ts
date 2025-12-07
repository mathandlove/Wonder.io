/**
 * Utility functions for resolving image paths from story bundles.
 */

/**
 * Resolves background image path from the story bundle
 */
export function resolveBackgroundImage(imageName: string): string {
  // Check if it's already a full path
  if (imageName.startsWith('/') || imageName.startsWith('stories/')) {
    return imageName.startsWith('/') ? imageName : `/${imageName}`;
  }

  if (imageName.startsWith('gingerbread.bundle/')) {
    return `/stories/${imageName}`;
  }

  // For unprefixed images, use gingerbread.bundle
  return `/stories/gingerbread.bundle/images/backgrounds/${imageName}`;
}

/**
 * Resolves story image path from the story bundle
 */
export function resolveStoryImage(imageName: string): string {
  // Check if it's already a full path
  if (imageName.startsWith('/') || imageName.startsWith('stories/')) {
    return imageName.startsWith('/') ? imageName : `/${imageName}`;
  }

  if (imageName.startsWith('gingerbread.bundle/')) {
    return `/stories/${imageName}`;
  }

  // For unprefixed images, use gingerbread.bundle
  return `/stories/gingerbread.bundle/images/${imageName}`;
}

/**
 * Gets the full URL for a background image
 */
export function getBackgroundImageUrl(imageName: string): string {
  const imagePath = resolveBackgroundImage(imageName);
  return `url(${imagePath})`;
}
