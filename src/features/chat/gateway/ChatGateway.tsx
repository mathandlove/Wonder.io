/**
 * ChatGateway.tsx
 * A production-ready bridge component that:
 * 1) Accepts input events from a Recorder (text and optional audio transcript)
 * 2) Builds a minimal, privacy-aware chat payload for your backend
 * 3) Gets a streaming response back from Claude API
 * 4) Returns the response text to the caller (orchestrator handles scene creation)
 */

import React, { createContext, useContext, useCallback, useRef, type ReactNode } from 'react';

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
  const wsRef = useRef<WebSocket | null>(null);
  const accumulatedTextRef = useRef<string>('');

  /**
   * Claude Streaming API call via WebSocket
   */
  const streamClaudeResponse = async (payload: ChatPayload): Promise<string> => {
    return new Promise((resolve, reject) => {
      accumulatedTextRef.current = '';

      // Connect to Claude WebSocket endpoint
      const ws = new WebSocket('ws://localhost:3001/api/claude/socket');
      wsRef.current = ws;

      ws.onopen = () => {

        // Build the message with character context
        let message = payload.message;
        if (payload.context?.characterDescription) {
          message = `${payload.context.characterDescription}\n\nUser: ${payload.message}`;
        }

        // Send message to Claude
        ws.send(JSON.stringify({
          type: 'message',
          text: message,
          context: payload.context?.characterDescription
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'debug':
              // Log debug information to console
              break;

            case 'content_delta':
              // Accumulate text as it streams in
              accumulatedTextRef.current += data.text;
              break;

            case 'content_complete':
              break;

            case 'message_complete':
              ws.close();
              resolve(accumulatedTextRef.current);
              break;

            case 'error':
              console.error('❌ Claude error:', data.message);
              ws.close();
              reject(new Error(data.message));
              break;
          }
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    });
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

      // Call Claude streaming API
      const responseText = await streamClaudeResponse(payload);

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
// eslint-disable-next-line react-refresh/only-export-components
export function useChatGateway() {
  const ctx = useContext(ChatGatewayContext);
  if (!ctx) {
    throw new Error('useChatGateway must be used within ChatGatewayProvider');
  }
  return ctx;
}
