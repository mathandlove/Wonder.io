/**
 * ClueStore - Stores clues from the most recent clue-image scene
 *
 * Stores clue data that can be referenced by character-flow scenes.
 * Only stores the most recent set of clues (not accumulated).
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

interface ClueStoreContextValue {
  clues: ClueData[];
  setClues: (clues: ClueData[]) => void;
  getClues: () => ClueData[];
  clearClues: () => void;
}

const ClueStoreContext = createContext<ClueStoreContextValue | null>(null);

export function ClueStoreProvider({ children }: { children: React.ReactNode }) {
  const [clues, setCluesState] = useState<ClueData[]>([]);

  const setClues = useCallback((newClues: ClueData[]) => {
    setCluesState(newClues);
  }, []);

  const getClues = useCallback((): ClueData[] => {
    return clues;
  }, [clues]);

  const clearClues = useCallback(() => {
    setCluesState([]);
  }, []);

  const value: ClueStoreContextValue = {
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
