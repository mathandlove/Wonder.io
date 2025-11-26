/**
 * Hotspot Type Definitions
 *
 * These types define the shape of hotspot data for image annotation.
 * Used by both the editor and the story application.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Selection {
  id: string;
  points: Point[];
  createdAt: string;
  mapId?: string; // For future multi-map support
}

export interface Hotspot {
  id: string;
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
  width: number; // Percentage (0-100)
  height: number; // Percentage (0-100)
  label: string;
  description?: string;
  lassoSelectionId?: string;
  points?: Point[]; // Polygon vertices as percentages (0-100) relative to image dimensions
  createdAt: string;
  mapId?: string; // Image identifier
  imageUrl?: string; // Path to the image being annotated
}

export interface MapPath {
  id: string;
  points: Point[]; // Path vertices as percentages (0-100) relative to image dimensions
  orderNumber: number; // 1, 2, 3, etc. for labeling
  createdAt: string;
  mapId?: string;
}

export type HotspotState = 'none' | 'colored' | 'glimmer';
