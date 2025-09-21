/**
 * Displays character dialogue scenes with speaker identification.
 * Shows text in a speech bubble with character name and background.
 * Also shows a sticky "waiting" peek bubble at the bottom when an AI reply is pending.
 */
import type { SceneProps } from "../registry";
import type { CharacterScene as CharacterSceneType } from "../../types/scene";
import { WaitingBubble } from "../../components/WaitingBubble";
import { useDialogue } from "../../context/DialogueContext";
import { CardboardBubble } from "../../components/CardboardBubble";

export default function CharacterScene({ scene }: SceneProps<CharacterSceneType>) {
  const { isWaitingPending } = useDialogue();
  // Resolve display name from scene metadata
  const speakerLabel =
    scene.speaker === "left"
      ? scene["left-character"] || "Left"
      : scene.speaker === "right"
      ? scene["right-character"] || "Right"
      : "Narrator";

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: scene.speaker === 'left' ? 'flex-start' : scene.speaker === 'right' ? 'flex-end' : 'center',
        position: "relative",
      }}
    >
      {/* Main character speech bubble */}
      <CardboardBubble
        side={scene.speaker === 'left' ? 'left' : scene.speaker === 'right' ? 'right' : 'center'}
        speakerLabel={speakerLabel}
      >
        {scene.text}
      </CardboardBubble>

      {/* Waiting bubble near the bottom while we're waiting for AI */}
      {isWaitingPending && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none", // so it does not intercept clicks
          }}
        >
          <WaitingBubble />
        </div>
      )}
    </div>
  );
}