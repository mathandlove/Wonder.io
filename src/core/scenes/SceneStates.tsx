/**
 * SceneStates - Persistent state cache for scene states
 *
 * Maintains a dictionary of sceneId -> SceneState that persists across navigation.
 * When SceneManager advances navigationIndex, it updates SceneStates with the
 * current state for that scene. Components can then look up their state by sceneId
 * and it will persist even after navigation moves past the scene.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { SceneState } from '@core/navigation/types';

interface SceneStatesType {
  // Dictionary of sceneId -> current state for that scene
  states: Record<string, SceneState>;

  // Update the state for a specific scene
  updateSceneState: (sceneId: string, state: SceneState) => void;

  // Get the state for a specific scene (returns undefined if not set)
  getSceneState: (sceneId: string) => SceneState | undefined;

  // Clear all states (useful for story resets)
  clearStates: () => void;
}

const SceneStatesContext = createContext<SceneStatesType | null>(null);

export function useSceneStates(): SceneStatesType {
  const context = useContext(SceneStatesContext);
  if (!context) {
    throw new Error('useSceneStates must be used within SceneStatesProvider');
  }
  return context;
}

interface SceneStatesProviderProps {
  children: React.ReactNode;
}

export function SceneStatesProvider({ children }: SceneStatesProviderProps) {
  const [states, setStates] = useState<Record<string, SceneState>>({});

  const updateSceneState = useCallback((sceneId: string, state: SceneState) => {
    setStates(prev => ({
      ...prev,
      [sceneId]: state,
    }));
  }, []);

  const getSceneState = useCallback((sceneId: string): SceneState | undefined => {
    return states[sceneId];
  }, [states]);

  const clearStates = useCallback(() => {
    setStates({});
  }, []);

  const value = React.useMemo((): SceneStatesType => ({
    states,
    updateSceneState,
    getSceneState,
    clearStates,
  }), [states, updateSceneState, getSceneState, clearStates]);

  return (
    <SceneStatesContext.Provider value={value}>
      {children}
    </SceneStatesContext.Provider>
  );
}
