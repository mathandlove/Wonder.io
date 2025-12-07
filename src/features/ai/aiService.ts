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
  incorrectAnswer?: string[];
  questionText?: string;
}

/**
 * Answer Validation Response
 */
export interface AnswerValidationResponse {
  isCorrect: boolean;
  success: boolean;
  error?: string;
}

/**
 * Validate user's answer against the correct answer using AI
 * This uses AI to allow for flexible matching (typos, different phrasings, etc.)
 *
 * @param input - Validation request parameters
 * @returns Promise<AnswerValidationResponse> - Validation result or error
 */
export async function validateAnswer(input: AnswerValidationInput): Promise<AnswerValidationResponse> {
  debug.event('🎯', 'validateAnswer called:', {
    userAnswer: input.userAnswer,
    correctAnswer: input.correctAnswer,
    questionText: input.questionText
  });

  try {
    // Validate required fields
    if (!input.userAnswer?.trim()) {
      debug.log('Empty user answer - returning false');
      return {
        isCorrect: false,
        success: true
      };
    }

    if (!input.correctAnswer?.trim()) {
      debug.error('No correct answer provided');
      throw new Error('Correct answer is required for validation');
    }

    // Build a prompt that asks AI to rate semantic equivalence
    let validationPrompt = `You are a friendly teacher helping to see if a child's answer means the same thing as the correct answer.
Please give a score from 0 to 100 based on how much the meaning is the same.

100 = same idea, even if the words are different
70–90 = same basic meaning, but some details are missing
40–69 = somewhat related, but the main idea is unclear
0–39 = mostly unrelated

Be generous: if the child clearly understands the idea, it's okay if they don't say who or what exactly.

Correct answer: "${input.correctAnswer}"
Student answer: "${input.userAnswer}"`;

    // Add incorrect answer penalty if provided
    if (input.incorrectAnswer && input.incorrectAnswer.length > 0) {
      validationPrompt += `\n\nSubtract 50 points if the answer states any of the following facts:`;
      input.incorrectAnswer.forEach((incorrectFact) => {
        validationPrompt += `\n- "${incorrectFact}"`;
      });
    }

    validationPrompt += `\n\nReturn your response as a number.`;

    debug.event('📤', 'Calling validation API...');

    // Call backend API
    const response = await fetch('http://localhost:3001/api/ai/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: validationPrompt
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    debug.event('📨', 'Received API response:', data);

    if (!data.response || !data.response.trim()) {
      debug.error('Empty response from AI validation');
      throw new Error('Received empty response from AI validation');
    }

    // Parse AI response - expecting a number from 0 to 100
    const aiResponse = data.response.trim();
    const score = parseInt(aiResponse, 10);

    debug.log('Parsed score:', score);

    // Validate that we got a valid number
    if (isNaN(score) || score < 0 || score > 100) {
      debug.error('Invalid score from AI:', aiResponse);
      throw new Error(`Invalid validation score: ${aiResponse}`);
    }

    // Consider correct if score is above 65
    const isCorrect = score > 65;

    debug.event('📊', 'Validation score:', {
      score,
      isCorrect,
      threshold: 65,
      userAnswer: input.userAnswer,
      correctAnswer: input.correctAnswer
    });

    return {
      isCorrect,
      success: true
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
