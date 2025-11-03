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

import { callAI, type ConversationMessage } from '@features/ai/aiService';
import type { ConversationMetadataMap } from '@core/data/loadStory';

/**
 * Module-level storage for conversation metadata
 * This is populated when a story is loaded and accessed during AI processing
 * Using module-level storage because XState machine can't access React context
 */
let currentConversationMetadata: ConversationMetadataMap = {};

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
  console.log('[AIOrchestrator] Stored conversation metadata:', Object.keys(currentConversationMetadata));
}

/**
 * Clear conversation metadata (useful for cleanup/testing)
 */
export function clearConversationMetadata() {
  currentConversationMetadata = {};
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
  console.log('[AIOrchestrator] 🤖 AI Service called with:', {
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

  console.log('[AIOrchestrator] ✅ Found character description:',
    metadata.characterDescription.substring(0, 50) + '...');

  // Get conversation history (fallback to empty array if not provided)
  const conversationHistory: ConversationMessage[] = input.conversationHistory || [];

  // Call AI service
  const response = await callAI({
    questionText: input.questionText,
    characterDescription: metadata.characterDescription,
    conversationHistory
  });

  // Check if AI call succeeded
  if (!response.success) {
    throw new Error(response.error || 'AI call failed without error message');
  }

  console.log('[AIOrchestrator] 💬 AI response received:',
    response.text.substring(0, 50) + '...');

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
 */
export function createAndInsertAIResponseScene(input: CreateAIResponseInput): string | null {
  // Import dependencies here to avoid circular dependencies
  const { getCurrentNode, insertSceneNodes, advanceNavigation } = require('@core/navigation/navigationHelpers');
  const { createAIResponseScene } = require('@core/navigation/sceneFactoryFunctions');
  const { useNavigationStore } = require('@core/navigation/navigationStore');

  try {
    // Get current scene context for inheritance
    const currentNode = getCurrentNode();
    const scene = currentNode?.scene;

    if (!input.currentNodeId) {
      console.error('[AIOrchestrator] No current node ID - cannot create AI response scene');
      return null;
    }

    // Extract scene properties to inherit (with fallbacks)
    const currentBackground = scene && 'background' in scene ? scene.background : undefined;
    const leftCharacter = scene && 'left-character' in scene ? (scene as { 'left-character'?: string })['left-character'] : 'leo';
    const rightCharacter = scene && 'right-character' in scene ? (scene as { 'right-character'?: string })['right-character'] : 'bakerMom';

    // Create AI response scene using factory
    const aiResponseScene = createAIResponseScene(
      input.responseText,
      input.conversationId,
      currentBackground,
      leftCharacter,
      rightCharacter
    );

    console.log('[AIOrchestrator] Creating AI response scene with text:', input.responseText.substring(0, 50));

    // Update current node phase to 'basic' (collapse input UI)
    useNavigationStore.getState().updateCurrentPhase('basic');

    // Insert the AI response scene after current node
    const newSceneId = insertSceneNodes(input.currentNodeId, aiResponseScene);

    // Navigate forward to the new AI response scene
    advanceNavigation('forward');

    console.log('[AIOrchestrator] AI response scene created and navigated');

    return newSceneId;
  } catch (error) {
    console.error('[AIOrchestrator] Failed to create AI response scene:', error);
    return null;
  }
}
