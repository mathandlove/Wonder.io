/**
 * CharacterScene now serves as a scroll target only.
 * Speech bubbles are rendered by SpeechBubbleOrchestrator outside the document flow.
 */
import React from "react";
import type { SceneProps } from "../registry";
import type { CharacterScene as CharacterSceneType } from "../../types/scene";
import { CardboardBubble } from "../../components/CardboardBubble";

export default function CharacterScene({ scene, sceneIndex }: SceneProps<CharacterSceneType>) {
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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Debug info for scroll target */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.5)',
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontFamily: 'monospace',
        pointerEvents: 'none'
      }}>
        Scene {sceneIndex}: {scene.speaker} - "{scene.text.substring(0, 30)}..."
      </div>

      {/* Speech bubble - positioned in center like debug text */}
      <CardboardBubble
        side={scene.speaker === 'left' ? 'left' : scene.speaker === 'right' ? 'right' : 'center'}
        speakerLabel={speakerLabel}
      >
        {scene.text}
      </CardboardBubble>
    </div>
  );
}