import React, { useState, useEffect, useRef } from "react";
import type { Scene } from "../types/scene";
import Caption from "../scenes/components/Caption";
import { useSceneActive } from "../scenes/hooks/useSceneActive";

interface CaptionOrchestratorProps {
  scenes: Scene[];
}

export function CaptionOrchestrator({ scenes }: CaptionOrchestratorProps) {
  // Keep a persistent registry of all caption scenes we've ever seen
  const [persistentCaptions, setPersistentCaptions] = useState<Map<string, Scene>>(new Map());
  const seenSceneIds = useRef<Set<string>>(new Set());

  // Track all caption scenes that appear, but never remove them
  useEffect(() => {
    const newCaptions = new Map(persistentCaptions);
    let hasChanges = false;

    scenes.forEach((scene) => {
      if (scene.type === 'caption' && scene.sceneId) {
        if (!seenSceneIds.current.has(scene.sceneId)) {
          seenSceneIds.current.add(scene.sceneId);
          newCaptions.set(scene.sceneId, scene);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setPersistentCaptions(newCaptions);
    }
  }, [scenes, persistentCaptions]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 50,
      pointerEvents: 'none'
    }}>
      {Array.from(persistentCaptions.values()).map((scene) => (
        <CaptionRenderer
          key={scene.sceneId || 'unknown-caption'}
          scene={scene}
        />
      ))}
    </div>
  );
}

function CaptionRenderer({ scene }: { scene: Scene }) {
  const captionScene = scene as any; // CaptionScene type
  const isActive = useSceneActive(scene.sceneId || '');

  return (
    <Caption
      text={captionScene.caption}
      isActive={isActive}
      align={captionScene.align || "bottom"}
    />
  );
}