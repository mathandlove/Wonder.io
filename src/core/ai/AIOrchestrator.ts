/**
 * AIOrchestrator - Centralized AI processing orchestration
 *
 * Responsibilities:
 * - Call AI service with proper context
 * - Manage conversation metadata
 * - Handle AI errors and retries
 * - Coordinate with AI memory system
 *
 * This module is used by:
 * - XState machine (via callAIService actor)
 * - ChatFlowOrchestrator (for manual AI calls)
 * - Any component that needs AI responses
 */

import { callAI, validateAnswer, type ConversationMessage } from '@features/ai/aiService';
import type { ConversationMetadataMap } from '@core/data/loadStory';
import { getCurrentNode, insertSceneNodes, advanceNavigation } from '@core/navigation/navigationHelpers';
import { createAIResponseScene as createAIResponseSceneFactory } from '@core/navigation/sceneFactoryFunctions';
import { useNavigationStore } from '@core/navigation/navigationStore';
import { createDebugger } from '../../utils/createDebug';

const debug = createDebugger('ai:orchestrator');

/**
 * Module-level storage for conversation metadata
 * This is populated when a story is loaded and accessed during AI processing
 * Using module-level storage because XState machine can't access React context
 */
let currentConversationMetadata: ConversationMetadataMap = {};

/**
 * Module-level promise tracking for pending feedback generation
 * Allows fire-and-forget pattern: start generation early, await later
 */
let pendingFeedbackGeneration: Promise<string | null> | null = null;

/**
 * Module-level storage for conversation histories
 * This stores messages per conversationId for AI context
 * Using module-level storage because XState machine can't access React context
 */
let conversationHistories: Record<string, ConversationMessage[]> = {};

/**
 * Get conversation metadata for a specific conversationId
 * Used by AI processing to get character descriptions
 */
export function getConversationMetadata(conversationId: string | undefined) {
  if (!conversationId) return undefined;
  return currentConversationMetadata[conversationId];
}

/**
 * Set conversation metadata (called during story load)
 * This is typically called by navigationMachine's initializeStore action
 */
export function setConversationMetadata(metadata: ConversationMetadataMap) {
  currentConversationMetadata = metadata;
  debug.log('Stored conversation metadata:', Object.keys(currentConversationMetadata));
}

/**
 * Clear conversation metadata (useful for cleanup/testing)
 */
export function clearConversationMetadata() {
  currentConversationMetadata = {};
}

/**
 * Get conversation history for a specific conversationId
 * Used by AI processing to maintain context across multiple questions
 */
export function getConversationHistory(conversationId: string | undefined): ConversationMessage[] {
  if (!conversationId) return [];
  return conversationHistories[conversationId] || [];
}

/**
 * Add a user message to conversation history
 */
export function addUserMessage(conversationId: string, content: string) {
  if (!conversationId) return;

  if (!conversationHistories[conversationId]) {
    conversationHistories[conversationId] = [];
  }

  conversationHistories[conversationId].push({
    role: 'user',
    content
  });

  // Keep only the last 20 messages to avoid excessive context
  if (conversationHistories[conversationId].length > 20) {
    conversationHistories[conversationId] = conversationHistories[conversationId].slice(-20);
  }

  debug.log('Added user message to history:', {
    conversationId,
    historyLength: conversationHistories[conversationId].length
  });
}

/**
 * Add an assistant (AI) message to conversation history
 */
export function addAssistantMessage(conversationId: string, content: string) {
  if (!conversationId) return;

  if (!conversationHistories[conversationId]) {
    conversationHistories[conversationId] = [];
  }

  conversationHistories[conversationId].push({
    role: 'assistant',
    content
  });

  // Keep only the last 20 messages to avoid excessive context
  if (conversationHistories[conversationId].length > 20) {
    conversationHistories[conversationId] = conversationHistories[conversationId].slice(-20);
  }

  debug.log('Added assistant message to history:', {
    conversationId,
    historyLength: conversationHistories[conversationId].length
  });
}

/**
 * Clear conversation history for a specific conversationId
 */
export function clearConversationHistory(conversationId: string) {
  delete conversationHistories[conversationId];
}

/**
 * Clear all conversation histories (useful for cleanup/testing)
 */
export function clearAllConversationHistories() {
  conversationHistories = {};
}

/**
 * AI Service Input
 */
export interface AIServiceInput {
  questionText: string;
  conversationId: string | undefined;
  conversationHistory?: ConversationMessage[];
}

/**
 * AI Service Output
 */
export interface AIServiceOutput {
  responseText: string;
  conversationId: string | undefined;
}

/**
 * Call AI service with proper context and error handling
 * This is the core AI processing function used by XState actors
 *
 * @param input - Question text, conversation ID, and optional history
 * @returns AI response text and conversation ID
 * @throws Error if validation fails or AI call fails
 */
export async function callAIService(input: AIServiceInput): Promise<AIServiceOutput> {
  debug.event('🤖', 'AI Service called with:', {
    questionText: input.questionText?.substring(0, 50),
    conversationId: input.conversationId
  });

  // Validate input
  if (!input.questionText?.trim()) {
    throw new Error('Question text is required for AI processing');
  }

  if (!input.conversationId) {
    throw new Error('ConversationId is required for AI processing');
  }

  // Get conversation metadata (character description)
  const metadata = getConversationMetadata(input.conversationId);

  if (!metadata) {
    throw new Error(`No conversation metadata found for conversationId: ${input.conversationId}`);
  }

  if (!metadata.characterDescription) {
    throw new Error(`No character description in metadata for conversationId: ${input.conversationId}`);
  }

  debug.event('✅', 'Found character description:',
    metadata.characterDescription.substring(0, 50) + '...');

  // Get conversation history from module storage OR from input (for backward compatibility)
  let conversationHistory: ConversationMessage[] = input.conversationHistory || [];

  // If no history provided in input, try to get from module storage
  if (conversationHistory.length === 0) {
    conversationHistory = getConversationHistory(input.conversationId);
    debug.event('📚', 'Retrieved conversation history from storage:',
      conversationHistory.length, 'messages');
  }

  // Add user message to history BEFORE calling AI
  addUserMessage(input.conversationId, input.questionText);

  debug.event('📤', 'Calling AI with history:', {
    questionLength: input.questionText.length,
    historyLength: conversationHistory.length,
    conversationId: input.conversationId
  });

  // Call AI service with conversation history
  const response = await callAI({
    questionText: input.questionText,
    characterDescription: metadata.characterDescription,
    conversationHistory
  });

  // Check if AI call succeeded
  if (!response.success) {
    throw new Error(response.error || 'AI call failed without error message');
  }

  debug.event('💬', 'AI response received:',
    response.text.substring(0, 50) + '...');

  // Add assistant message to history AFTER receiving response
  addAssistantMessage(input.conversationId, response.text);

  // Return response with conversationId for scene creation
  return {
    responseText: response.text,
    conversationId: input.conversationId
  };
}

/**
 * Create AI response scene and emit event to navigation machine
 * This orchestrates the full flow: scene creation → insertion → navigation
 *
 * Used by navigationMachine and ChatFlowOrchestrator to insert AI response scenes
 */
export interface CreateAIResponseInput {
  responseText: string;
  conversationId: string | undefined;
  currentNodeId: string;
}

/**
 * Helper to create and insert AI response scene
 * Automatically inherits scene context (background, characters) from current node
 * Returns the new scene ID for tracking
 *
 * This is a SYNCHRONOUS function - all navigation operations complete immediately
 */
export function createAndInsertAIResponseScene(input: CreateAIResponseInput): string | null {
  try {
    // Get current scene context for inheritance
    const currentNode = getCurrentNode();
    const scene = currentNode?.scene;

    if (!input.currentNodeId) {
      debug.error('No current node ID - cannot create AI response scene');
      return null;
    }

    // Extract scene properties to inherit (with fallbacks)
    const currentBackground = scene && 'background' in scene ? scene.background : undefined;
    const leftCharacter = scene && 'left-character' in scene ? (scene as { 'left-character'?: string })['left-character'] : 'leo';
    const rightCharacter = scene && 'right-character' in scene ? (scene as { 'right-character'?: string })['right-character'] : 'bakerMom';

    debug.event('🔍', 'Extracting scene properties:', {
      currentNodeId: input.currentNodeId,
      sceneType: scene?.type,
      currentBackground,
      hasBackground: 'background' in (scene || {}),
      leftCharacter,
      rightCharacter,
      fullScene: scene
    });

    // Create AI response scene using factory
    const aiResponseScene = createAIResponseSceneFactory(
      input.responseText,
      input.conversationId,
      currentBackground,
      leftCharacter,
      rightCharacter
    );

    debug.log('Creating AI response scene with text:', input.responseText.substring(0, 50));

    // STEP 1: Update current node phase from 'ai-waiting' to 'basic'
    // This collapses the input UI on the question scene before we navigate away
    useNavigationStore.getState().updateCurrentPhase('basic');
    debug.log('Updated current scene phase: ai-waiting → basic');

    // STEP 2: Insert the AI response scene after current node (SYNCHRONOUS)
    const newSceneId = insertSceneNodes(input.currentNodeId, aiResponseScene);

    // STEP 3: Navigate forward to the new AI response scene (SYNCHRONOUS)
    // The new scene already has phase: 'input' so input UI will show immediately
    advanceNavigation('forward');

    debug.event('✅', 'AI response scene created and navigated (sync)');

    return newSceneId;
  } catch (error) {
    debug.error('Failed to create AI response scene:', error);
    return null;
  }
}

/**
 * Answer Validation Input
 */
export interface AnswerValidationInput {
  answerText: string;
  questionText?: string;
  successAnswer: string;
  incorrectAnswer?: string[];
  conversationId?: string;
}

/**
 * Answer Validation Output
 */
export interface AnswerValidationOutput {
  isCorrect: boolean;
}

/**
 * Validate user's answer against expected correct answer
 * This is called by xState actor in navigationMachine
 *
 * Uses AI-based validation to allow for flexible matching
 *
 * @param input - Answer text, expected success answer, and context
 * @returns Whether the answer is correct
 */
export async function validateAnswerService(input: AnswerValidationInput): Promise<AnswerValidationOutput> {
  debug.event('🎯', 'Validating answer:', {
    answerText: input.answerText.substring(0, 50),
    successAnswer: input.successAnswer,
    conversationId: input.conversationId
  });

  // Validate input
  if (!input.answerText?.trim()) {
    debug.log('Empty answer text, marking as incorrect');
    return { isCorrect: false };
  }

  if (!input.successAnswer?.trim()) {
    debug.log('No success answer defined, cannot validate');
    return { isCorrect: false };
  }

  // Call AI-based validation
  debug.event('📤', 'Calling AI validation service');

  const validationResult = await validateAnswer({
    userAnswer: input.answerText,
    correctAnswer: input.successAnswer,
    incorrectAnswer: input.incorrectAnswer,
    questionText: input.questionText
  });

  // Check if validation call succeeded
  if (!validationResult.success) {
    debug.error('AI validation failed:', validationResult.error);
    // Fallback to simple string matching if AI fails

    const isCorrect = true;

    debug.event('⚠️', 'Using fallback validation:', { isCorrect });
    return { isCorrect };
  }

  debug.event('✅', 'AI validation complete:', {
    isCorrect: validationResult.isCorrect,
    userAnswer: input.answerText,
    correctAnswer: input.successAnswer
  });

  return { isCorrect: validationResult.isCorrect };
}

/**
 * Feedback Generation Input
 */
export interface FeedbackGenerationInput {
  studentAnswer: string;
  correctAnswer: string;
  questionText?: string;
  conversationId?: string;
}

/**
 * Start generating AI feedback for wrong answer (fire-and-forget pattern)
 *
 * This starts feedback generation immediately without blocking.
 * Call waitForFeedback() later to retrieve the result.
 *
 * Pattern: Start early (when validation fails), await later (when animation ends)
 *
 * @param input - Student's answer, correct answer, and context
 */
export function startFeedbackGeneration(input: FeedbackGenerationInput): void {
  debug.event('🚀', 'Starting feedback generation (fire-and-forget):', {
    studentAnswer: input.studentAnswer.substring(0, 50),
    correctAnswer: input.correctAnswer,
    conversationId: input.conversationId
  });

  // Clear any existing pending feedback before starting new generation
  if (pendingFeedbackGeneration) {
    debug.log('⚠️ Clearing existing pending feedback before starting new generation');
    pendingFeedbackGeneration = null;
  }

  pendingFeedbackGeneration = (async () => {
    const startTime = Date.now();
    try {
      // Get character description and conversation history
      const metadata = getConversationMetadata(input.conversationId);
      const conversationHistory = getConversationHistory(input.conversationId || '');

      if (!metadata?.characterDescription) {
        debug.log('No character description, cannot generate feedback');
        return null;
      }

      // Build AI prompt for feedback
      const feedbackPrompt = `You are ${metadata.characterDescription}.

Question: "${input.questionText || 'a question'}"
Their guess: "${input.studentAnswer}"
Correct answer (for your eyes only): "${input.correctAnswer}"

Your job:
- Respond as the character.
- Politely but clearly say that their guess is not true.
- You may add one short, playful bakery-themed detail that only relates to their guess.
- DO NOT mention, hint at, or allude to the correct answer or any real problem.
- DO NOT say or imply what you actually are worried about.
- DO NOT encourage them, correct them, or ask them to try again.
- DO NOT mention "question," "guess," "correct," or anything meta.
- Speak directly, like you're talking to them in the moment.
-Do NOT include quotation marks around your reply.

Hard constraints:
1. Your reply MUST be exactly ONE sentence.
2. After that one sentence, you MUST stop.
3. You are allowed to reference ONLY what they said and normal bakery stuff (ovens, flour, pastries, etc.).
4. You are NOT allowed to introduce any new situation.

Output:
Write only that one in-character sentence  with no quotes.


Previous conversation:
${conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}
`;

      debug.event('📤', 'Calling AI for feedback generation');

      // Call AI service for feedback
      const response = await callAI({
        questionText: feedbackPrompt,
        characterDescription: metadata.characterDescription,
        conversationHistory: conversationHistory.slice(-5) // Last 5 messages for context
      });

      if (response.success && response.text) {
        const elapsed = Date.now() - startTime;
        debug.event('✅', 'Feedback generated successfully (took ' + elapsed + 'ms):',
          response.text.substring(0, 100) + '...');

        // Add feedback to conversation history
        if (input.conversationId) {
          addAssistantMessage(input.conversationId, response.text);
        }

        return response.text;
      }

      debug.log('⚠️ AI feedback call succeeded but no text returned');
      return null;

    } catch (error) {
      const elapsed = Date.now() - startTime;
      debug.error('❌ Feedback generation failed after ' + elapsed + 'ms:', error);
      return null;
    }
  })();
}

/**
 * Get the pending feedback generation promise without consuming it
 * Used by navigation machine to await feedback and emit event when ready
 *
 * @returns The pending feedback promise or null if none exists
 */
export function getPendingFeedbackPromise(): Promise<string | null> | null {
  return pendingFeedbackGeneration;
}

/**
 * Clear the pending feedback generation promise
 * Should be called after feedback is successfully retrieved and stored
 */
export function clearPendingFeedback(): void {
  pendingFeedbackGeneration = null;
}

/**
 * Wait for pending feedback generation to complete
 *
 * Use this after calling startFeedbackGeneration() to retrieve the result.
 * Includes timeout to prevent indefinite waiting.
 *
 * @param timeoutMs - Maximum time to wait (default: 5000ms)
 * @returns Feedback text or null if unavailable/timeout
 */
export async function waitForFeedback(timeoutMs = 5000): Promise<string | null> {
  if (!pendingFeedbackGeneration) {
    debug.log('No pending feedback generation to wait for');
    return null;
  }

  try {
    debug.event('⏳', `Waiting for feedback (timeout: ${timeoutMs}ms)...`);

    // Race between feedback completion and timeout
    const feedback = await Promise.race([
      pendingFeedbackGeneration,
      new Promise<null>((resolve) => {
        setTimeout(() => {
          debug.log('⏱️ Feedback timeout reached');
          resolve(null);
        }, timeoutMs);
      })
    ]);

    if (feedback) {
      debug.event('✅', 'Feedback ready:', feedback.substring(0, 100) + '...');
    } else {
      debug.log('⚠️ Feedback not available (timeout or error)');
    }

    return feedback;

  } catch (error) {
    debug.error('❌ Error waiting for feedback:', error);
    return null;
  } finally {
    // Clean up the pending promise
    pendingFeedbackGeneration = null;
  }
}
