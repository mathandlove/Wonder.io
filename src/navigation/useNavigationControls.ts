/**
 * useNavigationControls stub - minimal implementation for compilation
 */

export interface NavigationControls {
  goToNext: () => void;
  setScrollingEnabled: (enabled: boolean) => void;
  // Additional navigation controls can be added later
}

export function useNavigationControls(): NavigationControls {
  return {
    goToNext: () => {
      // Stub implementation
    },
    setScrollingEnabled: (enabled: boolean) => {
      // Stub implementation
    },
  };
}