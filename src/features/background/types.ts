/**
 * Background feature type definitions
 * These types define the structure for background range calculation and positioning
 */

/**
 * Scene content structure for background range calculations
 * Represents the minimal scene properties needed for background logic
 */
export interface SceneContent {
  type: string;
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
}

/**
 * Background range definition
 * Represents a continuous range of scenes that share the same background
 */
export interface BackgroundRange {
  startIndex: number;
  endIndex: number;
  background: string;
  isImage: boolean; // True if background is 'comicBackground' (image type)
}
