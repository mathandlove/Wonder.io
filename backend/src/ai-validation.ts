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
  context?: string;           // Character deposition/context
  question: string;           // The question being asked
  expectedAnswer: string;     // The correct answer
  studentAnswer: string;      // User's answer to validate
  failAnswers?: string[];     // Answers that should always result in FAIL
}

export interface AIPromptTestRequest {
  prompt: string;
}

export interface AIValidationResponse {
  response?: string;  // Raw response (for prompt testing)
  isCorrect?: boolean;  // PASS = true, FAIL = false
  error?: string;
}

export interface AIFeedbackRequest {
  deposition: string;         // Character deposition
  question: string;           // The question that was asked
  incorrectAnswer: string;    // User's incorrect answer
}

export interface AIFeedbackResponse {
  feedback?: string;          // Single sentence in-character response
  error?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// REST API Handler
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Raw prompt testing handler - returns AI response without any parsing
 * Used by the Prompt Testing Editor to test prompts and see raw output
 */
export async function handlePromptTest(req: Request, res: Response): Promise<void> {
  try {
    const { prompt } = req.body as AIPromptTestRequest;

    console.log('🧪 Prompt test request received');
    console.log('📤 PROMPT BEING SENT:');
    console.log('─'.repeat(60));
    console.log(prompt);
    console.log('─'.repeat(60));

    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    if (!OPENAI_API_KEY) {
      res.status(500).json({ error: 'OpenAI API key not configured' });
      return;
    }

    // Call OpenAI for full responses
    console.log('🤖 Calling OpenAI with model: gpt-5.1-chat-latest');
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1-chat-latest',
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = completion.choices[0]?.message?.content || '';

    console.log('🧪 Prompt test response:');
    console.log('─'.repeat(60));
    console.log(responseText);
    console.log('─'.repeat(60));

    // Return raw response without any parsing
    res.json({ response: responseText });

  } catch (error) {
    console.error('❌ Prompt Test Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
}

export async function handleAIValidation(req: Request, res: Response): Promise<void> {
  try {
    const { context, question, expectedAnswer, studentAnswer, failAnswers } = req.body as AIValidationRequest;

    console.log('📥 Validation request received:', {
      context: context?.substring(0, 50) || 'none',
      question: question?.substring(0, 50) || 'none',
      expectedAnswer,
      studentAnswer,
      failAnswers: failAnswers?.length || 0
    });

    // Validate required fields
    if (!question?.trim()) {
      res.status(400).json({
        error: 'Question is required'
      } as AIValidationResponse);
      return;
    }

    if (!expectedAnswer?.trim()) {
      res.status(400).json({
        error: 'Expected answer is required'
      } as AIValidationResponse);
      return;
    }

    if (!studentAnswer?.trim()) {
      res.status(400).json({
        error: 'Student answer is required'
      } as AIValidationResponse);
      return;
    }

    if (!OPENAI_API_KEY) {
      res.status(500).json({
        error: 'OpenAI API key not configured'
      } as AIValidationResponse);
      return;
    }

    // Build the PASS/FAIL validation prompt
    let validationPrompt = `You are a friendly teacher evaluating whether a student's answer expresses
the same essential meaning as the expected answer. Judge based on meaning,
not exact details. Young children often omit or simplify descriptive
information—interpret generously.

You must return:
PASS or FAIL

-------------------------------------------
CORE MEANING RULE
-------------------------------------------
Identify the *core idea* of the expected answer.
Details such as color, size, age category, material, or adjectives are
NOT required for a PASS unless they change the fundamental meaning.

-------------------------------------------
PASS CONDITIONS
-------------------------------------------
PASS if the student's answer:
• conveys the same basic idea,
• correctly identifies the core item or concept,
• gives a simplified or partial version that still matches the meaning,
• uses a related or contextually equivalent term,
• omits non-essential modifiers but keeps the concept intact.

-------------------------------------------
FAIL CONDITIONS
-------------------------------------------
FAIL only if the student:
• gives a different or unrelated concept,
• contradicts the expected meaning,
• is too vague to show understanding,
• or replaces the idea with something meaningfully different.

-------------------------------------------
OUTPUT FORMAT (JSON)
You MUST respond with valid JSON in this exact format:
{"result": "PASS"}
or
{"result": "FAIL"}`;

    // Add FAIL answers section if provided
    if (failAnswers && failAnswers.length > 0) {
      validationPrompt += `\n\n-------------------------------------------
FAIL ANSWERS
-------------------------------------------
The following answers should always result in FAIL:`;
      failAnswers.forEach((failAnswer) => {
        validationPrompt += `\n• "${failAnswer}"`;
      });
    }

    // Add the INPUT section
    validationPrompt += `\n\n-------------------------------------------
INPUT
Context: "${context || ''}"
Question: "${question}"
Expected Answer: "${expectedAnswer}"
Student Answer: "${studentAnswer}"`;

    console.log('🤖 Calling OpenAI with model: gpt-5.1-chat-latest');
    console.log('📤 Built validation prompt:', {
      promptLength: validationPrompt.length,
      hasContext: !!context,
      hasFailAnswers: failAnswers && failAnswers.length > 0
    });

    // Call OpenAI Chat Completions API with the validation prompt
    // Using JSON response format for reliable parsing
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1-chat-latest',
      messages: [
        {
          role: 'user',
          content: validationPrompt
        }
      ],
      response_format: { type: 'json_object' }
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

    // Parse JSON response
    let isCorrect: boolean;

    try {
      const jsonResponse = JSON.parse(responseText);
      isCorrect = jsonResponse.result?.toUpperCase() === 'PASS';
    } catch (parseError) {
      // Fallback: try to extract from text if JSON parsing fails
      console.warn('⚠️  JSON parsing failed, falling back to text parsing:', parseError);
      const upperResponse = responseText.toUpperCase();
      isCorrect = upperResponse.includes('PASS') && !upperResponse.includes('FAIL');
    }

    console.log('✅ AI Validation Response:', {
      model: 'gpt-5.1-chat-latest',
      isCorrect,
      timestamp: new Date().toISOString()
    });

    // Return PASS/FAIL result
    res.json({
      isCorrect
    } as AIValidationResponse);

  } catch (error) {
    console.error('❌ AI Validation Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    res.status(500).json({
      error: errorMessage
    } as AIValidationResponse);
  }
}

/**
 * Generate in-character feedback for incorrect answer
 * Takes deposition, question, and incorrect answer - builds prompt internally
 */
export async function handleAIFeedback(req: Request, res: Response): Promise<void> {
  try {
    const { deposition, question, incorrectAnswer } = req.body as AIFeedbackRequest;

    console.log('📥 Feedback request received:', {
      depositionLength: deposition?.length || 0,
      question: question?.substring(0, 50) || 'none',
      incorrectAnswer
    });

    // Validate required fields
    if (!deposition?.trim()) {
      res.status(400).json({ error: 'Deposition is required' } as AIFeedbackResponse);
      return;
    }

    if (!incorrectAnswer?.trim()) {
      res.status(400).json({ error: 'Incorrect answer is required' } as AIFeedbackResponse);
      return;
    }

    if (!OPENAI_API_KEY) {
      res.status(500).json({ error: 'OpenAI API key not configured' } as AIFeedbackResponse);
      return;
    }

    // Build the feedback prompt
    const feedbackPrompt = `DEPOSITION:
${deposition}

QUESTION:
${question || ''}

INCORRECT_ANSWER:
${incorrectAnswer}

AI_INSTRUCTIONS:
You are generating a single in-character sentence in response to a child's incorrect statement.

Produce exactly one sentence, spoken in character, that:
1. Clearly but politely says that the student's statement is not true within the world of the DEPOSITION.
2. Uses only ideas, tone, personality, and facts found in the DEPOSITION, plus the INCORRECT_ANSWER.
3. Does NOT mention, hint at, or allude to what is actually true in the story.
4. Does NOT help, guide, encourage, or invite the student to try again.
5. Does NOT mention questions, guesses, right/wrong answers, or anything meta.
6. May include small, harmless world-building details consistent with the deposition as long as they do not add new story-relevant clues.
7. Must not introduce anything new that changes the plot.
8. Contains no quotation marks.
9. Ends immediately after one sentence.
10. You must NEVER mention, reference, or describe the item or solution that would direclty answer the child's QUESTION, even if it appears in the DEPOSITION.

Write only one sentence, in-character, that directly responds to the INCORRECT_ANSWER by denying it in a natural, flavorful way without revealing or hinting at the true situation.`;

    // Debug: Log the exact prompt being sent (toggle this for debugging)
    const DEBUG_SHOW_PROMPT = true;
    if (DEBUG_SHOW_PROMPT) {
      console.log('📤 FEEDBACK PROMPT BEING SENT:');
      console.log('─'.repeat(60));
      console.log(feedbackPrompt);
      console.log('─'.repeat(60));
    }

    console.log('🤖 Calling OpenAI with model: gpt-5.1-chat-latest');

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1-chat-latest',
      messages: [{ role: 'user', content: feedbackPrompt }]
    });

    const feedbackText = completion.choices[0]?.message?.content || '';

    if (!feedbackText.trim()) {
      res.status(500).json({ error: 'Received empty response from AI' } as AIFeedbackResponse);
      return;
    }

    console.log('✅ Feedback generated:', feedbackText);

    res.json({ feedback: feedbackText } as AIFeedbackResponse);

  } catch (error) {
    console.error('❌ AI Feedback Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage } as AIFeedbackResponse);
  }
}
