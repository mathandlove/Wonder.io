
import React from "react";
import { useDialogue } from "../../context/DialogueContext";

import type { SceneProps } from "../registry";
import type { WaitingScene as WaitingSceneType } from "../../types/scene";
import { WaitingBubble } from "../../components/WaitingBubble";

export default function WaitingScene({ scene, onComplete }: SceneProps<WaitingSceneType>) {
  const { assistantText, isWaitingPending, arriveAtWaiting } = useDialogue();
  React.useEffect(() => {
    if (assistantText) {
      // We only mark arrival once text exists so the shared-element transition keeps the peek visible during scroll
      try { arriveAtWaiting(); } catch {}
    }
  }, [assistantText, arriveAtWaiting]);
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: scene.background ? `url(/stories/gingerbread.bundle/images/backgrounds/${scene.background})` : "#f0f0f0",
      backgroundSize: "cover",
      backgroundPosition: "center",
      padding: "2rem"
    }}>
      <div style={{ display: "grid", placeItems: "center" }}>
        <WaitingBubble
          layoutId="waitingBubble"
          variant="full"
          text={assistantText}
          isTyping={isWaitingPending && !assistantText}
        />
        {onComplete && (
          <button
            onClick={onComplete}
            style={{
              marginTop: 16,
              padding: "10px 16px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer"
            }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}