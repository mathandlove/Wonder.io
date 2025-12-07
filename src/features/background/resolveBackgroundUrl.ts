/**
 * Resolve background URLs for story bundles
 */

export function resolveBackgroundUrl(background: string, isImage: boolean = false, storyId?: string): string {
  if (isImage) {
    return `url('/VisualAssets/comicBackground.png')`;
  }

  // Check if background already contains a full path
  const isFullPath = background.startsWith('/') || background.startsWith('stories/');

  let storyPath: string;

  if (isFullPath) {
    // Background already contains full path, just prepend with root slash if needed
    storyPath = background.startsWith('/') ? background : `/${background}`;
  } else {
    // Background is just a filename, build full path to bundle
    storyPath = storyId
      ? `/stories/${storyId}.bundle/images/backgrounds/${background}`
      : `/stories/gingerbread.bundle/images/backgrounds/${background}`;
  }

  return `url('${storyPath}')`;
}
