/**
 * ConversationMetadataStore - Single Source of Truth for conversation-level metadata
 *
 * Stores metadata for character-flow scenes, such as:
 * - characterDescription: Used for AI chat context
 * - successAnswer: Expected phrase for quest completion
 *
 * Each character-flow gets a unique conversationId, and scenes reference it.
 * This avoids data duplication across multiple scenes in the same conversation.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ConversationMetadata {
  characterDescription?: string; // For input items
  questText?: string; // For quest items
  successAnswer: string; // Success phrase for both
}

export interface ConversationMetadataMap {
  [conversationId: string]: ConversationMetadata;
}

interface ConversationMetadataContextValue {
  metadata: ConversationMetadataMap;
  setConversationMetadata: (conversationId: string, data: ConversationMetadata) => void;
  getConversationMetadata: (conversationId: string) => ConversationMetadata | undefined;
  clearAllMetadata: () => void;
}

const ConversationMetadataContext = createContext<ConversationMetadataContextValue | null>(null);

export function ConversationMetadataProvider({ children }: { children: React.ReactNode }) {
  const [metadata, setMetadata] = useState<ConversationMetadataMap>({});

  const setConversationMetadata = useCallback((conversationId: string, data: ConversationMetadata) => {
    setMetadata(prev => ({
      ...prev,
      [conversationId]: data
    }));
  }, []);

  const getConversationMetadata = useCallback((conversationId: string): ConversationMetadata | undefined => {
    return metadata[conversationId];
  }, [metadata]);

  const clearAllMetadata = useCallback(() => {
    setMetadata({});
  }, []);

  const value: ConversationMetadataContextValue = {
    metadata,
    setConversationMetadata,
    getConversationMetadata,
    clearAllMetadata
  };

  return (
    <ConversationMetadataContext.Provider value={value}>
      {children}
    </ConversationMetadataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConversationMetadata() {
  const context = useContext(ConversationMetadataContext);
  if (!context) {
    throw new Error('useConversationMetadata must be used within ConversationMetadataProvider');
  }
  return context;
}

/**
 * Convenience hook to get metadata for a specific scene by its conversationId
 * Returns undefined if the scene has no conversationId or no metadata is found
 *
 * @param scene - Scene object that may contain a conversationId reference
 * @returns ConversationMetadata or undefined
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSceneConversationMetadata(scene: { conversationId?: string } | null | undefined): ConversationMetadata | undefined {
  const { getConversationMetadata } = useConversationMetadata();

  if (!scene?.conversationId) {
    return undefined;
  }

  return getConversationMetadata(scene.conversationId);
}

// ============================================================================
// Legacy exports for backwards compatibility (will be removed later)
// ============================================================================
export type InputMetadata = ConversationMetadata;
export type FlowMetadataMap = ConversationMetadataMap;
export const FlowMetadataProvider = ConversationMetadataProvider;
export const useFlowMetadata = useConversationMetadata;
export const useSceneFlowMetadata = useSceneConversationMetadata;
