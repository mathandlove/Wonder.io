/**
 * ClueStore - Registry for clues from clue-image scenes
 *
 * Stores clue data indexed by map name (e.g., "insideBakery").
 * Character-flow scenes reference clues by their clueReference metadata.
 *
 * Used when character-flow has useClues: true metadata.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ClueData {
  hotspotName: string; // Label matching hotspot JSON (e.g., "Hair", "Potion")
  description: string; // Human-readable description of the clue
  image: string; // Image name to find thumbnails
  mapName?: string; // Map/scene name for resolving thumbnail paths (e.g., "insideBakery")
}

// Registry maps clue-image map names to their clue data
type ClueRegistry = Record<string, ClueData[]>;

interface ClueStoreContextValue {
  // New registry-based API
  registerClues: (mapName: string, clues: ClueData[]) => void;
  getCluesByReference: (mapName: string | undefined) => ClueData[];
  clearRegistry: () => void;

  // Legacy API for backward compatibility
  clues: ClueData[];
  setClues: (clues: ClueData[]) => void;
  getClues: () => ClueData[];
  clearClues: () => void;
}

const ClueStoreContext = createContext<ClueStoreContextValue | null>(null);

export function ClueStoreProvider({ children }: { children: React.ReactNode }) {
  const [registry, setRegistry] = useState<ClueRegistry>({});

  // Register clues under a specific map name
  const registerClues = useCallback((mapName: string, clues: ClueData[]) => {
    console.log(`[ClueStore] Registering ${clues.length} clues for "${mapName}"`);
    setRegistry(prev => ({
      ...prev,
      [mapName]: clues
    }));
  }, []);

  // Get clues by reference (map name)
  const getCluesByReference = useCallback((mapName: string | undefined): ClueData[] => {
    if (!mapName) {
      console.warn('[ClueStore] getCluesByReference called with undefined mapName');
      return [];
    }
    const clues = registry[mapName];
    if (!clues) {
      console.warn(`[ClueStore] No clues found for reference "${mapName}"`);
      return [];
    }
    return clues;
  }, [registry]);

  // Clear all registered clues
  const clearRegistry = useCallback(() => {
    setRegistry({});
  }, []);

  // === Legacy API for backward compatibility ===

  // Get first registered clue set (for legacy code that doesn't use references)
  const clues = Object.values(registry)[0] ?? [];

  // Legacy setClues - registers under a default key or uses mapName from clues
  const setClues = useCallback((newClues: ClueData[]) => {
    const mapName = newClues[0]?.mapName ?? 'default';
    registerClues(mapName, newClues);
  }, [registerClues]);

  const getClues = useCallback((): ClueData[] => {
    return clues;
  }, [clues]);

  const clearClues = useCallback(() => {
    clearRegistry();
  }, [clearRegistry]);

  const value: ClueStoreContextValue = {
    // New API
    registerClues,
    getCluesByReference,
    clearRegistry,
    // Legacy API
    clues,
    setClues,
    getClues,
    clearClues
  };

  return (
    <ClueStoreContext.Provider value={value}>
      {children}
    </ClueStoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClueStore() {
  const context = useContext(ClueStoreContext);
  if (!context) {
    throw new Error('useClueStore must be used within ClueStoreProvider');
  }
  return context;
}
