import React, { createContext, useContext, useState, useCallback } from 'react";

interface CharacterAnimationContextType {
  registerEntranceCallback: (sceneIndex: number, side: 'left' | 'right', callback: () => void) => void;
  notifyEntranceComplete: (sceneIndex: number, side: 'left' | 'right') => void;
}

const CharacterAnimationContext = createContext<CharacterAnimationContextType | null>(null);

export const CharacterAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Map of sceneIndex -> side -> callback
  const [callbacks, setCallbacks] = useState<Record<number, Record<string, () => void>>>({});

  const registerEntranceCallback = useCallback((sceneIndex: number, side: 'left' | 'right', callback: () => void) => {
    setCallbacks(prev => ({
      ...prev,
      [sceneIndex]: {
        ...prev[sceneIndex],
        [side]: callback
      }
    }));
  }, []);

  const notifyEntranceComplete = useCallback((sceneIndex: number, side: 'left' | 'right') => {
    const callback = callbacks[sceneIndex]?.[side];
    if (callback) {
      callback();
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

export const useCharacterAnimation = () => {
  const context = useContext(CharacterAnimationContext);
  if (!context) {
    throw new Error('useCharacterAnimation must be used within CharacterAnimationProvider');
  }
  return context;
};