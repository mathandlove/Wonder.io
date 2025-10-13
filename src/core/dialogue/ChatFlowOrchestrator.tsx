/**
 * ChatFlowOrchestrator.tsx
 * Orchestrates the chat conversation flow:
 * 1) Listens for transcript completion from recording
 * 2) Calls ChatGateway to get AI response
 * 3) Creates response scenes using PageFactory
 * 4) Manages scene insertion via SceneManager
 * 5) Handles errors and state transitions
 *
 * This component coordinates between:
 * - Recording system (getting transcript)
 * - ChatGateway (getting AI response)
 * - PageFactory (creating scenes)
 * - SceneManager (inserting scenes into navigation)
 */

import { useCallback } from 'react';
import { useChatGateway, type ChatInput } from '@features/chat/gateway/ChatGateway';
import { usePageFactory } from '@core/navigation/PageFactory';
import { useSceneManager } from '@core/scenes/SceneManager';
import type { CharacterScene } from '@core/types/scene';

export interface ChatFlowOrchestratorProps {
  onError?: (error: string) => void;
  onResponseReceived?: (responseText: string) => void;
  onSceneCreated?: (scene: CharacterScene) => void;
}

export function useChatFlowOrchestrator(props?: ChatFlowOrchestratorProps) {
  const { onError, onResponseReceived, onSceneCreated } = props || {};

  const chatGateway = useChatGateway();
  const pageFactory = usePageFactory();
  const sceneManager = useSceneManager();

  /**
   * Main orchestration function:
   * Takes user input, gets AI response, creates and inserts scenes
   */
  const processUserInput = useCallback(async (input: ChatInput): Promise<void> => {


    try {
      // Step 1: Get the current scene context for scene creation
      const currentNavItem = sceneManager.getCurrentNavigationItem();
      const currentScene = currentNavItem?.scene;
      const navigationIndex = sceneManager.navigationIndex;

      // Extract context from current scene or use metadata
      const background = input.metadata?.currentBackground ||
        (currentScene && 'background' in currentScene ? currentScene.background : undefined);
      const leftCharacter = input.metadata?.leftCharacter ||
        ('left-character' in (currentScene || {}) ? (currentScene as any)['left-character'] : undefined);
      const rightCharacter = input.metadata?.rightCharacter ||
        ('right-character' in (currentScene || {}) ? (currentScene as any)['right-character'] : undefined);



      // Step 2: Call ChatGateway to get AI response

      const response = await chatGateway.submitChat(input);

      if (!response.success) {
        const errorMsg = response.error || 'Failed to get chat response';
        console.error('❌ ChatGateway failed:', errorMsg);
        onError?.(errorMsg);
        return;
      }


      onResponseReceived?.(response.text);

      // Step 3: Create a new scene with the AI response

      const responseScene = pageFactory.createRecordingScene(
        `chat-response-${Date.now()}`,
        background,
        leftCharacter,
        rightCharacter
      );

      // Update the scene with response text and proper speaker
      const finalScene: CharacterScene = {
        ...responseScene,
        text: response.text,
        speaker: response.speaker || 'right',
        isRecording: false,
        recordingId: undefined
      };



      onSceneCreated?.(finalScene);

      // Step 4: Update previous scene state to 'basic' (remove input UI)
      // This collapses the recording input UI from the previous scene
      sceneManager.updateNavigationItemState(navigationIndex, {
        type: 'dialogue' as const,
        state: 'basic' as const
      });

      // Step 5: Insert the scene into navigation with 'input-showInput' state
      // This shows the input UI on the new response scene for the next user input
      const newNavItem = {
        scene: finalScene,
        sceneId: finalScene.sceneId || `scene-${Date.now()}`,
        sceneState: { type: 'dialogue' as const, state: 'input-showInput' as const },
        lockForward: false,
        lockBackward: false,
        index: navigationIndex + 1
      };

      sceneManager.insertNavigationItem(newNavItem, navigationIndex + 1);


      // Step 6: Navigate to the new scene

      sceneManager.setNavigationIndex(navigationIndex + 1);


    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error in chat flow';
      console.error('❌ ChatFlowOrchestrator error:', errorMessage);
      onError?.(errorMessage);
    }
  }, [chatGateway, pageFactory, sceneManager, onError, onResponseReceived, onSceneCreated]);

  /**
   * Convenience function for processing transcript completion
   * Automatically fills in metadata from current scene context
   */
  const processTranscript = useCallback(async (
    transcript: string,
    recordingId?: string
  ): Promise<void> => {
    const currentNavItem = sceneManager.getCurrentNavigationItem();
    const currentScene = currentNavItem?.scene;

    const input: ChatInput = {
      text: transcript,
      recordingId,
      metadata: {
        timestamp: new Date(),
        speaker: 'left',
        currentBackground: currentScene && 'background' in currentScene ? currentScene.background : undefined,
        leftCharacter: 'left-character' in (currentScene || {}) ? (currentScene as any)['left-character'] : undefined,
        rightCharacter: 'right-character' in (currentScene || {}) ? (currentScene as any)['right-character'] : undefined,
      }
    };

    await processUserInput(input);
  }, [sceneManager, processUserInput]);

  return {
    processUserInput,
    processTranscript,
    isProcessing: chatGateway.isProcessing,
    lastError: chatGateway.lastError
  };
}
