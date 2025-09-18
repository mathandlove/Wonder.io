/**
 * Displays character dialogue scenes with speaker identification.
 * Shows text in a speech bubble with character name and background.
 * Also shows a sticky "waiting" peek bubble at the bottom when an AI reply is pending.
 */
import type { SceneProps } from "../registry";
import type { CharacterScene as CharacterSceneType } from "../../types/scene";
import { WaitingBubble } from "../../components/WaitingBubble";
import { useDialogue } from "../../context/DialogueContext";

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
        justifyContent: "center",
        background: scene.background
          ? `url(/stories/gingerbread.bundle/images/backgrounds/${scene.background})`
          : "#f0f0f0",
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: "2rem",
        position: "relative",
      }}
    >
      {/* Main character speech bubble */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          padding: "1.5rem 2rem",
          borderRadius: 16,
          maxWidth: 640,
          textAlign: "center",
          border: "2px solid #e6e6e6",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        }}
      >
        <h3 style={{ margin: 0, marginBottom: "0.75rem", color: "#333" }}>{speakerLabel}</h3>
        <p style={{ fontSize: "1.125rem", lineHeight: 1.5, color: "#444", margin: 0 }}>{scene.text}</p>
      </div>

      {/* Sticky waiting peek near the bottom while we're waiting for AI */}
      {isWaitingPending && (
        <div
          style={{
            position: "sticky",
            bottom: 24,
            display: "flex",
            justifyContent: "center",
            width: "100%",
            pointerEvents: "none", // so it does not intercept clicks
            marginTop: 32,
          }}
        >
          <WaitingBubble layoutId="waitingBubble" variant="peek" isTyping />
        </div>
      )}
    </div>
  );
}