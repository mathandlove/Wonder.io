/**
 * AIMemoryStore.tsx
 * Manages conversation history for AI chat sessions.
 *
 * Stores conversation history per flowId (character/scene context).
 * Each flow maintains its own conversation history to ensure context
 * is preserved across multiple questions to the same character.
 */

import React, { createContext, useContext, useCallback, useState, type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ConversationHistory {
  flowId: string;
  messages: ConversationMessage[];
  characterDescription?: string;
}

// ============================================================================
// Context
// ============================================================================

interface AIMemoryStoreContextType {
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

const AIMemoryStoreContext = createContext<AIMemoryStoreContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface AIMemoryStoreProviderProps {
  children: ReactNode;
  maxMessagesPerFlow?: number; // Maximum messages to keep per flow (default: 20)
}

export const AIMemoryStoreProvider: React.FC<AIMemoryStoreProviderProps> = ({
  children,
  maxMessagesPerFlow = 20
}) => {
  // Store conversations as flowId -> ConversationHistory
  const [conversations, setConversations] = useState<Record<string, ConversationHistory>>({});

  /**
   * Get conversation history for a specific flowId
   */
  const getHistory = useCallback((flowId: string): ConversationMessage[] => {
    const conversation = conversations[flowId];
    return conversation?.messages || [];
  }, [conversations]);

  /**
   * Add a user message to the conversation history
   */
  const addUserMessage = useCallback((flowId: string, content: string) => {
    setConversations(prev => {
      const existing = prev[flowId] || { flowId, messages: [] };
      const newMessages = [
        ...existing.messages,
        {
          role: 'user' as const,
          content,
          timestamp: new Date()
        }
      ];

      // Trim to max messages (keep most recent)
      const trimmedMessages = newMessages.slice(-maxMessagesPerFlow);

      return {
        ...prev,
        [flowId]: {
          ...existing,
          messages: trimmedMessages
        }
      };
    });
  }, [maxMessagesPerFlow]);

  /**
   * Add an assistant (AI) message to the conversation history
   */
  const addAssistantMessage = useCallback((flowId: string, content: string) => {
    setConversations(prev => {
      const existing = prev[flowId] || { flowId, messages: [] };
      const newMessages = [
        ...existing.messages,
        {
          role: 'assistant' as const,
          content,
          timestamp: new Date()
        }
      ];

      // Trim to max messages (keep most recent)
      const trimmedMessages = newMessages.slice(-maxMessagesPerFlow);

      return {
        ...prev,
        [flowId]: {
          ...existing,
          messages: trimmedMessages
        }
      };
    });
  }, [maxMessagesPerFlow]);

  /**
   * Clear conversation history for a specific flowId
   */
  const clearHistory = useCallback((flowId: string) => {
    setConversations(prev => {
      const updated = { ...prev };
      delete updated[flowId];
      return updated;
    });
  }, []);

  /**
   * Clear all conversation histories
   */
  const clearAllHistories = useCallback(() => {
    setConversations({});
  }, []);

  /**
   * Get all conversation histories (for debugging/inspection)
   */
  const getAllHistories = useCallback((): Record<string, ConversationHistory> => {
    return conversations;
  }, [conversations]);

  const value: AIMemoryStoreContextType = {
    getHistory,
    addUserMessage,
    addAssistantMessage,
    clearHistory,
    clearAllHistories,
    getAllHistories
  };

  return (
    <AIMemoryStoreContext.Provider value={value}>
      {children}
    </AIMemoryStoreContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export function useAIMemory() {
  const ctx = useContext(AIMemoryStoreContext);
  if (!ctx) {
    throw new Error('useAIMemory must be used within AIMemoryStoreProvider');
  }
  return ctx;
}
