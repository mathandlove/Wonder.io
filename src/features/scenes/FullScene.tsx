/**
 * Displays full text scenes with centered text layout.
 * Shows text in full screen format without speech bubbles.
 */
import type { SceneProps } from "./registry";
import type { FullScene } from "@core/types/scene";

export default function FullScene({ scene }: SceneProps<FullScene>) {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      color: 'white',
      fontSize: '1.5rem',
      lineHeight: '1.6',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <div>
        {scene.text}
      </div>
    </div>
  );
}