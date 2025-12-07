/**
 * AIModule.tsx
 * Simple AI module interface that returns responses to user input.
 * Mock implementation that returns "Processed: [input text]" after a 2-second delay.
 */

import React, { useCallback, type ReactNode } from 'react';
import { AIModuleContext, type AIModuleContextType } from './AIModuleContext';
import { API_ENDPOINTS } from '../../config';

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

      // Call backend API
      const response = await fetch(API_ENDPOINTS.AI_CHAT, {
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

      // console.log('📨 [AIModule] Received response from backend API:', {
      //   responseText: data.response,
      //   responseLength: data.response.length,
      //   timestamp: new Date().toISOString()
      // });

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
// Hook - moved to separate file for react-refresh compliance
// ============================================================================
// Import from: import { useAIModule } from './useAIModule';
