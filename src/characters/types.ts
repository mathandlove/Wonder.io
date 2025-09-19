export type PanelSide = 'left' | 'right';

export interface PanelStateLite {
  visible: boolean;
  character?: string | null;
  pose?: string | null;
  speaking?: boolean;
}

export interface PanelRange {
  startIndex: number;
  endIndex: number; // inclusive
  left?: PanelStateLite;
  right?: PanelStateLite;
  allowFullBleed?: boolean; // scenes in this range can opt out of gutters
}