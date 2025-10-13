/**
 * Dialogue module exports
 * Provides dialogue management, orchestration, and message handling
 */

export { DialogueProvider, useDialogue } from './DialogueContext';
export { useChatFlowOrchestrator, type ChatFlowOrchestratorProps } from './ChatFlowOrchestrator';
export type { Message, ConversationTurn } from './types';
