/**
 * AIMemoryStore Context
 * Separated for react-refresh compliance
 */
import { createContext } from 'react';
import type { ConversationHistory, ConversationMessage } from './AIMemoryStore';

export interface AIMemoryStoreContextType {
  // Get conversation history for a specific flowId
  getHistory: (flowId: string) => ConversationMessage[];

  // Add a user message to the conversation
  addUserMessage: (flowId: string, content: string) => void;

  // Add an assistant (AI) message to the conversation
  addAssistantMessage: (flowId: string, content: string) => void;

  // Clear history for a specific flowId
  clearHistory: (flowId: string) => void;

  // Clear all conversation histories
  clearAllHistories: () => void;

  // Get the full conversation history object (for debugging)
  getAllHistories: () => Record<string, ConversationHistory>;
}

export const AIMemoryStoreContext = createContext<AIMemoryStoreContextType | undefined>(undefined);
