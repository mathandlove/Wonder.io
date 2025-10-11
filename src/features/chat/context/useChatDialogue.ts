import { useContext } from 'react';
import { DialogueContext } from './ChatDialogueContext';

export const useDialogue = () => {
  const context = useContext(DialogueContext);
  if (!context) {
    throw new Error('useDialogue must be used within DialogueProvider');
  }
  return context;
};

export const useIsPlayerTurn = () => {
  const context = useContext(DialogueContext);
  if (!context) {
    throw new Error('useIsPlayerTurn must be used within DialogueProvider');
  }
  return context.isPlayerTurn;
};
