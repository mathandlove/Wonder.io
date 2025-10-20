/**
 * AIModule.tsx
 * Simple AI module interface that returns responses to user input.
 * Currently a dummy implementation that returns "fail" for all requests.
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
   * Dummy AI implementation - always returns "fail"
   */
  const getResponse = useCallback(async (_input: AIInput): Promise<AIResponse> => {
    setIsProcessing(true);
    setLastError(undefined);

    try {
      // Simulate a tiny delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Return "fail" as the response
      return {
        text: 'fail',
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
