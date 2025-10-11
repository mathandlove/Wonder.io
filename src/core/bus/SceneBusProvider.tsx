import React, { useContext, createContext } from 'react";
import { sceneBus } from './sceneBus";

const SceneBusContext = createContext(sceneBus);

export function SceneBusProvider({ children }: { children: React.ReactNode }) {
  return (
    <SceneBusContext.Provider value={sceneBus}>
      {children}
    </SceneBusContext.Provider>
  );
}

export function useSceneBus() {
  return useContext(SceneBusContext);
}