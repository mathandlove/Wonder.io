import { useState, useEffect } from 'react';

export const MOBILE_HEIGHT_THRESHOLD = 450;

/**
 * Hook to detect mobile devices based on viewport height.
 * Uses height (not width) because limited vertical space is what matters
 * for UI layout decisions like speech bubble positioning.
 *
 * Triggers on phones in landscape (typically 350-430px height).
 *
 * Also sets a `data-mobile` attribute on <html> for CSS to use:
 * - html[data-mobile="true"] { ... }
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerHeight <= MOBILE_HEIGHT_THRESHOLD);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerHeight <= MOBILE_HEIGHT_THRESHOLD;
      setIsMobile(mobile);
      document.documentElement.setAttribute('data-mobile', String(mobile));
    };

    // Set initial value
    document.documentElement.setAttribute('data-mobile', String(isMobile));

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  return isMobile;
}
