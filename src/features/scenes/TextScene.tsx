/**
 * TextScene view wrapper - handles pure text scenes with character animations
 * Self-contained component with character image loading and navigation
 */
import { useRef, useState, useEffect } from "react";
import type { SceneProps } from "./registry";
import type { TextScene as TextSceneType } from "@core/types/scene";
import { useSceneManager } from "@core/scenes/SceneManager";
import "./TextScene.css";

export default function TextScene({ scene, onComplete }: SceneProps<TextSceneType>) {
  const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const textBubbleRef = useRef<HTMLDivElement>(null);
  const { navigationIndex, setNavigationIndex } = useSceneManager();

  const storyId = "gingerbread";

  // Character image loading logic with bundle fallback
  useEffect(() => {
    if (scene.character) {
      const bundleImagePath = `/stories/${storyId}.bundle/images/characters/${scene.character}.sticker-cardboard-3d.webp`;
      const globalImagePath = `/assets.core/images/characters/${scene.character}.sticker-cardboard-3d.webp`;

      // Try loading from bundle first
      const img = new Image();
      img.onload = () => {
        setCharacterImageUrl(bundleImagePath);
      };
      img.onerror = () => {
        // Fallback to global assets
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setCharacterImageUrl(globalImagePath);
        };
        fallbackImg.onerror = () => {
          console.warn(`Character image not found: ${scene.character}`);
          setCharacterImageUrl(null);
        };
        fallbackImg.src = globalImagePath;
      };
      img.src = bundleImagePath;
    }
  }, [scene.character, storyId]);

  const handleClick = () => {
    onComplete?.();
    setNavigationIndex(navigationIndex + 1);
  };

  return (
    <div ref={sceneRef} className="text-scene-container" onClick={handleClick}>
      <div className="text-scene-content">
        {/* Character image with wooden dowel */}
        {characterImageUrl && (
          <div className="character-image-container">
            <div className="wooden-dowel" />
            <img
              src={characterImageUrl}
              alt={scene.character || "Character"}
              className="character-image bounce-arrival"
            />
          </div>
        )}

        {/* Text bubble */}
        <div className="text-bubble" ref={textBubbleRef}>
          <div className="text-bubble-inner">
            <p className="scene-text">{scene.text}</p>
          </div>
        </div>
      </div>

      {/* Continue hint */}
      <div className="continue-hint">Click to continue →</div>
    </div>
  );
}
