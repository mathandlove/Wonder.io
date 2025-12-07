/**
 * AI Answer Validation Handler
 *
 * Validates user answers against correct answers using OpenAI.
 * Allows for flexible matching with typos, different phrasings, etc.
 */

import OpenAI from 'openai';
import type { Request, Response } from 'express';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not found - AI validation will not work');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY || '',
});

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface AIValidationRequest {
  prompt: string;
}

export interface AIValidationResponse {
  response: string;
  error?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// REST API Handler
// ──────────────────────────────────────────────────────────────────────────────

export async function handleAIValidation(req: Request, res: Response): Promise<void> {
  try {
    const { prompt } = req.body as AIValidationRequest;

    console.log('📥 Validation request received:', {
      promptLength: prompt?.length,
      fullPrompt: prompt // Log full prompt for debugging
    });

    // Extract and log the answers from the prompt for verification
    const correctMatch = prompt?.match(/Correct answer: "(.+?)"/);
    const studentMatch = prompt?.match(/Student answer: "(.+?)"/);

    console.log('📝 Extracted answers:', {
      correctAnswer: correctMatch?.[1] || 'NOT FOUND',
      studentAnswer: studentMatch?.[1] || 'NOT FOUND'
    });

    // Validate required fields
    if (!prompt || !prompt.trim()) {
      res.status(400).json({
        error: 'Prompt is required'
      } as AIValidationResponse);
      return;
    }

    if (!OPENAI_API_KEY) {
      res.status(500).json({
        error: 'OpenAI API key not configured'
      } as AIValidationResponse);
      return;
    }

    console.log('🤖 Calling OpenAI with model: gpt-5-chat-latest');
    console.log('📤 OpenAI Request:', {
      model: 'gpt-5-chat-latest',
      userPrompt: prompt,
      maxTokens: 10,
      temperature: 0
    });

    // Call OpenAI Chat Completions API with the validation prompt
    // NOTE: No system prompt - the user prompt already contains all instructions
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-chat-latest', // Use GPT-5 chat latest - most advanced model for conversational tasks
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 10, // Just need a number (e.g., "85")
      temperature: 0, // Zero randomness for consistent validation
    });

    console.log('📨 OpenAI Raw Response:', {
      content: completion.choices[0]?.message?.content,
      finishReason: completion.choices[0]?.finish_reason
    });

    // Extract the response text
    const responseText = completion.choices[0]?.message?.content || '';

    if (!responseText.trim()) {
      console.warn('⚠️  Empty response from OpenAI validation');
      res.status(500).json({
        error: 'Received empty response from AI validation'
      } as AIValidationResponse);
      return;
    }

    // Extract the number from the response
    const numberMatch = responseText.trim().match(/\d+/);
    if (!numberMatch) {
      console.error('❌ No number found in response:', responseText);
      res.status(500).json({
        error: 'Failed to extract score from response'
      } as AIValidationResponse);
      return;
    }

    const score = numberMatch[0];

    console.log('✅ AI Validation Response:', {
      model: 'gpt-5-chat-latest',
      score: score,
      timestamp: new Date().toISOString()
    });

    // Return the score
    res.json({
      response: score
    } as AIValidationResponse);

  } catch (error) {
    console.error('❌ AI Validation Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    res.status(500).json({
      error: errorMessage
    } as AIValidationResponse);
  }
}
