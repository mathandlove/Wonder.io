/**
 * Displays story images covering the full viewport space.
 * Images use background-size: cover for full-space coverage.
 */
import React from "react";
import type { SceneProps } from "../registry";
import type { ImageScene } from "@core/types/scene";
import { resolveStoryImage } from "@shared/utils/imageResolver";
import Caption from "@features/image-scene/Caption";
import { useSceneOrchestratorContext } from "@core/scroll/SceneOrchestratorContext";

export default function ImageScene({ scene }: SceneProps<ImageScene>) {
  // Support both 'text' (legacy) and 'caption' properties
  const captionText = scene.text || scene.caption;
  const hasCaption = captionText && captionText.trim() !== '';

  // Get caption state from orchestrator
  const orchestrator = useSceneOrchestratorContext();
  const sceneId = scene.sceneId;
  const captionState = sceneId && orchestrator ? orchestrator.getCaptionState(sceneId) : undefined;

  console.log(`📸 ImageScene render:`, {
    sceneId,
    hasCaption,
    captionState,
    orchestratorExists: !!orchestrator,
    captionText: captionText?.substring(0, 30)
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
      {/* Show caption when scene has caption text and state allows it */}
      {hasCaption && (
        <Caption
          text={captionText!}
          state={captionState || 'hidden'}
          align="bottom"
        />
      )}
    </div>
  );
}