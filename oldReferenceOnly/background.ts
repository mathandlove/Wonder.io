/**
 * Type definitions for the hybrid background system
 */

export interface SceneContent {
  type: string;
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  [key: string]: any;
}

export interface BackgroundRange {
  startIndex: number;
  endIndex: number;
  background: string;
  isImage?: boolean;
}