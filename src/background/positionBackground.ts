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
    const distance = range.startIndex - scrollOffset;
    // Snap to 100vh if distance is very close to 1
    const translateY = Math.abs(distance - 1) < 0.02 ? 100 : distance * 100;
    return `translateY(${translateY}vh)`;
  } else if (scrollOffset > range.endIndex + 1 + tolerance) {
    // Background has scrolled up and away
    return `translateY(${(range.endIndex + 1 - scrollOffset) * 100}vh)`;
  } else {
    // Background is visible and fixed in place
    return 'translateY(0)';
  }
}