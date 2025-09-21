import { useEffect, useReducer } from 'react';

type Side = 'left' | 'right';

type GateState = {
  sceneToken: string;
  needed: Set<Side>;
  done: Set<Side>;
  ready: boolean;
};

type Action =
  | { type: 'RESET'; sceneToken: string; needed: Side[] }
  | { type: 'DONE'; sceneToken: string; side: Side };

function reducer(state: GateState, action: Action): GateState {
  switch (action.type) {
    case 'RESET':
      return {
        sceneToken: action.sceneToken,
        needed: new Set(action.needed),
        done: new Set(),
        ready: action.needed.length === 0,
      };
    case 'DONE':
      if (action.sceneToken !== state.sceneToken) return state; // ignore stale
      if (!state.needed.has(action.side)) return state;
      const done = new Set(state.done).add(action.side);
      const ready = state.needed.size === done.size;
      return { ...state, done, ready };
    default:
      return state;
  }
}

export function useEntranceGate(sceneToken: string, sidesNeeded: Side[]) {
  const [state, dispatch] = useReducer(reducer, {
    sceneToken,
    needed: new Set<Side>(),
    done: new Set<Side>(),
    ready: sidesNeeded.length === 0,
  });

  useEffect(() => {
    dispatch({ type: 'RESET', sceneToken, needed: sidesNeeded });
  }, [sceneToken, JSON.stringify(sidesNeeded)]);


  const markDone = (side: Side) => {
    dispatch({ type: 'DONE', sceneToken, side });
  };

  return { ready: state.ready, markDone };
}