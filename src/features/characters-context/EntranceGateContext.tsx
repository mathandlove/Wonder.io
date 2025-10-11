import React, { createContext, useContext, useCallback, useRef } from 'react";

type Side = 'left' | 'right";
type EntranceCompleteHandler = (side: Side) => void;

interface EntranceGateContextType {
  registerHandler: (sceneToken: string, handler: EntranceCompleteHandler) => void;
  unregisterHandler: (sceneToken: string) => void;
  notifyEntranceComplete: (sceneToken: string, side: Side) => void;
  resetForScene?: (sceneToken: string, sidesNeeded: Side[]) => void;
  getDebugInfo?: () => { handlerCount: number; activeTokens: string[] };
}

const EntranceGateContext = createContext<EntranceGateContextType | null>(null);

export const useEntranceGateContext = () => {
  const context = useContext(EntranceGateContext);
  if (!context) {
    throw new Error('useEntranceGateContext must be used within EntranceGateProvider');
  }
  return context;
};

export const EntranceGateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handlersRef = useRef<Map<string, EntranceCompleteHandler>>(new Map());
  const sceneStatesRef = useRef<Map<string, { sidesNeeded: Side[]; sidesDone: Side[] }>>(new Map());

  const registerHandler = useCallback((sceneToken: string, handler: EntranceCompleteHandler) => {
    handlersRef.current.set(sceneToken, handler);
  }, []);

  const unregisterHandler = useCallback((sceneToken: string) => {
    handlersRef.current.delete(sceneToken);
  }, []);

  const resetForScene = useCallback((sceneToken: string, sidesNeeded: Side[]) => {
    sceneStatesRef.current.set(sceneToken, {
      sidesNeeded: [...sidesNeeded],
      sidesDone: []
    });
  }, []);

  const getDebugInfo = useCallback(() => {
    return {
      handlerCount: handlersRef.current.size,
      activeTokens: Array.from(handlersRef.current.keys()),
      sceneStates: Object.fromEntries(sceneStatesRef.current.entries())
    };
  }, []);

  const notifyEntranceComplete = useCallback((sceneToken: string, side: Side) => {
    // Update scene state tracking
    const sceneState = sceneStatesRef.current.get(sceneToken);
    if (sceneState) {
      if (!sceneState.sidesDone.includes(side)) {
        sceneState.sidesDone.push(side);
      }
    }

    const handler = handlersRef.current.get(sceneToken);
    if (handler) {
      handler(side);
    }
  }, []);

  return (
    <EntranceGateContext.Provider value={{
      registerHandler,
      unregisterHandler,
      notifyEntranceComplete,
      resetForScene,
      getDebugInfo
    }}>
      {children}
    </EntranceGateContext.Provider>
  );
};