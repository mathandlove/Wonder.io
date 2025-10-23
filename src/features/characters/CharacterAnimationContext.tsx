import React, { createContext, useContext, useState, useCallback } from 'react';

type AnimationEventType = 'entrance-complete' | 'jiggle-complete';
type AnimationEventListener = (sceneIndex: number) => void;

interface CharacterAnimationContextType {
  registerEntranceCallback: (sceneIndex: number, side: 'left' | 'right', callback: () => void) => void;
  notifyEntranceComplete: (sceneIndex: number, side: 'left' | 'right') => void;
  addEventListener: (eventType: AnimationEventType, listener: AnimationEventListener) => void;
  removeEventListener: (eventType: AnimationEventType, listener: AnimationEventListener) => void;
}

const CharacterAnimationContext = createContext<CharacterAnimationContextType | null>(null);

export const CharacterAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Map of sceneIndex -> side -> callback
  const [callbacks, setCallbacks] = useState<Record<number, Record<string, () => void>>>({});
  // Track which animations have already completed
  const [completedAnimations, setCompletedAnimations] = useState<Record<number, Record<string, boolean>>>({});
  // Event listeners for animation events
  const [eventListeners, setEventListeners] = useState<Record<AnimationEventType, AnimationEventListener[]>>({
    'entrance-complete': [],
    'jiggle-complete': []
  });

  const registerEntranceCallback = useCallback((sceneIndex: number, side: 'left' | 'right', callback: () => void) => {

    // Check if animation already completed
    if (completedAnimations[sceneIndex]?.[side]) {
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
      callback();
    }
  }, [callbacks]);

  const addEventListener = useCallback((eventType: AnimationEventType, listener: AnimationEventListener) => {
    setEventListeners(prev => ({
      ...prev,
      [eventType]: [...prev[eventType], listener]
    }));
  }, []);

  const removeEventListener = useCallback((eventType: AnimationEventType, listener: AnimationEventListener) => {
    setEventListeners(prev => ({
      ...prev,
      [eventType]: prev[eventType].filter(l => l !== listener)
    }));
  }, []);

  return (
    <CharacterAnimationContext.Provider value={{
      registerEntranceCallback,
      notifyEntranceComplete,
      addEventListener,
      removeEventListener
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