import React, { useEffect, useRef, useState } from "react";
import "./Caption.css";

type CaptionProps = {
  text: string;
  isActive: boolean; // driven by scene manager enter/leave
  align?: "center" | "bottom";
};

export default function Caption({ text, isActive, align = "bottom" }: CaptionProps) {
  const [phase, setPhase] = useState<'pre' | 'entering' | 'leaving'>('pre');
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const wasActive = wasActiveRef.current;
    console.log(`[CAPTION] Scene transition - isActive: ${isActive}, wasActive: ${wasActive}, current phase: ${phase}`);

    if (isActive) {
      // Entering: reset to pre, then animate in
      console.log(`[CAPTION] Setting phase to 'pre' then 'entering'`);
      setPhase('pre');
      const id = requestAnimationFrame(() => {
        console.log(`[CAPTION] Setting phase to 'entering'`);
        setPhase('entering');
      });
      wasActiveRef.current = isActive; // Update ref after processing
      return () => cancelAnimationFrame(id);
    } else if (wasActive) {
      // Leaving: set phase to leaving first, then reset to pre after animation
      console.log(`[CAPTION] Setting phase to 'leaving'`);
      setPhase('leaving');
      const timeout = setTimeout(() => {
        console.log(`[CAPTION] Setting phase back to 'pre' after animation`);
        setPhase('pre');
      }, 600); // Match CSS transition duration (600ms ease-out)
      wasActiveRef.current = isActive; // Update ref after processing
      return () => clearTimeout(timeout);
    } else {
      // Not active and wasn't active: stay in pre state
      console.log(`[CAPTION] Staying in 'pre' phase`);
      setPhase('pre');
      wasActiveRef.current = isActive; // Update ref after processing
    }
  }, [isActive]);

  // Determine animation class based on phase
  let animationClass = "caption--pre";
  if (phase === 'leaving') {
    animationClass = "caption--animate-out";
  } else if (phase === 'entering') {
    animationClass = "caption--animate-in";
  }

  // Component should be visible during entering and leaving phases
  const shouldBeVisible = isActive || phase === 'leaving';

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