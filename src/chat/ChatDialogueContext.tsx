import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Message {
  id: string;
  sender: 'player' | 'npc';
  text: string;
  timestamp: Date;
}

interface DialogueContextType {
  messages: Message[];
  isPlayerTurn: boolean;
  waiting: boolean;
  suggestions?: string[];
  questState: 'active' | 'complete' | 'failed';
  showTurnBanner: boolean;
  turnBannerText?: string;
  grantPlayerTurn: (questId?: string) => void;
  submitPlayerUtterance: (text: string) => Promise<void>;
  setSuggestions: (suggestions: string[]) => void;
  setTurnBannerText: (text?: string) => void;
  markGoalMet: () => void;
  markGoalNotMet: () => void;
}

const DialogueContext = createContext<DialogueContextType | undefined>(undefined);

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

interface DialogueProviderProps {
  children: ReactNode;
}

export const ChatDialogueProvider: React.FC<DialogueProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [questState, setQuestState] = useState<'active' | 'complete' | 'failed'>('active');
  const [currentQuestId, setCurrentQuestId] = useState<string | undefined>();
  const [turnBannerText, setTurnBannerText] = useState<string | undefined>();

  const grantPlayerTurn = useCallback((questId?: string) => {
    setCurrentQuestId(questId);
    setIsPlayerTurn(true);
    setQuestState('active');
    // Reset messages for new input scene
    setMessages([]);
  }, []);

  const mockLLMCall = async (playerText: string): Promise<string> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `AI Response to: ${playerText}`;
  };

  const evaluateQuest = (playerText: string, npcResponse: string): boolean => {
    // For now, check if player text contains "monkey"
    return playerText.toLowerCase().includes('monkey');
  };

  const submitPlayerUtterance = useCallback(async (text: string) => {
    if (!isPlayerTurn || waiting) return;

    setWaiting(true);
    setIsPlayerTurn(false);

    // Add player message
    const playerMessage: Message = {
      id: `player-${Date.now()}`,
      sender: 'player',
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, playerMessage]);

    try {
      // Call mock LLM
      const npcResponse = await mockLLMCall(text);

      // Add NPC response
      const npcMessage: Message = {
        id: `npc-${Date.now()}`,
        sender: 'npc',
        text: npcResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, npcMessage]);

      // Evaluate quest completion
      const goalMet = evaluateQuest(text, npcResponse);

      if (goalMet) {
        setQuestState('complete');
        // Quest complete - don't grant another turn
        // TODO: Integrate with QuestManager when available
      } else {
        setQuestState('active');
        // Goal not met - grant another turn
        setIsPlayerTurn(true);
      }
    } catch (error) {
      console.error('Error in dialogue submission:', error);
      setQuestState('failed');
    } finally {
      setWaiting(false);
    }
  }, [isPlayerTurn, waiting, currentQuestId]);

  const markGoalMet = useCallback(() => {
    setQuestState('complete');
    setIsPlayerTurn(false);
  }, []);

  const markGoalNotMet = useCallback(() => {
    setQuestState('active');
    setIsPlayerTurn(true);
  }, []);

  const value: DialogueContextType = {
    messages,
    isPlayerTurn,
    waiting,
    suggestions,
    questState,
    showTurnBanner: isPlayerTurn && !waiting,
    turnBannerText,
    grantPlayerTurn,
    submitPlayerUtterance,
    setSuggestions,
    setTurnBannerText,
    markGoalMet,
    markGoalNotMet
  };

  return (
    <DialogueContext.Provider value={value}>
      {children}
    </DialogueContext.Provider>
  );
};