/**
 * useSceneOrchestrator - Manages runtime state for input scenes
 *
 * Provides runtime state storage for input scenes (idle, recording, waiting, converting).
 * Used by SpeechBubbleOrchestrator to determine which bubbles to show.
 *
 * Note: Caption transitions are now handled directly in ScrollControl.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import type { Scene } from '@core/types/scene';

// Runtime state for input scenes
export type InputState = 'idle' | 'recording' | 'waiting' | 'converting';

// Runtime state for a scene (can be extended for other scene types)
export interface SceneRuntimeState {
  inputState?: InputState;
  // Future: other runtime flags like skipFlag, completionState, etc.
  // Note: captionState moved to SceneStates context
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

  // Dialogue-to-scene conversion orchestration
  convertDialogueToScenes: (playerMessageId: string, npcMessageId: string) => Promise<void>;
}

interface UseSceneOrchestratorParams {
  scenes: Scene[];
  currentIndex: number;
}

export function useSceneOrchestrator({
  scenes,
}: UseSceneOrchestratorParams): SceneOrchestratorHook {
  // Runtime state storage - persists across renders
  const stateMapRef = useRef<SceneStateMap>(new Map());

  // Track scene IDs to detect actual changes (not just array reference changes)
  const sceneIdsRef = useRef<string>('');

  // Force re-render when state map changes
  const [, forceUpdate] = useState({});

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

  // Initialize input states when scenes change
  useEffect(() => {
    // Create a stable key from scene IDs to detect real changes
    const currentSceneIds = scenes
      .map(s => (s as Scene & { sceneId?: string }).sceneId)
      .filter(Boolean)
      .join(',');

    // Skip if scene IDs haven't actually changed
    if (sceneIdsRef.current === currentSceneIds) {
      return;
    }

    sceneIdsRef.current = currentSceneIds;
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
    convertDialogueToScenes,
  };
}
