/**
 * useAIModule hook
 * Separated from AIModule.tsx to comply with react-refresh/only-export-components
 */
import { useContext } from 'react';
import { AIModuleContext } from './AIModuleContext';

export function useAIModule() {
  const ctx = useContext(AIModuleContext);
  if (!ctx) {
    throw new Error('useAIModule must be used within AIModuleProvider');
  }
  return ctx;
}
