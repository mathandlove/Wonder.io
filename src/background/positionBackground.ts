/**
 * Position background ranges using 3-state transform logic from original main branch
 */
import type { BackgroundRange } from '../types/background';

export function translateForRange(range: BackgroundRange, scrollOffset: number): string {
  // Add tolerance for small scroll offsets near boundaries to prevent jitter
  const tolerance = 0.1;

  // Position calculation

  if (scrollOffset < range.startIndex - tolerance) {
    // Background is waiting below (not reached yet)
    return `translateY(${(range.startIndex - scrollOffset) * 100}vh)`;
  } else if (scrollOffset > range.endIndex + 1 + tolerance) {
    // Background has scrolled up and away
    return `translateY(${(range.endIndex + 1 - scrollOffset) * 100}vh)`;
  } else {
    // Background is visible and fixed in place
    return 'translateY(0)';
  }
}