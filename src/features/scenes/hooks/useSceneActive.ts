import { useEffect, useState } from "react";
import { useSceneBus } from "@core/bus/SceneBusProvider";

export function useSceneActive(sceneId: string) {
  const bus = useSceneBus();
  const [isActive, setIsActive] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  useEffect(() => {
    const onEnter = (id: string, scrollDirection?: 'forward' | 'backward') => {
      if (id === sceneId) {
        setDirection(scrollDirection || 'forward');
        setIsActive(true);
      }
    };
    const onLeave = (id: string, scrollDirection?: 'forward' | 'backward') => {
      if (id === sceneId) {
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