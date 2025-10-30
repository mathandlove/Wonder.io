/**
 * Displays story images covering the full viewport space.
 * Images use background-size: cover for full-space coverage.
 *
 * Now simplified: captions are shown based on the scene's phase field.
 * - phase === "basic" (or undefined): caption hidden
 * - phase === "showCaption": caption visible
 */
import type { SceneProps } from "./registry";
import type { ImageScene } from "@core/types/scene";
import { resolveStoryImage } from "@core/data/imageResolver";
import Caption from "@features/caption/Caption";

export default function ImageScene({ scene }: SceneProps<ImageScene>) {
  // Support both 'text' (legacy) and 'caption' properties
  const captionText = scene.text || scene.caption;
  const hasCaption = captionText && captionText.trim() !== '';

  // Check phase to determine if caption should be shown
  const shouldShowCaption = scene.phase === "showCaption";

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

      {/* Show caption when scene has caption text and phase is showCaption */}
      {hasCaption && (
        <Caption
          text={captionText!}
          state={shouldShowCaption ? 'showing' : 'hidden'}
          align="bottom"
        />
      )}
    </div>
  );
}