/**
 * AI Conversation Handler
 *
 * Handles AI chat requests with conversation context and character descriptions.
 * Integrates with OpenAI's Chat Completions API to generate contextual responses.
 */

import OpenAI from 'openai';
import type { Request, Response } from 'express';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not found - AI conversation will not work');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY || '',
});

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatRequest {
  question: string;
  characterDescription: string;
  conversationHistory?: ConversationMessage[];
}

export interface AIChatResponse {
  response: string;
  error?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// System Prompt Builder
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Build the system prompt that guides the AI's behavior
 */
function buildSystemPrompt(characterDescription: string): string {
  return `You are a character in an interactive children's story. Here is your character description:

${characterDescription}

IMPORTANT INSTRUCTIONS:
- Stay completely in character at all times
- Respond naturally as this character would respond
- Keep responses concise (2-3 sentences maximum)
- Use age-appropriate language suitable for children
- Be helpful and encouraging
- If asked about something you (as the character) wouldn't know, respond truthfully that you don't know
- Maintain the personality, tone, and knowledge level described in your character description

Remember: You ARE this character. Respond as they would, not as an AI assistant.`;
}

// ──────────────────────────────────────────────────────────────────────────────
// REST API Handler
// ──────────────────────────────────────────────────────────────────────────────

export async function handleAIChat(req: Request, res: Response): Promise<void> {
  try {
    const { question, characterDescription, conversationHistory = [] } = req.body as AIChatRequest;

    // Validate required fields
    if (!question || !question.trim()) {
      res.status(400).json({
        error: 'Question is required'
      } as AIChatResponse);
      return;
    }

    if (!characterDescription || !characterDescription.trim()) {
      res.status(400).json({
        error: 'Character description is required'
      } as AIChatResponse);
      return;
    }

    if (!OPENAI_API_KEY) {
      res.status(500).json({
        error: 'OpenAI API key not configured'
      } as AIChatResponse);
      return;
    }

      question: question.substring(0, 100),
      historyLength: conversationHistory.length,
      characterDescriptionLength: characterDescription.length
    });

    // Log the full conversation history being sent
    conversationHistory.forEach((msg, idx) => {
    });

    // Build the system prompt with character description
    const systemPrompt = buildSystemPrompt(characterDescription);

    // Log the system prompt to see how character is being instructed

    // Build messages array for OpenAI API
    // Format: [system, ...history, new user message]
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      // Add conversation history
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      // Add the new question
      {
        role: 'user' as const,
        content: question
      }
    ];


    // Call OpenAI Chat Completions API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4', // High-quality responses for better character interactions
      messages,
      max_tokens: 150, // Keep responses concise (2-3 sentences)
      temperature: 0.7, // Some creativity but not too random
      presence_penalty: 0.1, // Slight penalty for repetition
      frequency_penalty: 0.1
    });

    // Extract the response text
    const responseText = completion.choices[0]?.message?.content || '';

    if (!responseText.trim()) {
      console.warn('⚠️  Empty response from OpenAI');
      res.status(500).json({
        error: 'Received empty response from AI'
      } as AIChatResponse);
      return;
    }

    // Log the full AI response

    // Send successful response
    res.json({
      response: responseText
    } as AIChatResponse);

  } catch (error) {
    console.error('❌ AI Chat Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    res.status(500).json({
      error: errorMessage
    } as AIChatResponse);
  }
}
