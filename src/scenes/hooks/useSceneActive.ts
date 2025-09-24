import { useEffect, useState } from "react";
import { useSceneBus } from "../registry/SceneBusProvider";

export function useSceneActive(sceneId: string) {
  const bus = useSceneBus();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const onEnter = (id: string) => {
      console.log(`[SCENE_BUS] Enter event for ${id}, target sceneId: ${sceneId}`);
      if (id === sceneId) {
        console.log(`[SCENE_BUS] Scene ${sceneId} entering - setting isActive to true`);
        setIsActive(true);
      }
    };
    const onLeave = (id: string) => {
      console.log(`[SCENE_BUS] Leave event for ${id}, target sceneId: ${sceneId}`);
      if (id === sceneId) {
        console.log(`[SCENE_BUS] Scene ${sceneId} leaving - setting isActive to false`);
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

  return isActive;
}