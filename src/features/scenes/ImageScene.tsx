/**
 * Displays story images covering the full viewport space.
 * Images use background-size: cover for full-space coverage.
 */
import type { SceneProps } from "./registry";
import type { ImageScene } from "@core/types/scene";
import { resolveStoryImage } from "@core/data/imageResolver";
import Caption from "@features/image-scene/Caption";
import { useSceneStates } from "@core/scenes/SceneStates";
import type { ImageState } from "@core/dialogue/types";

export default function ImageScene({ scene }: SceneProps<ImageScene>) {
  // Support both 'text' (legacy) and 'caption' properties
  const captionText = scene.text || scene.caption;
  const hasCaption = captionText && captionText.trim() !== '';

  // Get caption state from SceneStates persistent cache
  const sceneStates = useSceneStates();
  const sceneId = (scene as ImageScene & { sceneId?: string }).sceneId;

  // Look up this scene's state from the persistent cache
  // This persists even after navigation moves past this scene
  const sceneState = sceneId ? sceneStates.getSceneState(sceneId) : undefined;

  // Extract caption state from scene state
  const captionState: ImageState =
    sceneState?.type === 'image'
      ? sceneState.state
      : 'hidden';

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
          objectFit: 'contain',
        }}
      />
      {/* Show caption when scene has caption text and state allows it */}
      {hasCaption && (
        <Caption
          text={captionText!}
          state={captionState}
          align="bottom"
        />
      )}
    </div>
  );
}