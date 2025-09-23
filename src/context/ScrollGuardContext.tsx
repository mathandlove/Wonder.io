import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";

type LockState = { forward: boolean; backward: boolean };
type Token = symbol;

type API = {
  // Higher level helpers
  lockForward(): Token;
  lockBackward(): Token;
  lockBoth(): Token;
  clear(token: Token): void;

  // Lowest level (explicit state)
  setLock(token: Token, next: Partial<LockState>): void;

  // Read-only
  state: LockState;
};

const ScrollGuardCtx = createContext<API | null>(null);

export const ScrollGuardProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // stack of claims so multiple scenes can request locks safely
  const claims = useRef<Map<Token, LockState>>(new Map());
  const [state, setState] = useState<LockState>({ forward: false, backward: false });

  const recompute = useCallback(() => {
    let forward = false;
    let backward = false;
    for (const v of claims.current.values()) {
      forward = forward || !!v.forward;
      backward = backward || !!v.backward;
    }
    setState({ forward, backward });
  }, []);

  const makeToken = () => Symbol("scroll-lock");

  const setLock = useCallback((token: Token, next: Partial<LockState>) => {
    const prev = claims.current.get(token) || { forward: false, backward: false };
    claims.current.set(token, { ...prev, ...next });
    recompute();
  }, [recompute]);

  const clear = useCallback((token: Token) => {
    if (claims.current.has(token)) {
      claims.current.delete(token);
      recompute();
    }
  }, [recompute]);

  const lockForward = useCallback(() => {
    const t = makeToken();
    claims.current.set(t, { forward: true, backward: false });
    recompute();
    return t;
  }, [recompute]);

  const lockBackward = useCallback(() => {
    const t = makeToken();
    claims.current.set(t, { forward: false, backward: true });
    recompute();
    return t;
  }, [recompute]);

  const lockBoth = useCallback(() => {
    const t = makeToken();
    claims.current.set(t, { forward: true, backward: true });
    recompute();
    return t;
  }, [recompute]);

  // single global listeners
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if ((state.forward && e.deltaY > 0) || (state.backward && e.deltaY < 0)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      // ArrowDown/PageDown/Space -> forward, ArrowUp/PageUp/Shift+Space -> backward
      const forwardKeys = ["ArrowDown", "PageDown", " "];
      const backwardKeys = ["ArrowUp", "PageUp"];
      const isBackwardSpace = e.key === " " && e.shiftKey;

      if ((state.forward && forwardKeys.includes(e.key) && !e.shiftKey) ||
          (state.backward && (backwardKeys.includes(e.key) || isBackwardSpace))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    // touch
    let lastY = 0;
    const onTouchStart = (e: TouchEvent) => { lastY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? lastY;
      const dy = lastY - y; // >0 means user is moving finger up -> page scrolls down (forward)
      if ((state.forward && dy > 0) || (state.backward && dy < 0)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel as any);
      window.removeEventListener("keydown", onKey as any);
      window.removeEventListener("touchstart", onTouchStart as any);
      window.removeEventListener("touchmove", onTouchMove as any);
    };
  }, [state.forward, state.backward]);

  const value = useMemo<API>(() => ({
    lockForward, lockBackward, lockBoth, clear, setLock, state
  }), [lockForward, lockBackward, lockBoth, clear, setLock, state]);

  return <ScrollGuardCtx.Provider value={value}>{children}</ScrollGuardCtx.Provider>;
};

export function useScrollGuardAPI(): API {
  const ctx = useContext(ScrollGuardCtx);
  if (!ctx) throw new Error("useScrollGuardAPI must be used inside <ScrollGuardProvider>");
  return ctx;
}