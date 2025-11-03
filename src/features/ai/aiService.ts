/**
 * AI Service - Standalone service for AI chat interactions
 *
 * This service can be called from anywhere (including XState machines)
 * without requiring React context or hooks.
 *
 * Architecture:
 * - Pure function with no React dependencies
 * - Can be used by XState actors, React components, or server-side code
 * - Returns Promise for async AI calls
 */

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIServiceInput {
  questionText: string;
  characterDescription: string;
  conversationHistory?: ConversationMessage[];
}

export interface AIServiceResponse {
  text: string;
  success: boolean;
  error?: string;
}

/**
 * Call the AI backend to get a response
 * This is a pure function with no React dependencies
 *
 * @param input - AI request parameters
 * @returns Promise<AIServiceResponse> - AI response or error
 */
export async function callAI(input: AIServiceInput): Promise<AIServiceResponse> {
  try {
    // Validate required fields
    if (!input.questionText?.trim()) {
      throw new Error('Question text is required');
    }

    if (!input.characterDescription?.trim()) {
      throw new Error('Character description is required');
    }

    // Build request body
    const requestBody = {
      question: input.questionText,
      characterDescription: input.characterDescription,
      conversationHistory: input.conversationHistory || []
    };

    console.log('[AIService] 📤 Calling AI backend:', {
      questionLength: input.questionText.length,
      characterDescriptionLength: input.characterDescription.length,
      historyLength: input.conversationHistory?.length || 0
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

    console.log('[AIService] 📨 Received response from backend:', {
      responseLength: data.response.length,
      responsePreview: data.response.substring(0, 50) + '...'
    });

    return {
      text: data.response,
      success: true
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[AIService] ❌ Error:', errorMessage);

    return {
      text: '',
      success: false,
      error: errorMessage
    };
  }
}
