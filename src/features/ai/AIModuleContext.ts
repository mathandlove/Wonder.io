/**
 * AIModule Context
 * Separated for react-refresh compliance
 */
import { createContext } from 'react';
import type { AIInput, AIResponse } from './AIModule';

export interface AIModuleContextType {
  isProcessing: boolean;
  lastError?: string;
  getResponse: (input: AIInput) => Promise<AIResponse>;
}

export const AIModuleContext = createContext<AIModuleContextType | undefined>(undefined);
