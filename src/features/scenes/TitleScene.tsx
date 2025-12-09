/**
 * TitleScene Component
 * Displays story title image with animated wires
 * Sign drops in from the top of the screen on mount
 */
import type { TitleScene } from '@core/types/scene';
import type { SceneProps } from './registry';
import { resolveStoryImage } from '@core/data/imageResolver';
import './TitleScene.css';

export default function TitleScene({ scene }: SceneProps<TitleScene>) {
  const titleImage = resolveStoryImage(scene.image || 'story/title.jpg');

  return (
    <div className="title-scene-container construction-paper-bg">
      <div className="cardboard-container animate-drop-in">
        <div className="wire wire-left"></div>
        <div className="wire wire-right"></div>
        <img
          src={titleImage}
          alt="Story Title"
          className="title-image"
        />
      </div>
    </div>
  );
}
