/**
 * Displays story images covering the full viewport space.
 * Images use background-size: cover for full-space coverage.
 *
 * Phase is read from navigationStore node.phase (single source of truth):
 * - phase === 'image_only': caption hidden
 * - phase === 'caption': caption visible
 */
import type { SceneProps } from "@features/scenes/registry";
import type { ImageScene as ImageSceneType } from "@core/types/scene";
import type { ImageState } from "@core/dialogue/types";
import { resolveStoryImage } from "@core/data/imageResolver";
import { useNavigationStore } from "@core/navigation/navigationStore";
import "./ImageScene.css";

/**
 * Caption Component - Inline caption overlay with construction paper background
 */
function Caption({ text, state, align = 'bottom' }: { text: string; state: ImageState; align?: "center" | "bottom" }) {
  // Map ImageState to CSS class
  // hidden: no animation, invisible (below viewport)
  // showing: animate in (slide up with construction paper), stays visible
  const stateClass =
    state === 'showing' ? 'caption--animate-in' :
    'caption--hidden';

  return (
    <div
      className={`caption ${stateClass} ${align === 'center' ? 'caption--center' : ''}`}
    >
      <p className="caption__text">{text}</p>
    </div>
  );
}

export default function ImageScene({ scene, nodeId }: SceneProps<ImageSceneType>) {
  // Get THIS node's phase from navigationStore (source of truth)
  // Use the nodeId prop if provided, otherwise fall back to currentId for backwards compatibility
  const currentNodeId = useNavigationStore(state => state.currentId);
  const effectiveNodeId = nodeId || currentNodeId;
  const nodePhase = useNavigationStore(state =>
    effectiveNodeId ? state.graph.byId[effectiveNodeId]?.phase : undefined
  );

  // Support both 'text' (legacy) and 'caption' properties
  const captionText = scene.text || scene.caption;
  const hasCaption = captionText && captionText.trim() !== '';

  // Check phase to determine if caption should be shown
  // Phase comes from navigationStore node.phase (managed by XState imageSceneMachine)
  const shouldShowCaption = nodePhase === 'caption';

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