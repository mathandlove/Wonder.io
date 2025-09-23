import { useEffect, useMemo } from "react";
import { useScrollGuardAPI } from "../context/ScrollGuardContext";

type Opts = {
  active: boolean;           // is this scene currently the "live" scene
  forward?: boolean;         // disable forward
  backward?: boolean;        // disable backward
};

export function useDirectionalLock({ active, forward, backward }: Opts) {
  const api = useScrollGuardAPI();
  const token = useMemo(() => Symbol("scene-lock"), []);

  useEffect(() => {
    if (!active) {
      api.clear(token);
      return;
    }
    // choose the right helper or set explicit
    if (forward && backward) {
      api.setLock(token, { forward: true, backward: true });
    } else if (forward) {
      api.setLock(token, { forward: true });
    } else if (backward) {
      api.setLock(token, { backward: true });
    } else {
      api.setLock(token, { forward: false, backward: false });
    }
    return () => api.clear(token);
  }, [active, forward, backward]); // eslint-disable-line react-hooks/exhaustive-deps
}