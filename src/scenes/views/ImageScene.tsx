/**
 * Displays story images with optional captions.
 * Centers images with a shadow effect and shows captions below.
 */
import React from "react";
import type { SceneProps } from "../registry";
import type { ImageScene } from "../../types/scene";

export default function ImageScene({ scene }: SceneProps<ImageScene>) {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: scene.background ? `url(/stories/gingerbread.bundle/images/backgrounds/${scene.background})` : '#000',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '2rem',
      position: 'relative'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '800px',
        width: '100%'
      }}>
        <img
          src={`/stories/gingerbread.bundle/images/${scene.image}`}
          alt={scene.caption || "Story image"}
          style={{
            maxWidth: '100%',
            maxHeight: '70vh',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
        />
        {scene.caption && (
          <div style={{
            marginTop: '2rem',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '1.5rem',
            borderRadius: '12px',
            fontSize: '1.2rem',
            color: '#333',
            lineHeight: '1.6'
          }}>
            {scene.caption}
          </div>
        )}
      </div>
    </div>
  );
}