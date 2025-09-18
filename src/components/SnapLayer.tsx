/**
 * Provides snap-scroll functionality with invisible scroll rail.
 * SnapLayer creates a scroll container, SnapSlot creates 100vh sections,
 * and useSnapApi provides programmatic scroll control.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigation } from "../context/NavigationContext";

/**
 * Type definitions for the SnapLayer API.
 * Provides programmatic scroll control and active index tracking.
 */
export type SnapApi = {
  scrollTo: (index: number, opts?: ScrollToOptions) => void;
  getActiveIndex: () => number;
};

const SnapCtx = createContext<SnapApi | null>(null);

export function useSnapApi(): SnapApi {
  const ctx = useContext(SnapCtx);
  if (!ctx) throw new Error("useSnapApi must be used within <SnapLayer>");
  return ctx;
}

type SnapLayerProps = {
  children: React.ReactNode;
  onSnapChange?: (index: number) => void;
  className?: string;
};

export function SnapLayer({ children, onSnapChange, className }: SnapLayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const { registerSnapApi } = useNavigation();

  console.log(`[SnapLayer] Render - active: ${active}`);

  // Observe slots entering viewport with snap-aware debouncing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const slots = Array.from(container.querySelectorAll<HTMLElement>("[data-snap-slot-index]"));
    console.log(`[SnapLayer] Setting up IntersectionObserver for ${slots.length} slots`);

    let debounceTimer: NodeJS.Timeout;
    let isSnapping = false;

    // Listen for scroll events to detect when snap animations are happening
    const handleScroll = () => {
      isSnapping = true;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        isSnapping = false;
      }, 200); // Wait for snap animation to complete
    };

    const io = new IntersectionObserver(
      (entries) => {
        // Don't update during snap animations to avoid conflicts
        if (isSnapping) return;

        // Clear previous debounce
        clearTimeout(debounceTimer);

        // Debounce the intersection changes
        debounceTimer = setTimeout(() => {
          // Pick the most visible entry (must be at least 80% visible for snap alignment)
          let best: { idx: number; ratio: number } | null = null;

          for (const e of entries) {
            const idx = Number(e.target.getAttribute("data-snap-slot-index") ?? -1);
            const ratio = e.intersectionRatio;

            // Use higher threshold to ensure we're truly snapped to this scene
            if (ratio >= 0.8 && (!best || ratio > best.ratio)) {
              best = { idx, ratio };
            }
          }

          if (best && best.idx !== active) {
            console.log(`[SnapLayer] Scene snapped to ${best.idx} (ratio: ${best.ratio})`);
            setActive(best.idx);
            onSnapChange?.(best.idx);
          }
        }, 150); // Longer debounce to let snap settle
      },
      {
        root: container,
        threshold: [0.8, 0.9, 1], // High thresholds for snap alignment
        rootMargin: '0px' // No margin for precise snap detection
      }
    );

    container.addEventListener('scroll', handleScroll);
    slots.forEach((el) => io.observe(el));

    return () => {
      clearTimeout(debounceTimer);
      container.removeEventListener('scroll', handleScroll);
      io.disconnect();
    };
  }, [onSnapChange, active]);

  const scrollTo = useCallback((index: number, opts?: ScrollToOptions) => {
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-snap-slot-index="${index}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start", ...opts });
  }, []);

  const getActiveIndex = useCallback(() => active, [active]);

  const api: SnapApi = { scrollTo, getActiveIndex };

  // Register API with NavigationProvider
  useEffect(() => {
    registerSnapApi(api);
  }, [registerSnapApi, api]);

  return (
    <div
      ref={containerRef}
      className={className ?? "snap-layer"}
      style={{
        height: "100vh",
        overflowY: "auto",
        scrollSnapType: "y mandatory",
      }}
    >
      <SnapCtx.Provider value={api}>{children}</SnapCtx.Provider>
    </div>
  );
}

type SnapSlotProps = {
  index: number;
  estimateHeight?: number;
  children?: React.ReactNode;
  className?: string;
};

export function SnapSlot({ index, estimateHeight, children, className }: SnapSlotProps) {
  return (
    <section
      data-snap-slot-index={index}
      className={className ?? "snap-slot"}
      style={{
        minHeight: estimateHeight ?? "100vh",
        scrollSnapAlign: "start",
        position: "relative",
      }}
    >
      {children}
    </section>
  );
}