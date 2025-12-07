/**
 * SceneOrchestratorContext - Provides scene runtime state to components
 *
 * Makes useSceneOrchestrator's caption state available to scene components
 * that need to render based on user interaction state.
 */
import React, { createContext, useContext } from 'react';
import type { SceneOrchestratorHook } from './useSceneOrchestrator';

const SceneOrchestratorContext = createContext<SceneOrchestratorHook | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useSceneOrchestratorContext(): SceneOrchestratorHook | null {
  return useContext(SceneOrchestratorContext);
}

interface SceneOrchestratorProviderProps {
  orchestrator: SceneOrchestratorHook;
  children: React.ReactNode;
}

export function SceneOrchestratorProvider({ orchestrator, children }: SceneOrchestratorProviderProps) {
  return (
    <SceneOrchestratorContext.Provider value={orchestrator}>
      {children}
    </SceneOrchestratorContext.Provider>
  );
}
