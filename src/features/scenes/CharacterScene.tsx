/**
 * CharacterScene now serves as a scroll target only.
 * Speech bubbles are rendered by SpeechBubbleOrchestrator outside the document flow.
 */

import type { SceneProps } from "./registry";
import type { CharacterScene as CharacterSceneType } from "@core/types/scene";

export default function CharacterScene({ scene, sceneIndex }: SceneProps<CharacterSceneType>) {
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
          Scene {sceneIndex}: {scene.speaker} - "{scene.text.substring(0, 30)}..."
        </div>
      )}

      {/* Empty scroll target - speech bubbles rendered by SpeechBubbleOrchestrator */}
    </div>
  );
}