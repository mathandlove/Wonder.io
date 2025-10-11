/**
 * Displays story images covering the full viewport space.
 * Images use background-size: cover for full-space coverage.
 */
import React from "react";
import type { SceneProps } from "../registry";
import type { ImageScene } from "@core/types/scene";
import { resolveStoryImage } from "@shared/utils/imageResolver";
import Caption from "@features/image-scene/Caption";
import { useSceneActive } from "../hooks/useSceneActive";

export default function ImageScene({ scene }: SceneProps<ImageScene>) {
  const { isActive, direction } = useSceneActive(scene.sceneId || '');
  // Support both 'text' (legacy) and 'caption' properties
  const captionText = scene.text || scene.caption;
  const hasCaption = captionText && captionText.trim() !== '';

  // Debug logging
  console.log('ImageScene render:', {
    sceneId: scene.sceneId,
    hasCaption,
    text: scene.text,
    caption: scene.caption,
    captionText,
    isActive,
    direction
  });

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <img
        src={resolveStoryImage(scene.image)}
        alt={scene.caption || "Story image"}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }}
      />
      {/* Show caption when scene has caption text */}
      {hasCaption && (
        <Caption
          text={captionText!}
          isActive={isActive}
          direction={direction}
          align="bottom"
        />
      )}
    </div>
  );
}