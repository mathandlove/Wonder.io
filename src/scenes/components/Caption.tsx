import React, { useEffect, useRef, useState } from "react";
import "./Caption.css";

type CaptionProps = {
  text: string;
  isActive: boolean; // driven by scene manager enter/leave
  direction: 'forward' | 'backward';
  align?: "center" | "bottom";
};

export default function Caption({ text, isActive, direction, align = "bottom" }: CaptionProps) {
  const [phase, setPhase] = useState<'pre' | 'entering' | 'leaving'>('pre');
  const [shouldBeVisible, setShouldBeVisible] = useState(false);
  const wasActiveRef = useRef(false);
  const visibilityTimeoutRef = useRef<number>();

  useEffect(() => {
    const wasActive = wasActiveRef.current;
    console.log(`[CAPTION] Scene transition - isActive: ${isActive}, wasActive: ${wasActive}, current phase: ${phase}, direction: ${direction}`);

    // Clear any pending visibility timeout
    if (visibilityTimeoutRef.current) {
      clearTimeout(visibilityTimeoutRef.current);
      visibilityTimeoutRef.current = undefined;
    }

    if (isActive) {
      // Entering: make visible immediately, then animate
      console.log(`[CAPTION] Setting phase to 'pre' then 'entering'`);
      setShouldBeVisible(true);
      setPhase('pre');
      const id = requestAnimationFrame(() => {
        console.log(`[CAPTION] Setting phase to 'entering'`);
        setPhase('entering');
      });
      wasActiveRef.current = isActive;
      return () => cancelAnimationFrame(id);
    } else if (wasActive) {
      // Leaving: start exit animation, delay hiding until animation completes
      console.log(`[CAPTION] Setting phase to 'leaving'`);
      setPhase('leaving');

      // Keep visible during exit animation, then hide
      visibilityTimeoutRef.current = setTimeout(() => {
        console.log(`[CAPTION] Setting phase back to 'pre' and hiding after animation`);
        setPhase('pre');
        setShouldBeVisible(false);
      }, 600); // Match CSS transition duration

      wasActiveRef.current = isActive;
      return () => {
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
          visibilityTimeoutRef.current = undefined;
        }
      };
    } else {
      // Not active and wasn't active: hide immediately
      console.log(`[CAPTION] Staying in 'pre' phase and hidden`);
      setPhase('pre');
      setShouldBeVisible(false);
      wasActiveRef.current = isActive;
    }
  }, [isActive, direction]);

  // Determine animation class based on phase and direction
  let animationClass = direction === 'backward' ? "caption--pre-reverse" : "caption--pre";
  if (phase === 'leaving') {
    animationClass = direction === 'backward' ? "caption--animate-out-reverse" : "caption--animate-out";
  } else if (phase === 'entering') {
    animationClass = "caption--animate-in";
  }

  return (
    <div
      className={[
        "caption",
        `caption--${align}`,
        shouldBeVisible ? "is-active" : "is-inactive",
        animationClass
      ].join(" ")}
      aria-hidden={!shouldBeVisible}
    >
      <div className="caption__paper">
        <p className="caption__text">{text}</p>
      </div>
    </div>
  );
}