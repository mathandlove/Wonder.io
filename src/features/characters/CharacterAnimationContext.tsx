import React, { createContext, useContext, useState, useCallback } from 'react';

interface CharacterAnimationContextType {
  registerEntranceCallback: (sceneIndex: number, side: 'left' | 'right', callback: () => void) => void;
  notifyEntranceComplete: (sceneIndex: number, side: 'left' | 'right') => void;
}

const CharacterAnimationContext = createContext<CharacterAnimationContextType | null>(null);

export const CharacterAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Map of sceneIndex -> side -> callback
  const [callbacks, setCallbacks] = useState<Record<number, Record<string, () => void>>>({});
  // Track which animations have already completed
  const [completedAnimations, setCompletedAnimations] = useState<Record<number, Record<string, boolean>>>({});

  const registerEntranceCallback = useCallback((sceneIndex: number, side: 'left' | 'right', callback: () => void) => {
    console.log('[CharacterAnimation] 📝 Registering callback', { sceneIndex, side });

    // Check if animation already completed
    if (completedAnimations[sceneIndex]?.[side]) {
      console.log('[CharacterAnimation] ⚡ Animation already complete - firing callback immediately', { sceneIndex, side });
      callback();
      return;
    }

    // Store callback for later
    setCallbacks(prev => ({
      ...prev,
      [sceneIndex]: {
        ...prev[sceneIndex],
        [side]: callback
      }
    }));
  }, [completedAnimations]);

  const notifyEntranceComplete = useCallback((sceneIndex: number, side: 'left' | 'right') => {
    console.log('[CharacterAnimation] ✨ Animation complete notification', { sceneIndex, side });

    // Mark as completed
    setCompletedAnimations(prev => ({
      ...prev,
      [sceneIndex]: {
        ...prev[sceneIndex],
        [side]: true
      }
    }));

    // Fire callback if one exists
    const callback = callbacks[sceneIndex]?.[side];
    if (callback) {
      console.log('[CharacterAnimation] 🔔 Firing registered callback', { sceneIndex, side });
      callback();
    } else {
      console.log('[CharacterAnimation] 📭 No callback registered yet', { sceneIndex, side });
    }
  }, [callbacks]);

  return (
    <CharacterAnimationContext.Provider value={{
      registerEntranceCallback,
      notifyEntranceComplete
    }}>
      {children}
    </CharacterAnimationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCharacterAnimation = () => {
  const context = useContext(CharacterAnimationContext);
  if (!context) {
    throw new Error('useCharacterAnimation must be used within CharacterAnimationProvider');
  }
  return context;
};