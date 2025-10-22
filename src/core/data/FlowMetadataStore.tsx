/**
 * FlowMetadataStore - Single Source of Truth for flow-level metadata
 *
 * Stores metadata for character-flow scenes, such as:
 * - characterDescription: Used for AI chat context
 * - successAnswer: Expected phrase for quest completion
 *
 * Each character-flow gets a unique flowId, and scenes reference it.
 * This avoids data duplication across multiple scenes in the same flow.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface InputMetadata {
  characterDescription?: string; // For input items
  questText?: string; // For quest items
  successAnswer: string; // Success phrase for both
}

export interface FlowMetadataMap {
  [flowId: string]: InputMetadata;
}

interface FlowMetadataContextValue {
  metadata: FlowMetadataMap;
  setFlowMetadata: (flowId: string, data: InputMetadata) => void;
  getFlowMetadata: (flowId: string) => InputMetadata | undefined;
  clearAllMetadata: () => void;
}

const FlowMetadataContext = createContext<FlowMetadataContextValue | null>(null);

export function FlowMetadataProvider({ children }: { children: React.ReactNode }) {
  const [metadata, setMetadata] = useState<FlowMetadataMap>({});

  const setFlowMetadata = useCallback((flowId: string, data: InputMetadata) => {
    setMetadata(prev => ({
      ...prev,
      [flowId]: data
    }));
  }, []);

  const getFlowMetadata = useCallback((flowId: string): InputMetadata | undefined => {
    return metadata[flowId];
  }, [metadata]);

  const clearAllMetadata = useCallback(() => {
    setMetadata({});
  }, []);

  const value: FlowMetadataContextValue = {
    metadata,
    setFlowMetadata,
    getFlowMetadata,
    clearAllMetadata
  };

  return (
    <FlowMetadataContext.Provider value={value}>
      {children}
    </FlowMetadataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFlowMetadata() {
  const context = useContext(FlowMetadataContext);
  if (!context) {
    throw new Error('useFlowMetadata must be used within FlowMetadataProvider');
  }
  return context;
}

/**
 * Convenience hook to get metadata for a specific scene by its flowId
 * Returns undefined if the scene has no flowId or no metadata is found
 *
 * @param scene - Scene object that may contain a flowId reference
 * @returns InputMetadata or undefined
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSceneFlowMetadata(scene: { flowId?: string } | null | undefined): InputMetadata | undefined {
  const { getFlowMetadata } = useFlowMetadata();

  if (!scene?.flowId) {
    return undefined;
  }

  return getFlowMetadata(scene.flowId);
}
