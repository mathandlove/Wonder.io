import React, { useState, useEffect } from "react";

type Props = {
  show: boolean;
  text?: string; // default: "Your turn. What should LEO ask?"
};

export default function TurnCueBanner({ show, text }: Props) {
  const [isNudging, setIsNudging] = useState(false);
  const [hasStartedNudging, setHasStartedNudging] = useState(false);

  useEffect(() => {
    if (!show) {
      // Don't reset nudging state when banner hides temporarily
      return;
    }

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
  }, [show, hasStartedNudging]);

  if (!show) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="turn-cue-banner"
      data-testid="turn-cue-banner"
      data-nudged={isNudging}
    >
      <span className="turn-cue-strong">Your turn.</span>{" "}
      <span>{text ?? "What should LEO ask?"}</span>
    </div>
  );
}