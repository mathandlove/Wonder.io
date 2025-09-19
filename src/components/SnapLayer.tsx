/**
 * SnapLayer - Handles programmatic scroll nudges only
 * No scroll math, no containers - just executes scrollIntoView when targetIndex changes
 */
import React, { createContext, useCallback, useContext, useEffect } from "react";
import { useNavigation } from "../context/NavigationContext";

/**
 * Type definitions for the SnapLayer API.
 * Provides programmatic scroll control only.
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
  railRef: React.RefObject<HTMLElement>;
  targetIndex?: number;
  setIsProgrammatic: (v: boolean) => void;
  currentIndex: number;
};

export function SnapLayer({ children, railRef, targetIndex, setIsProgrammatic, currentIndex }: SnapLayerProps) {
  const { registerSnapApi } = useNavigation();

  // Handle magnetic scroller target index changes
  useEffect(() => {
    if (targetIndex == null) return;

    // Scroll to the target position using window.scrollTo
    const targetY = targetIndex * window.innerHeight;
    setIsProgrammatic(true);
    window.scrollTo({
      top: targetY,
      behavior: 'smooth'
    });

    const t = setTimeout(() => {
      setIsProgrammatic(false);
    }, 500);
    return () => clearTimeout(t);
  }, [targetIndex, setIsProgrammatic]);

  // Programmatic scroll API
  const scrollTo = useCallback((index: number, opts?: ScrollToOptions) => {
    const targetY = index * window.innerHeight;
    setIsProgrammatic(true);
    window.scrollTo({
      top: targetY,
      behavior: opts?.behavior || "smooth"
    });

    const t = setTimeout(() => {
      setIsProgrammatic(false);
    }, 500);
  }, [setIsProgrammatic]);

  const getActiveIndex = useCallback(() => currentIndex, [currentIndex]);

  const api: SnapApi = { scrollTo, getActiveIndex };

  // Register API with NavigationProvider
  useEffect(() => {
    registerSnapApi(api);
  }, [registerSnapApi, api]);

  return (
    <SnapCtx.Provider value={api}>
      {children}
    </SnapCtx.Provider>
  );
}

// Simple wrapper component for content - no more SnapSlot needed
export function SnapSlot({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}