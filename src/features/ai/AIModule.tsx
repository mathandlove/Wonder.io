/**
 * AIModule.tsx
 * Simple AI module interface that returns responses to user input.
 * Mock implementation that returns "Processed: [input text]" after a 2-second delay.
 */

import React, { createContext, useContext, useCallback, type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIInput {
  text: string;
  conversationHistory?: ConversationMessage[];
  context?: {
    characterDescription?: string;
  };
}

export interface AIResponse {
  text: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// Context
// ============================================================================

interface AIModuleContextType {
  isProcessing: boolean;
  lastError?: string;
  getResponse: (input: AIInput) => Promise<AIResponse>;
}

const AIModuleContext = createContext<AIModuleContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface AIModuleProviderProps {
  children: ReactNode;
}

export const AIModuleProvider: React.FC<AIModuleProviderProps> = ({
  children
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [lastError, setLastError] = React.useState<string | undefined>();

  /**
   * Real AI implementation - calls backend API with conversation context
   */
  const getResponse = useCallback(async (input: AIInput): Promise<AIResponse> => {
    setIsProcessing(true);
    setLastError(undefined);

    try {
      // Validate required fields
      if (!input.text?.trim()) {
        throw new Error('Question text is required');
      }

      if (!input.context?.characterDescription?.trim()) {
        throw new Error('Character description is required');
      }

      // Build request body
      const requestBody = {
        question: input.text,
        characterDescription: input.context.characterDescription,
        conversationHistory: input.conversationHistory || []
      };

      console.log('[AIModule] Calling backend API with:', {
        questionLength: input.text.length,
        historyLength: requestBody.conversationHistory.length,
        characterDescriptionLength: input.context.characterDescription.length
      });

      // Call backend API
      const response = await fetch('http://localhost:3001/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.response || !data.response.trim()) {
        throw new Error('Received empty response from AI');
      }

      console.log('[AIModule] ✅ Received AI response:', data.response.substring(0, 100));

      return {
        text: data.response,
        success: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[AIModule] ❌ Error:', errorMessage);
      setLastError(errorMessage);

      return {
        text: '',
        success: false,
        error: errorMessage
      };

    } finally {
      setIsProcessing(false);
    }
  }, []);

  const value: AIModuleContextType = {
    isProcessing,
    lastError,
    getResponse
  };

  return (
    <AIModuleContext.Provider value={value}>
      {children}
    </AIModuleContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export function useAIModule() {
  const ctx = useContext(AIModuleContext);
  if (!ctx) {
    throw new Error('useAIModule must be used within AIModuleProvider');
  }
  return ctx;
}
