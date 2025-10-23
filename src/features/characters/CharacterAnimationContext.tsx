import React, { createContext, useContext, useState, useCallback } from 'react';

type AnimationEventType = 'entrance-complete' | 'jiggle-complete';
type AnimationEventListener = (sceneIndex: number) => void;

interface CharacterAnimationContextType {
  registerEntranceCallback: (sceneIndex: number, side: 'left' | 'right', callback: () => void) => void;
  notifyEntranceComplete: (sceneIndex: number, side: 'left' | 'right') => void;
  notifyJiggleComplete: (sceneIndex: number, side: 'left' | 'right') => void;
  addEventListener: (eventType: AnimationEventType, listener: AnimationEventListener) => void;
  removeEventListener: (eventType: AnimationEventType, listener: AnimationEventListener) => void;
}

const CharacterAnimationContext = createContext<CharacterAnimationContextType | null>(null);

export const CharacterAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Map of sceneIndex -> side -> callback
  const [callbacks, setCallbacks] = useState<Record<number, Record<string, () => void>>>({});
  // Track which animations have already completed
  const [completedAnimations, setCompletedAnimations] = useState<Record<number, Record<string, boolean>>>({});
  // Track jiggle completion per scene per side
  const [jiggleCompletions, setJiggleCompletions] = useState<Record<number, Record<string, boolean>>>({});
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
    } else {
    }
  }, [callbacks]);

  const notifyJiggleComplete = useCallback((sceneIndex: number, side: 'left' | 'right') => {

    setJiggleCompletions(prev => {
      const newCompletions = {
        ...prev,
        [sceneIndex]: {
          ...prev[sceneIndex],
          [side]: true
        }
      };

      // Check if BOTH sides have completed (or if only one side has a character)
      const sceneCompletions = newCompletions[sceneIndex];
      const leftDone = sceneCompletions?.left === true;
      const rightDone = sceneCompletions?.right === true;

      console.log('[CharacterAnimation] Jiggle progress:', {
        sceneIndex,
        leftDone,
        rightDone,
        bothDone: leftDone && rightDone
      });

      // If both sides are done, fire the jiggle-complete event
      if (leftDone && rightDone) {
        console.log('[CharacterAnimation] Both sides complete, firing event for scene:', sceneIndex);
        // Fire all listeners for this event
        eventListeners['jiggle-complete'].forEach(listener => {
          listener(sceneIndex);
        });

        // Clean up this scene's jiggle state
        const { [sceneIndex]: _, ...rest } = newCompletions;
        return rest;
      }

      return newCompletions;
    });
  }, [eventListeners]);

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
      notifyJiggleComplete,
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