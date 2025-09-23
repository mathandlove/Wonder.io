import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import { useNavigation } from "./NavigationContext";

type LockState = {
  forward: boolean;
  backward: boolean;
  forwardAtIndex?: number;  // Lock forward scrolling at specific index
  backwardAtIndex?: number; // Lock backward scrolling at specific index
};

type Token = symbol;

type API = {
  // Higher level helpers
  lockForward(): Token;
  lockBackward(): Token;
  lockBoth(): Token;
  lockForwardAt(index: number): Token; // New: lock forward at specific scene
  lockBackwardAt(index: number): Token; // New: lock backward at specific scene
  clear(token: Token): void;

  // Lowest level (explicit state)
  setLock(token: Token, next: Partial<LockState>): void;

  // Read-only
  state: LockState;
  canScrollForward: boolean; // New: computed based on current index
  canScrollBackward: boolean; // New: computed based on current index
};

const ScrollGuardCtx = createContext<API | null>(null);

export const ScrollGuardProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Get current scene index from navigation
  const { currentIndex } = useNavigation();

  // Stack of claims so multiple scenes can request locks safely
  const claims = useRef<Map<Token, LockState>>(new Map());
  const [state, setState] = useState<LockState>({ forward: false, backward: false });

  const recompute = useCallback(() => {
    let forward = false;
    let backward = false;
    let forwardAtIndex: number | undefined;
    let backwardAtIndex: number | undefined;

    for (const v of claims.current.values()) {
      forward = forward || !!v.forward;
      backward = backward || !!v.backward;

      // Track the most restrictive index locks
      if (v.forwardAtIndex !== undefined) {
        forwardAtIndex = forwardAtIndex === undefined
          ? v.forwardAtIndex
          : Math.min(forwardAtIndex, v.forwardAtIndex);
      }
      if (v.backwardAtIndex !== undefined) {
        backwardAtIndex = backwardAtIndex === undefined
          ? v.backwardAtIndex
          : Math.max(backwardAtIndex, v.backwardAtIndex);
      }
    }

    setState({ forward, backward, forwardAtIndex, backwardAtIndex });
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

  // New scene-aware lock methods
  const lockForwardAt = useCallback((index: number) => {
    const t = makeToken();
    claims.current.set(t, { forward: false, backward: false, forwardAtIndex: index });
    recompute();
    return t;
  }, [recompute]);

  const lockBackwardAt = useCallback((index: number) => {
    const t = makeToken();
    claims.current.set(t, { forward: false, backward: false, backwardAtIndex: index });
    recompute();
    return t;
  }, [recompute]);

  // Compute whether scrolling is allowed based on current position
  const canScrollForward = useMemo(() => {
    // Global forward lock always prevents forward scrolling
    if (state.forward) return false;

    // If there's an index-based lock, check if we're at or past it
    if (state.forwardAtIndex !== undefined) {
      return currentIndex < state.forwardAtIndex;
    }

    return true;
  }, [state.forward, state.forwardAtIndex, currentIndex]);

  const canScrollBackward = useMemo(() => {
    // Global backward lock always prevents backward scrolling
    if (state.backward) return false;

    // If there's an index-based lock, check if we're at or before it
    if (state.backwardAtIndex !== undefined) {
      return currentIndex > state.backwardAtIndex;
    }

    return true;
  }, [state.backward, state.backwardAtIndex, currentIndex]);

  // Single global listeners
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const scrollingForward = e.deltaY > 0;
      const scrollingBackward = e.deltaY < 0;

      if ((scrollingForward && !canScrollForward) || (scrollingBackward && !canScrollBackward)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      // ArrowDown/PageDown/Space -> forward, ArrowUp/PageUp/Shift+Space -> backward
      const forwardKeys = ["ArrowDown", "PageDown", " "];
      const backwardKeys = ["ArrowUp", "PageUp"];
      const isBackwardSpace = e.key === " " && e.shiftKey;

      if ((!canScrollForward && forwardKeys.includes(e.key) && !e.shiftKey) ||
          (!canScrollBackward && (backwardKeys.includes(e.key) || isBackwardSpace))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Touch
    let lastY = 0;
    const onTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? lastY;
      const dy = lastY - y; // >0 means user is moving finger up -> page scrolls down (forward)
      const scrollingForward = dy > 0;
      const scrollingBackward = dy < 0;

      if ((scrollingForward && !canScrollForward) || (scrollingBackward && !canScrollBackward)) {
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
  }, [canScrollForward, canScrollBackward]);

  const value = useMemo<API>(() => ({
    lockForward,
    lockBackward,
    lockBoth,
    lockForwardAt,
    lockBackwardAt,
    clear,
    setLock,
    state,
    canScrollForward,
    canScrollBackward
  }), [lockForward, lockBackward, lockBoth, lockForwardAt, lockBackwardAt, clear, setLock, state, canScrollForward, canScrollBackward]);

  return <ScrollGuardCtx.Provider value={value}>{children}</ScrollGuardCtx.Provider>;
};

export function useScrollGuardAPI(): API {
  const ctx = useContext(ScrollGuardCtx);
  if (!ctx) throw new Error("useScrollGuardAPI must be used inside <ScrollGuardProvider>");
  return ctx;
}