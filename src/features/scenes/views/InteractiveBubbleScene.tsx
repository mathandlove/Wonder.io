/**
 * InteractiveBubbleScene now serves as a scroll target only.
 * Speech bubbles are rendered by SpeechBubbleOrchestrator outside the document flow.
 */
import React from "react";
import type { SceneProps } from "../registry";
import type { InteractiveBubbleScene as InteractiveBubbleSceneType } from "../../types/scene";

export default function InteractiveBubbleScene({ scene, sceneIndex }: SceneProps<InteractiveBubbleSceneType>) {
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
      {/* Debug info for scroll target - DISABLED */}
      {false && (
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
          Interactive Scene {sceneIndex}: {scene.sceneId}
        </div>
      )}

      {/* Empty scroll target - speech bubbles rendered by SpeechBubbleOrchestrator */}
    </div>
  );
}