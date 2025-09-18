/**
 * BackgroundLayer - Fixed background layer that sits behind all story content.
 * Owns background state and handles transitions. Mounted once at story root level.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { resolveBackgroundImage } from "../utils/imageResolver";

interface BackgroundLayerProps {
  backgroundId: string | null;
  transitionDuration?: number;
}

export function BackgroundLayer({
  backgroundId,
  transitionDuration = 300
}: BackgroundLayerProps) {
  const [currentBackground, setCurrentBackground] = useState<string | null>(backgroundId);
  const [nextBackground, setNextBackground] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const preloadedImages = useRef<Set<string>>(new Set());

  // Preload background image
  const preloadBackground = useCallback((bgId: string) => {
    if (preloadedImages.current.has(bgId)) return;

    const img = new Image();
    const imagePath = resolveBackgroundImage(bgId);
    img.src = imagePath;
    img.onload = () => {
      preloadedImages.current.add(bgId);
      console.log(`[BackgroundLayer] Preloaded: ${bgId}`);
    };
    img.onerror = () => {
      console.warn(`[BackgroundLayer] Failed to preload: ${bgId}`);
    };
  }, []);

  // Handle background changes with diff checking
  useEffect(() => {
    // If no change, do nothing (key optimization)
    if (backgroundId === currentBackground) {
      return;
    }

    console.log(`[BackgroundLayer] Background request: ${currentBackground} → ${backgroundId}`);

    // Only change background if we have a specific background requested
    // If backgroundId is null, maintain current background (no change)
    if (backgroundId && backgroundId.trim() !== '') {
      preloadBackground(backgroundId);
      setNextBackground(backgroundId);
      setIsTransitioning(true);

      // Complete transition after duration
      const timer = setTimeout(() => {
        setCurrentBackground(backgroundId);
        setNextBackground(null);
        setIsTransitioning(false);
      }, transitionDuration);

      return () => clearTimeout(timer);
    }

    // If backgroundId is null/empty, keep current background - no transition
    console.log(`[BackgroundLayer] No background specified, maintaining current: ${currentBackground}`);
  }, [backgroundId, currentBackground, transitionDuration, preloadBackground]);

  // Preload current background on mount
  useEffect(() => {
    if (backgroundId) {
      preloadBackground(backgroundId);
    }
  }, [backgroundId, preloadBackground]);

  const currentBackgroundUrl = currentBackground
    ? `url(${resolveBackgroundImage(currentBackground)})`
    : undefined;

  const nextBackgroundUrl = nextBackground
    ? `url(${resolveBackgroundImage(nextBackground)})`
    : undefined;

  // Debug logging
  if (currentBackground) {
    console.log(`[BackgroundLayer] Current background: "${currentBackground}" → URL: ${currentBackgroundUrl}`);
  }

  return (
    <>
      {/* Current Background Layer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: currentBackgroundUrl,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#f0f0f0",
          opacity: isTransitioning ? 0 : 1,
          transition: `opacity ${transitionDuration}ms ease-in-out`,
          zIndex: 0
        }}
      />

      {/* Next Background Layer (for transitions) */}
      {nextBackground && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage: nextBackgroundUrl,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: isTransitioning ? 1 : 0,
            transition: `opacity ${transitionDuration}ms ease-in-out`,
            zIndex: 1
          }}
        />
      )}
    </>
  );
}

export default BackgroundLayer;