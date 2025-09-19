/**
 * Resolve background URLs with fallback strategy from original main branch
 */

export function resolveBackgroundUrl(background: string, isImage: boolean = false, storyId?: string): string {
  if (isImage) {
    return `url('/VisualAssets/comicBackground.png')`;
  }

  // Check if background already contains a full path (starts with assets.core or other path indicators)
  const isFullPath = background.startsWith('assets.core/') || background.startsWith('/');

  let storyPath: string;
  let corePath: string;

  if (isFullPath) {
    // Background already contains full path, just prepend with root slash if needed
    const normalizedPath = background.startsWith('/') ? background : `/${background}`;
    storyPath = normalizedPath;
    corePath = normalizedPath;
  } else {
    // Background is just a filename, build full paths
    storyPath = storyId ? `/stories/${storyId}.bundle/images/backgrounds/${background}` : `/stories/gingerbread.bundle/images/backgrounds/${background}`;
    corePath = `/assets.core/images/backgrounds/${background}`;
  }

  const result = `url('${storyPath}'), url('${corePath}')`;

  // Debug square.png URL resolution
  if (background.includes('square.png')) {
    console.log(`🔧 SQUARE.PNG URL DEBUG:`);
    console.log(`   Input background: ${background}`);
    console.log(`   IsFullPath: ${isFullPath}`);
    console.log(`   StoryId: ${storyId}`);
    console.log(`   Story path: ${storyPath}`);
    console.log(`   Core path: ${corePath}`);
    console.log(`   Final result: ${result}`);
  }

  return result;
}