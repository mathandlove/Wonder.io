/**
 * Displays story images covering the full viewport space.
 * Images use background-size: cover for full-space coverage.
 *
 * IMPORTANT: Unlike orchestrators (RecordPanel, Quest) that disappear when scrolling past,
 * ImageScene stays in the DOM and needs to remember its state after navigationIndex moves past.
 * This is why we use SceneStates - it maintains a persistent cache keyed by sceneId.
 */
import React, { useEffect } from "react";
import type { SceneProps } from "./registry";
import type { ImageScene } from "@core/types/scene";
import { resolveStoryImage } from "@core/data/imageResolver";
import Caption from "@features/caption/Caption";
import { useSceneManager } from "@core/scenes/SceneManager";
import { useSceneStates } from "@core/scenes/SceneStates";
import type { ImageState } from "@core/dialogue/types";

export default function ImageScene({ scene }: SceneProps<ImageScene>) {
  // Support both 'text' (legacy) and 'caption' properties
  const captionText = scene.text || scene.caption;
  const hasCaption = captionText && captionText.trim() !== '';

  // Get this scene's ID
  const sceneId = (scene as ImageScene & { sceneId?: string }).sceneId;

  // Get this scene's PERSISTENT state from SceneStates cache
  // This persists even after navigationIndex moves to other scenes
  const sceneStates = useSceneStates();

  // IMPORTANT: Depend on sceneStates.states to trigger re-render when state changes
  // We can't just call getSceneState() once because it uses a ref that doesn't trigger re-renders
  const sceneState = sceneId ? sceneStates.states[sceneId] : undefined;

  // FALLBACK: If SceneStates doesn't have this scene yet, check if we're currently ON this scene
  const sceneManager = useSceneManager();
  const currentNavItem = sceneManager.getCurrentNavigationItem();
  const isCurrentScene = currentNavItem?.sceneId === sceneId;

  // Extract caption state - prioritize SceneStates (persistence), fallback to current nav item
  const captionState: ImageState = sceneState?.type === 'image'
    ? sceneState.state
    : (isCurrentScene && currentNavItem?.sceneState.type === 'image')
      ? currentNavItem.sceneState.state
      : 'hidden';

  // Debug logging
  useEffect(() => {
    console.log('[ImageScene]', sceneId, {
      sceneState,
      isCurrentScene,
      captionState,
      hasCaption,
      captionText,
      'sceneState.type': sceneState?.type,
      'sceneState.state': sceneState?.type === 'image' ? sceneState.state : 'N/A'
    });
  }, [sceneId, sceneState, isCurrentScene, captionState, hasCaption, captionText]);

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <img
        src={resolveStoryImage(scene.image)}
        alt={scene.caption || "Story image"}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />

      {/* Debug overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        fontSize: '12px',
        zIndex: 9999,
        fontFamily: 'monospace',
        maxWidth: '300px',
        pointerEvents: 'none'
      }}>
        <div>sceneId: {sceneId}</div>
        <div>hasCaption: {String(hasCaption)}</div>
        <div>captionState: {captionState}</div>
        <div>sceneState: {sceneState ? JSON.stringify(sceneState) : 'undefined'}</div>
        <div>isCurrentScene: {String(isCurrentScene)}</div>
      </div>

      {/* Show caption when scene has caption text and state allows it */}
      {hasCaption && (
        <Caption
          text={captionText!}
          state={captionState}
          align="bottom"
        />
      )}
    </div>
  );
}