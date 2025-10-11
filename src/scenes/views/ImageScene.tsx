/**
 * Displays story images covering the full viewport space.
 * Images use background-size: cover for full-space coverage.
 */
import React from "react";
import type { SceneProps } from "../registry";
import type { ImageScene } from "../../types/scene";
import { resolveStoryImage } from "../../utils/imageResolver";
import Caption from "../../components/image/Caption";
import { useSceneActive } from "../hooks/useSceneActive";

export default function ImageScene({ scene }: SceneProps<ImageScene>) {
  const { isActive, direction } = useSceneActive(scene.sceneId || '');
  const hasCaption = scene.text && scene.text.trim() !== '';


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
        alt={scene.caption || scene.text || "Story image"}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }}
      />
      {/* Always show caption - hasCaption check was hiding them */}
      <Caption
        text={scene.text || "Default caption text"}
        isActive={true}
        direction={direction}
        align="bottom"
      />
    </div>
  );
}