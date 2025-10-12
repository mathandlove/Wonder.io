/**
 * useSceneOrchestrator - Manages runtime state for scenes
 *
 * Listens to scroll:attempt events and updates scene runtime state
 * (input states, etc.) based on user interactions.
 *
 * Note: Image caption state is now managed by ImageStateContext
 * in the image-scene feature directory.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import type { Scene } from '@core/types/scene';
import { useImageState } from '@features/image-scene/ImageStateContext';

// Runtime state for input scenes
export type InputState = 'idle' | 'recording' | 'waiting' | 'converting';

// Runtime state for a scene (can be extended for other scene types)
export interface SceneRuntimeState {
  inputState?: InputState;
  // Future: other runtime flags like skipFlag, completionState, etc.
  // Note: captionState moved to ImageStateContext
}

// Map of sceneId → runtime state
type SceneStateMap = Map<string, SceneRuntimeState>;

export interface SceneOrchestratorHook {
  // Get runtime state for a scene
  getSceneState: (sceneId: string) => SceneRuntimeState | undefined;

  // Get input state specifically (convenience accessor)
  getInputState: (sceneId: string) => InputState | undefined;

  // Update input state
  setInputState: (sceneId: string, state: InputState) => void;

  // Handle caption state transitions for image scenes
  handleCaptionTransition: (sceneId: string, scene: Scene) => void;

  // Dialogue-to-scene conversion orchestration
  convertDialogueToScenes: (playerMessageId: string, npcMessageId: string) => Promise<void>;
}

interface UseSceneOrchestratorParams {
  scenes: Scene[];
  currentIndex: number;
}

export function useSceneOrchestrator({
  scenes,
  currentIndex,
}: UseSceneOrchestratorParams): SceneOrchestratorHook {
  // Runtime state storage - persists across renders
  const stateMapRef = useRef<SceneStateMap>(new Map());

  // Force re-render when state map changes
  const [, forceUpdate] = useState({});

  // Get image state context for managing caption states
  const imageState = useImageState();

  // Get state for a scene
  const getSceneState = useCallback((sceneId: string): SceneRuntimeState | undefined => {
    return stateMapRef.current.get(sceneId);
  }, []);

  // Get input state specifically
  const getInputState = useCallback((sceneId: string): InputState | undefined => {
    return stateMapRef.current.get(sceneId)?.inputState;
  }, []);

  // Set input state
  const setInputState = useCallback((sceneId: string, state: InputState) => {
    const existing = stateMapRef.current.get(sceneId) || {};
    stateMapRef.current.set(sceneId, {
      ...existing,
      inputState: state,
    });
    console.log(`🎯 setInputState: ${sceneId} → ${state}`, stateMapRef.current.get(sceneId));
    forceUpdate({}); // Trigger re-render so components see the new state
  }, []);

  // Handle caption state transitions for image scenes
  const handleCaptionTransition = useCallback((sceneId: string, scene: Scene) => {
    const imageScene = scene as Scene & { caption?: string; text?: string };
    const captionText = imageScene.caption || imageScene.text;

    // Only handle image scenes with captions
    if (scene.type !== 'image' || !captionText || !captionText.trim()) {
      return;
    }

    // Get current state from ImageStateContext
    const currentState = imageState.getImageState(sceneId);

    // Transition: hidden → showing
    if (!currentState || currentState === 'hidden') {
      imageState.setImageState(sceneId, 'showing');
      console.log(`📸 Caption transition: ${sceneId} hidden → showing`);
    }
  }, [imageState]);

  // Listen to scroll:attempt events and trigger caption transitions
  useEffect(() => {
    const handleScrollAttempt = (event: Event) => {
      const customEvent = event as CustomEvent<{
        direction: 'forward' | 'backward';
        blocked: boolean;
        fromIndex: number;
        toIndex: number;
        timestamp: number;
      }>;

      const { blocked, fromIndex, direction } = customEvent.detail;

      // Only react to blocked forward scrolls (user trying to advance but locked)
      if (!blocked || direction !== 'forward') return;

      const currentScene = scenes[fromIndex];
      if (!currentScene) return;

      const sceneWithId = currentScene as Scene & { sceneId?: string };
      const sceneId = sceneWithId.sceneId;

      // Skip if no sceneId
      if (!sceneId) return;

      // Delegate to handleCaptionTransition
      handleCaptionTransition(sceneId, currentScene);
    };

    window.addEventListener('scroll:attempt', handleScrollAttempt);

    return () => {
      window.removeEventListener('scroll:attempt', handleScrollAttempt);
    };
  }, [scenes, handleCaptionTransition]);

  // Initialize input states when scenes change
  // Note: Image caption states are now initialized in ImageStateContext
  useEffect(() => {
    console.log('🔄 Initializing scene states for', scenes.length, 'scenes');
    let needsUpdate = false;

    scenes.forEach((scene, index) => {
      const sceneWithId = scene as Scene & { sceneId?: string };
      const sceneId = sceneWithId.sceneId;

      // Skip scenes without sceneId
      if (!sceneId) {
        console.log(`  ⚠️ Skipping scene ${index}: no sceneId`);
        return;
      }

      // Initialize INPUT scenes with idle state
      if (scene.type === 'input') {
        console.log(`  Scene ${index}:`, { type: scene.type, sceneId });

        // Initialize to 'idle' if not already set
        if (!stateMapRef.current.has(sceneId)) {
          stateMapRef.current.set(sceneId, { inputState: 'idle' });
          console.log(`  ✅ Initialized input state for ${sceneId}: idle`);
          needsUpdate = true;
        } else if (!stateMapRef.current.get(sceneId)?.inputState) {
          const existing = stateMapRef.current.get(sceneId) || {};
          stateMapRef.current.set(sceneId, { ...existing, inputState: 'idle' });
          console.log(`  ✅ Added input state to existing scene ${sceneId}: idle`);
          needsUpdate = true;
        } else {
          console.log(`  ℹ️ Input scene ${sceneId} already has input state:`, stateMapRef.current.get(sceneId));
        }
      }
    });
    console.log('📊 Final state map:', Array.from(stateMapRef.current.entries()));

    // Trigger re-render if we initialized any new states
    if (needsUpdate) {
      console.log('🔄 Triggering re-render after initialization');
      forceUpdate({});
    }
  }, [scenes]);

  // Orchestrate conversion from dialogue messages to permanent scenes
  const convertDialogueToScenes = useCallback(async (playerMessageId: string, npcMessageId: string) => {
    console.log('🎬 SceneOrchestrator: Starting dialogue-to-scene conversion', {
      playerMessageId,
      npcMessageId
    });

    // TODO: Implementation steps:
    // 1. Get player and NPC messages from DialogueContext
    // 2. Create 3 new scenes:
    //    - CharacterScene with player message (left side)
    //    - CharacterScene with NPC response (right side)
    //    - New InputScene for next turn
    // 3. Insert scenes after the current interactive-bubble scene
    // 4. Mark messages as 'converting' in DialogueContext
    // 5. Update SceneManager with new scenes
    // 6. Navigate to NPC scene
    // 7. Mark messages as 'converted' in DialogueContext

    console.log('⚠️ convertDialogueToScenes: Not yet implemented');
  }, []);

  return {
    getSceneState,
    getInputState,
    setInputState,
    handleCaptionTransition,
    convertDialogueToScenes,
  };
}
