export interface Point {
  x: number;
  y: number;
}

export interface Selection {
  id: string;
  points: Point[];
  createdAt: Date;
  mapId?: string; // For future multi-map support
}

export interface Hotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  description?: string;
  lassoSelectionId?: string;
  points?: Point[];
  createdAt: Date;
  mapId?: string;
}