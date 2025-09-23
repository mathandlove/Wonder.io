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
      console.log('goToNext called (stub)');
    },
    setScrollingEnabled: (enabled: boolean) => {
      // Stub implementation
      console.log('setScrollingEnabled called (stub):', enabled);
    },
  };
}