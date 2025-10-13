/**
 * ChatGateway.tsx
 * A production-ready bridge component that:
 * 1) Accepts input events from a Recorder (text and optional audio transcript)
 * 2) Builds a minimal, privacy-aware chat payload for your backend
 * 3) Gets a response back (non-streaming for now)
 * 4) Returns the response text to the caller (orchestrator handles scene creation)
 *
 * For now we will be fake calling ChatGPT
 */

import React, { createContext, useContext, useCallback, type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Input payload from recorder or manual text input
 */
export interface ChatInput {
  text: string;
  audioTranscript?: string; // Optional: if different from text or for logging
  recordingId?: string; // Links back to the recording session
  metadata?: {
    timestamp?: Date;
    speaker?: 'left' | 'right';
    currentBackground?: string;
    leftCharacter?: string;
    rightCharacter?: string;
    characterDescription?: string; // AI context about the character
  };
}

/**
 * Response from the chat backend (or mock)
 */
export interface ChatResponse {
  text: string;
  speaker?: 'left' | 'right';
  success: boolean;
  error?: string;
}

/**
 * Privacy-aware payload sent to backend
 * Only includes necessary information, no PII or sensitive data
 */
interface ChatPayload {
  message: string;
  context?: {
    previousMessages?: string[]; // Last N messages for context (if needed)
    characterDescription?: string; // Character context for AI response
  };
}

// ============================================================================
// Context
// ============================================================================

interface ChatGatewayContextType {
  isProcessing: boolean;
  lastError?: string;
  submitChat: (input: ChatInput) => Promise<ChatResponse>;
}

const ChatGatewayContext = createContext<ChatGatewayContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface ChatGatewayProviderProps {
  children: ReactNode;
}

export const ChatGatewayProvider: React.FC<ChatGatewayProviderProps> = ({
  children
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [lastError, setLastError] = React.useState<string | undefined>();

  /**
   * Mock ChatGPT API call
   * In production, this would be a real API call to your backend
   */
  const mockChatGPTCall = async (payload: ChatPayload): Promise<string> => {
    // Simulate network delay (500ms - 2s)
    const delay = Math.random() * 1500 + 500;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Generate a mock response
    const responses = [
      "That's a great question! Let me think about that...",
      "I understand what you mean. Here's what I think...",
      "Interesting perspective! My response is...",
      "Thanks for sharing that with me. Let me respond...",
      "I appreciate your input. Here's my take on it..."
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    // Build response with echo and character description (if present)
    let response = `${randomResponse} [Echo: "${payload.message}"]`;

    if (payload.context?.characterDescription) {
      // Extract first line (up to first period or first 80 chars)
      const firstLine = payload.context.characterDescription.split('.')[0] + '.';
      const truncated = firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
      response += ` [Character: ${truncated}]`;
    }

    return response;
  };

  /**
   * Build a privacy-aware payload for the backend
   * Only includes the message and minimal context
   */
  const buildPayload = (input: ChatInput): ChatPayload => {
    return {
      message: input.text,
      context: {
        // Could add previous messages here if needed for context
        // For now, keeping it minimal
        characterDescription: input.metadata?.characterDescription
      }
    };
  };

  /**
   * Main submission handler
   * Takes input, calls backend (mock), returns response text
   * Scene creation is handled by the orchestrator layer
   */
  const submitChat = useCallback(async (input: ChatInput): Promise<ChatResponse> => {
    setIsProcessing(true);
    setLastError(undefined);

    try {
      // Build privacy-aware payload
      const payload = buildPayload(input);

      // Call mock ChatGPT (in production, this would be your backend)
      const responseText = await mockChatGPTCall(payload);

      return {
        text: responseText,
        speaker: 'right', // Suggest that AI/NPC should respond from right
        success: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ ChatGateway error:', errorMessage);

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

  const value: ChatGatewayContextType = {
    isProcessing,
    lastError,
    submitChat
  };

  return (
    <ChatGatewayContext.Provider value={value}>
      {children}
    </ChatGatewayContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access ChatGateway functionality
 */
export function useChatGateway() {
  const ctx = useContext(ChatGatewayContext);
  if (!ctx) {
    throw new Error('useChatGateway must be used within ChatGatewayProvider');
  }
  return ctx;
}
