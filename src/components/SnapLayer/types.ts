/**
 * Type definitions for the SnapLayer API.
 * Provides programmatic scroll control and active index tracking.
 */
export type SnapApi = {
  scrollTo: (index: number, opts?: ScrollToOptions) => void;
  getActiveIndex: () => number;
};