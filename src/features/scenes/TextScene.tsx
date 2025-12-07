/**
 * TextScene Component
 * Displays simple text scenes with cardboard bubble styling matching speech bubbles
 */
import type { TextScene } from '@core/types/scene';
import type { SceneProps } from './registry';
import './TextScene.css';

export default function TextScene({ scene }: SceneProps<TextScene>) {
  return (
    <div className="text-scene-container">
      <div className="text-bubble">
        <div className="text-bubble-inner">
          <p className="scene-text">{scene.text}</p>
        </div>
      </div>
    </div>
  );
}
