/**
 * useAIMemory hook
 * Separated from AIMemoryStore.tsx to comply with react-refresh/only-export-components
 */
import { useContext } from 'react';
import { AIMemoryStoreContext } from './AIMemoryStoreContext';

export function useAIMemory() {
  const ctx = useContext(AIMemoryStoreContext);
  if (!ctx) {
    throw new Error('useAIMemory must be used within AIMemoryStoreProvider');
  }
  return ctx;
}
