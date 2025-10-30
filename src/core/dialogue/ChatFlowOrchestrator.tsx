/**
 * ChatFlowOrchestrator.tsx
 * Orchestrates the chat conversation flow:
 * 1) Listens for transcript completion from recording
 * 2) Calls AI module to get AI response
 * 3) Creates response scenes using SceneFactory
 * 4) Manages scene insertion via NodeManager
 * 5) Handles errors and state transitions
 *
 * This component coordinates between:
 * - Recording system (getting transcript)
 * - AI Module (getting AI response)
 * - SceneFactory (creating scenes)
 * - NodeManager (inserting scenes into navigation)
 */

import { useCallback } from 'react';
import { useAIModule } from '@features/ai/useAIModule';
import { useSceneFactory } from '@core/navigation/SceneFactory';
import { getCurrentNode, getCurrentNodeId, updateNodeState, insertSceneNodes, forceAdvanceNavigation } from '@core/navigation/navigationHelpers';
import { useSceneFlowMetadata } from '@core/data/FlowMetadataStore';
import { useAIMemory } from '@core/ai/useAIMemory';
import type { CharacterScene, Scene } from '@core/types/scene';

// Type guard for scenes with character properties
type SceneWithCharacters = Scene & {
  'left-character'?: string;
  'right-character'?: string;
};

function hasCharacterProperties(scene: Scene | undefined | null): scene is SceneWithCharacters {
  return scene !== null && scene !== undefined &&
    ('left-character' in scene || 'right-character' in scene);
}

// Type guard for scenes with flowId
type SceneWithFlowId = Scene & {
  flowId?: string;
};

function hasFlowId(scene: Scene | undefined | null): scene is SceneWithFlowId {
  return scene !== null && scene !== undefined && 'flowId' in scene;
}

export interface ChatFlowOrchestratorProps {
  onError?: (error: string) => void;
  onResponseReceived?: (responseText: string) => void;
  onSceneCreated?: (scene: CharacterScene) => void;
}

export interface UserInput {
  text: string;
  recordingId?: string;
  metadata?: {
    timestamp?: Date;
    speaker?: 'left' | 'right';
    currentBackground?: string;
    leftCharacter?: string;
    rightCharacter?: string;
    characterDescription?: string;
  };
}

export function useChatFlowOrchestrator(props?: ChatFlowOrchestratorProps) {
  const { onError, onResponseReceived, onSceneCreated } = props || {};

  const aiModule = useAIModule();
  const sceneFactory = useSceneFactory();
  const aiMemory = useAIMemory();

  // Get current scene to access flow metadata
  const currentNavItem = getCurrentNode();
  const currentScene = currentNavItem?.scene;
  const flowMetadata = useSceneFlowMetadata(hasFlowId(currentScene) ? currentScene : null);

  /**
   * Main orchestration function:
   * Takes user input, gets AI response, creates and inserts scenes
   */
  const processUserInput = useCallback(async (input: UserInput): Promise<void> => {


    try {
      // Step 1: Get the current scene context for scene creation
      const currentNavItem = getCurrentNode();
      const currentScene = currentNavItem?.scene;

      // Extract context from current scene or use metadata
      const background = input.metadata?.currentBackground ||
        (currentScene && 'background' in currentScene ? currentScene.background : undefined);
      const leftCharacter = input.metadata?.leftCharacter ||
        (hasCharacterProperties(currentScene) ? currentScene['left-character'] : undefined);
      const rightCharacter = input.metadata?.rightCharacter ||
        (hasCharacterProperties(currentScene) ? currentScene['right-character'] : undefined);



      // Step 2: Get conversation history and call AI module
      // Use flowId from current scene to maintain character-specific conversations
      const flowId = hasFlowId(currentScene) ? currentScene.flowId : undefined;
      const conversationHistory = flowId ? aiMemory.getHistory(flowId) : [];

      // Add user message to conversation history BEFORE calling AI
      if (flowId) {
        aiMemory.addUserMessage(flowId, input.text);
      }

      const response = await aiModule.getResponse({
        text: input.text,
        conversationHistory,
        context: {
          characterDescription: input.metadata?.characterDescription
        }
      });

      if (!response.success) {
        const errorMsg = response.error || 'Failed to get AI response';
        console.error('❌ AI Module failed:', errorMsg);
        onError?.(errorMsg);
        return;
      }


      onResponseReceived?.(response.text);

      // Add assistant response to conversation history AFTER receiving it
      if (flowId) {
        aiMemory.addAssistantMessage(flowId, response.text);
      }

      // Step 3: Create a new AI response scene using SceneFactory
      // IMPORTANT: Preserve flowId so subsequent questions maintain conversation context
      const finalScene = sceneFactory.createAIResponseScene(
        response.text,
        flowId,
        background,
        leftCharacter,
        rightCharacter
      );

      onSceneCreated?.(finalScene);

      // Step 4: Update previous node state to 'basic' (remove input UI, locks auto-recalculated)
      // This collapses the recording input UI from the previous scene
      const currentNodeId = getCurrentNodeId();
      if (currentNodeId) {
        updateNodeState(currentNodeId, {
          type: 'dialogue' as const,
          state: 'basic' as const
        });
      }

      // Step 5: Insert the scene after current node
      // This properly maintains the state-node graph structure
      // TODO: [Navigation Refactor] Replace with event bus emission
      // emit({ type: 'AI_DONE', nodeId: currentNodeId, response: aiText })
      insertSceneNodes(currentNodeId, finalScene);

      // Step 6: Navigate to the new scene
      forceAdvanceNavigation('forward');


    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error in chat flow';
      console.error('❌ ChatFlowOrchestrator error:', errorMessage);
      onError?.(errorMessage);
    }
  }, [aiModule, sceneFactory, aiMemory, onError, onResponseReceived, onSceneCreated]);

  /**
   * Convenience function for processing transcript completion
   * Automatically fills in metadata from current scene context
   */
  const processTranscript = useCallback(async (
    transcript: string,
    recordingId?: string
  ): Promise<void> => {
    console.log('📝 [ChatFlowOrchestrator] processTranscript called:', {
      transcript,
      recordingId,
      characterDescription: flowMetadata?.characterDescription,
      leftCharacter: hasCharacterProperties(currentScene) ? currentScene['left-character'] : undefined,
      rightCharacter: hasCharacterProperties(currentScene) ? currentScene['right-character'] : undefined,
    });

    const input: UserInput = {
      text: transcript,
      recordingId,
      metadata: {
        timestamp: new Date(),
        speaker: 'left',
        currentBackground: currentScene && 'background' in currentScene ? currentScene.background : undefined,
        leftCharacter: hasCharacterProperties(currentScene) ? currentScene['left-character'] : undefined,
        rightCharacter: hasCharacterProperties(currentScene) ? currentScene['right-character'] : undefined,
        characterDescription: flowMetadata?.characterDescription,
      }
    };

    console.log('🎯 [ChatFlowOrchestrator] About to call processUserInput with:', input);
    await processUserInput(input);
  }, [currentScene, flowMetadata, processUserInput]);

  return {
    processUserInput,
    processTranscript,
    isProcessing: aiModule.isProcessing,
    lastError: aiModule.lastError
  };
}
