/**
 * Displays story images covering the full viewport space.
 * Images use background-size: cover for full-space coverage.
 */
import React from "react";
import type { SceneProps } from "../registry";
import type { ImageScene } from "../../types/scene";
import { resolveStoryImage } from "../../utils/imageResolver";

export default function ImageScene({ scene }: SceneProps<ImageScene>) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: -1
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
    </div>
  );
}