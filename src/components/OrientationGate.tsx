/**
 * OrientationGate - Blocks portrait orientation on mobile devices
 *
 * Shows a full-screen overlay prompting users to rotate their device
 * to landscape mode when in portrait orientation on mobile.
 *
 * Also initializes the useIsMobile hook to set the data-mobile attribute
 * on the document for CSS to use.
 */
import React, { useState, useEffect } from 'react';
import { useIsMobile, MOBILE_HEIGHT_THRESHOLD } from '@core/uiLayout/useIsMobile';
import './OrientationGate.css';

interface OrientationGateProps {
  children: React.ReactNode;
}

export const OrientationGate: React.FC<OrientationGateProps> = ({ children }) => {
  const [showBlocker, setShowBlocker] = useState(false);

  // Initialize mobile detection (sets data-mobile attribute on <html>)
  useIsMobile();

  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      // Use height threshold for consistency - in portrait, height > width
      // so we check if width (which becomes height in portrait) is mobile-sized
      const isMobileDevice = window.innerHeight <= MOBILE_HEIGHT_THRESHOLD || window.innerWidth < 768;
      setShowBlocker(isPortrait && isMobileDevice);
    };

    // Check on mount
    checkOrientation();

    // Listen for orientation and resize changes
    const portraitQuery = window.matchMedia('(orientation: portrait)');
    portraitQuery.addEventListener('change', checkOrientation);
    window.addEventListener('resize', checkOrientation);

    return () => {
      portraitQuery.removeEventListener('change', checkOrientation);
      window.removeEventListener('resize', checkOrientation);
    };
  }, []);

  return (
    <>
      {showBlocker && (
        <div className="orientation-blocker">
          <div className="orientation-blocker__content">
            <div className="orientation-blocker__icon">
              <svg
                viewBox="0 0 100 100"
                className="orientation-blocker__phone"
                aria-hidden="true"
              >
                {/* Phone body */}
                <rect
                  x="25" y="10"
                  width="50" height="80"
                  rx="8" ry="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                {/* Screen */}
                <rect
                  x="30" y="18"
                  width="40" height="56"
                  fill="currentColor"
                  opacity="0.3"
                />
                {/* Home button */}
                <circle
                  cx="50" cy="82"
                  r="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                {/* Rotation arrow */}
                <path
                  className="orientation-blocker__arrow"
                  d="M 85 50 A 35 35 0 0 1 50 85"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <polygon
                  className="orientation-blocker__arrow"
                  points="50,78 50,92 58,85"
                  fill="currentColor"
                />
              </svg>
            </div>
            <p className="orientation-blocker__text">
              Please rotate your device to landscape mode
            </p>
          </div>
        </div>
      )}
      {children}
    </>
  );
};

export default OrientationGate;
