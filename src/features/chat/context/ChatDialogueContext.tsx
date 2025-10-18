import React, { createContext, useState, useCallback, type ReactNode } from 'react';

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
  hideTurnBanner: () => void;
  resetTurnBanner: () => void;
  markGoalMet: () => void;
  markGoalNotMet: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const DialogueContext = createContext<DialogueContextType | undefined>(undefined);

interface DialogueProviderProps {
  children: ReactNode;
}

export const ChatDialogueProvider: React.FC<DialogueProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [questState, setQuestState] = useState<'active' | 'complete' | 'failed'>('active');
  const [turnBannerText, setTurnBannerText] = useState<string | undefined>();
  const [bannerHidden, setBannerHidden] = useState(() => {
    // Clear localStorage on page load to ensure banner shows on refresh
    try {
      localStorage.removeItem('chat-banner-hidden');
    } catch {
      // Ignore localStorage errors
    }
    return false; // Always start with banner visible on refresh
  });

  const grantPlayerTurn = useCallback(() => {
    setIsPlayerTurn(true);
    setQuestState('active');
    // Reset messages for new input scene
    setMessages([]);
    // Keep banner hidden state persistent - don't reset it
  }, []);

  const mockLLMCall = async (playerText: string): Promise<string> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 5000));
    return `AI Response to: ${playerText}`;
  };

  const evaluateQuest = (playerText: string): boolean => {
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
      const goalMet = evaluateQuest(text);

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
  }, [isPlayerTurn, waiting]);

  const markGoalMet = useCallback(() => {
    setQuestState('complete');
    setIsPlayerTurn(false);
  }, []);

  const markGoalNotMet = useCallback(() => {
    setQuestState('active');
    setIsPlayerTurn(true);
  }, []);

  const hideTurnBanner = useCallback(() => {
    setBannerHidden(true);
    // Persist to localStorage
    try {
      localStorage.setItem('chat-banner-hidden', 'true');
    } catch (error) {
      console.warn('Failed to save banner state to localStorage:', error);
    }
  }, []);

  const resetTurnBanner = useCallback(() => {
    setBannerHidden(false);
    // Remove from localStorage
    try {
      localStorage.removeItem('chat-banner-hidden');
    } catch (error) {
      console.warn('Failed to remove banner state from localStorage:', error);
    }
  }, []);

  const value: DialogueContextType = {
    messages,
    isPlayerTurn,
    waiting,
    suggestions,
    questState,
    showTurnBanner: (() => {
      const shouldShow = isPlayerTurn && !waiting && !bannerHidden;
      return shouldShow;
    })(),
    turnBannerText,
    grantPlayerTurn,
    submitPlayerUtterance,
    setSuggestions,
    setTurnBannerText,
    hideTurnBanner,
    resetTurnBanner,
    markGoalMet,
    markGoalNotMet
  };

  return (
    <DialogueContext.Provider value={value}>
      {children}
    </DialogueContext.Provider>
  );
};