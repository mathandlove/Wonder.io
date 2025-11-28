/**
 * TitleScene Component
 * Displays story title on a construction paper sign with animated wires
 * Sign drops in from the top of the screen on mount
 */
import type { TitleScene } from '@core/types/scene';
import type { SceneProps } from './registry';
import './TitleScene.css';

export default function TitleScene({ scene }: SceneProps<TitleScene>) {
  return (
    <div className="title-scene-container">
      <div className="cardboard-container animate-drop-in">
        {/* Wires holding up the sign */}
        <div className="wire wire-left"></div>
        <div className="wire wire-right"></div>

        <div className="cardboard-sign">
          <div className="red-overlay">
            <h1 className="cardboard-title">
              {scene.lvl1 && <span className="title-line title-line-1">{scene.lvl1}</span>}
              {scene.lvl2 && <span className="title-line title-line-2">{scene.lvl2}</span>}
            </h1>
          </div>
          <div className="tape tape-top-left"></div>
          <div className="tape tape-bottom-right"></div>
          {(scene.author || scene.illustrator) && (
            <div className="credits-on-cardboard">
              {scene.author && <div className="author-line">by {scene.author}</div>}
              {scene.illustrator && <div className="illustrator-line">illustrated by {scene.illustrator}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
