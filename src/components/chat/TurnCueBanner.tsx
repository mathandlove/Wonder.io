import React, { useState, useEffect } from "react";

type Props = {
  show: boolean;
  text?: string; // default: "Your turn. What should LEO ask?"
};

export default function TurnCueBanner({ show, text }: Props) {
  const [isNudging, setIsNudging] = useState(false);
  const [hasStartedNudging, setHasStartedNudging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsFadingOut(false);

      // Only start nudging if we haven't started yet
      if (!hasStartedNudging) {
        const nudgeTimer = setTimeout(() => {
          setIsNudging(true);
          setHasStartedNudging(true);
        }, 500);

        return () => {
          clearTimeout(nudgeTimer);
        };
      } else {
        // Resume nudging immediately if we've already started
        setIsNudging(true);
      }
    } else {
      // Start fade out animation
      setIsFadingOut(true);
      setIsNudging(false);

      // Hide after fade out completes
      const fadeTimer = setTimeout(() => {
        setIsVisible(false);
        setIsFadingOut(false);
      }, 300); // Match CSS transition duration

      return () => {
        clearTimeout(fadeTimer);
      };
    }
  }, [show, hasStartedNudging]);

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`turn-cue-banner ${isFadingOut ? 'fade-out' : ''}`}
      data-testid="turn-cue-banner"
      data-nudged={isNudging}
    >
      <span className="turn-cue-strong">Your turn.</span>{" "}
      <span>{text ?? "What should LEO ask?"}</span>
    </div>
  );
}