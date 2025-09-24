import { useEffect, useState } from "react";
import { useSceneBus } from "../registry/SceneBusProvider";

export function useSceneActive(sceneId: string) {
  const bus = useSceneBus();
  const [isActive, setIsActive] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  useEffect(() => {
    const onEnter = (id: string, scrollDirection?: 'forward' | 'backward') => {
      console.log(`[SCENE_BUS] Enter event for ${id}, target sceneId: ${sceneId}, direction: ${scrollDirection}`);
      if (id === sceneId) {
        console.log(`[SCENE_BUS] Scene ${sceneId} entering - setting isActive to true`);
        setDirection(scrollDirection || 'forward');
        setIsActive(true);
      }
    };
    const onLeave = (id: string, scrollDirection?: 'forward' | 'backward') => {
      console.log(`[SCENE_BUS] Leave event for ${id}, target sceneId: ${sceneId}, direction: ${scrollDirection}`);
      if (id === sceneId) {
        console.log(`[SCENE_BUS] Scene ${sceneId} leaving - setting isActive to false`);
        setDirection(scrollDirection || 'forward');
        setIsActive(false);
      }
    };

    bus.on("scene:enter", onEnter);
    bus.on("scene:leave", onLeave);

    return () => {
      bus.off("scene:enter", onEnter);
      bus.off("scene:leave", onLeave);
    };
  }, [bus, sceneId]);

  return { isActive, direction };
}