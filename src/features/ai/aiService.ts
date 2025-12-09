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

import { createDebugger } from '../../utils/createDebug';
import { API_ENDPOINTS } from '../../config';

const debug = createDebugger('ai:service');

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

    // console.log('[AIService] 📤 Calling AI backend:', {
    // questionLength: input.questionText.length,
    // characterDescriptionLength: input.characterDescription.length,
    // historyLength: input.conversationHistory?.length || 0
    // });

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

    // console.log('[AIService] 📨 Received response from backend:', {
    // responseLength: data.response.length,
    // responsePreview: data.response.substring(0, 50) + '...'
    // });

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

/**
 * Answer Validation Input
 */
export interface AnswerValidationInput {
  userAnswer: string;
  correctAnswer: string;
  incorrectAnswer?: string[];  // FAIL answers - these always result in FAIL
  questionText?: string;
  context?: string;  // Character deposition/context
}

/**
 * Answer Validation Response
 */
export interface AnswerValidationResponse {
  isCorrect: boolean;
  success: boolean;
  reasoning?: string;  // Explanation from AI (returned on FAIL)
  error?: string;
}

/**
 * Validate user's answer against the correct answer using AI
 * This uses AI to allow for flexible matching (typos, different phrasings, etc.)
 * Returns PASS/FAIL with reasoning on failure.
 *
 * @param input - Validation request parameters
 * @returns Promise<AnswerValidationResponse> - Validation result or error
 */
export async function validateAnswer(input: AnswerValidationInput): Promise<AnswerValidationResponse> {
  debug.event('🎯', 'validateAnswer called:', {
    userAnswer: input.userAnswer,
    correctAnswer: input.correctAnswer,
    questionText: input.questionText,
    context: input.context?.substring(0, 50) + '...'
  });

  try {
    // Validate required fields
    if (!input.userAnswer?.trim()) {
      debug.log('Empty user answer - returning false');
      return {
        isCorrect: false,
        success: true,
        reasoning: 'No answer provided'
      };
    }

    if (!input.correctAnswer?.trim()) {
      debug.error('No correct answer provided');
      throw new Error('Correct answer is required for validation');
    }

    debug.event('📤', 'Calling validation API with structured data...');

    // Call backend API with structured data - backend builds the prompt
    const response = await fetch(API_ENDPOINTS.AI_VALIDATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        context: input.context || '',
        question: input.questionText || '',
        expectedAnswer: input.correctAnswer,
        studentAnswer: input.userAnswer,
        failAnswers: input.incorrectAnswer || []
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    debug.event('📨', 'Received API response:', data);

    // Parse PASS/FAIL response
    const isCorrect = data.isCorrect;
    const reasoning = data.reasoning || '';

    debug.event('📊', 'Validation result:', {
      isCorrect,
      reasoning,
      userAnswer: input.userAnswer,
      correctAnswer: input.correctAnswer
    });

    return {
      isCorrect,
      success: true,
      reasoning: isCorrect ? undefined : reasoning  // Only return reasoning on FAIL
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[AIService] ❌ Validation Error:', errorMessage);

    return {
      isCorrect: false,
      success: false,
      error: errorMessage
    };
  }
}
