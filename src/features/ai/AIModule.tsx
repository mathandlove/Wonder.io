/**
 * AIModule.tsx
 * Simple AI module interface that returns responses to user input.
 * Mock implementation that returns "Processed: [input text]" after a 2-second delay.
 */

import React, { createContext, useContext, useCallback, type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface AIInput {
  text: string;
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
   * Mock AI implementation - returns "Processed: [text]" after 2 seconds
   */
  const getResponse = useCallback(async (input: AIInput): Promise<AIResponse> => {
    setIsProcessing(true);
    setLastError(undefined);

    try {
      // Simulate AI processing delay (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Return processed text with "Processed:" prefix
      const processedText = `Processed: ${input.text}`;
      return {
        text: processedText,
        success: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
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
