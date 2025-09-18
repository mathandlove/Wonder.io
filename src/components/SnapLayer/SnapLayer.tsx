/**
 * Provides snap-scroll functionality with invisible scroll rail.
 * SnapLayer creates a scroll container, SnapSlot creates 100vh sections,
 * and useSnapApi provides programmatic scroll control.
 */
// src/components/SnapLayer/SnapLayer.tsx
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { SnapApi } from "./types";
import { useNavigation } from "../../context/NavigationContext";

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

  // Observe slots entering viewport
  // useEffect(() => {
  //   const container = containerRef.current;
  //   if (!container) return;

  //   const slots = Array.from(container.querySelectorAll<HTMLElement>("[data-snap-slot-index]"));
  //   const io = new IntersectionObserver(
  //     (entries) => {
  //       // Pick the most visible entry
  //       let best: { idx: number; ratio: number } | null = null;

  //       for (const e of entries) {
  //         const idx = Number(e.target.getAttribute("data-snap-slot-index") ?? -1);
  //         const ratio = e.intersectionRatio;
  //         if (!best || ratio > best.ratio) best = { idx, ratio };
  //       }

  //       if (best && best.idx !== active) {
  //         console.log(`[SnapLayer] IntersectionObserver changing active from ${active} to ${best.idx}`);
  //         setActive(best.idx);
  //         onSnapChange?.(best.idx);
  //       }
  //     },
  //     { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] }
  //   );

  //   slots.forEach((el) => io.observe(el));
  //   return () => io.disconnect();
  // }, [onSnapChange, active]);

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