/**
 * BackgroundLayer - Transform-controlled background layer driven by scroll offset
 * Drives background transitions purely from continuous scrollOffset
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { resolveBackgroundImage } from '@core/data/imageResolver';
import type { Scene } from '@core/types/scene';

interface BackgroundLayerProps {
  scrollOffset: number;
  scenes: Scene[];
  transitionDuration?: number;
}

export function BackgroundLayer({
  scrollOffset,
  scenes,
  transitionDuration = 300
}: BackgroundLayerProps) {
  const [preloadedImages] = useState(() => new Set<string>());

  // Preload background image
  const preloadBackground = useCallback((bgId: string) => {
    if (preloadedImages.has(bgId)) return;

    const img = new Image();
    const imagePath = resolveBackgroundImage(bgId);
    img.src = imagePath;
    img.onload = () => {
      preloadedImages.add(bgId);
    };
    img.onerror = () => {
    };
  }, [preloadedImages]);

  // Get current and next background based on scroll offset
  const currentIndex = Math.floor(scrollOffset);
  const nextIndex = currentIndex + 1;
  const progress = scrollOffset - currentIndex;

  const currentScene = scenes[currentIndex];
  const nextScene = scenes[nextIndex];

  const currentBackgroundId = currentScene?.backgroundId;
  const nextBackgroundId = nextScene?.backgroundId;

  // Preload backgrounds as needed
  useEffect(() => {
    if (currentBackgroundId) preloadBackground(currentBackgroundId);
    if (nextBackgroundId) preloadBackground(nextBackgroundId);
  }, [currentBackgroundId, nextBackgroundId, preloadBackground]);

  const currentBackgroundUrl = currentBackgroundId
    ? `url(${resolveBackgroundImage(currentBackgroundId)})`
    : undefined;

  const nextBackgroundUrl = nextBackgroundId
    ? `url(${resolveBackgroundImage(nextBackgroundId)})`
    : undefined;

  // Only show transition if we have different backgrounds and are mid-scroll
  const showTransition = nextBackgroundId && currentBackgroundId !== nextBackgroundId && progress > 0;

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
          transform: showTransition ? `translateY(-${progress * 100}%)` : "translateY(0)",
          zIndex: 0
        }}
      />

      {/* Next Background Layer (scrolls up from bottom) */}
      {showTransition && (
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
            transform: `translateY(${(1 - progress) * 100}%)`,
            zIndex: 1
          }}
        />
      )}
    </>
  );
}

export default BackgroundLayer;