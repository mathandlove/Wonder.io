/**
 * useSceneOrchestrator - Manages runtime state for scenes
 *
 * Listens to scroll:attempt events and updates scene runtime state
 * (caption visibility, dismissal flags, etc.) based on user interactions.
 *
 * This hook provides the "single source of truth" for scene state that
 * affects both rendering (ImageScene) and locking (useContentLocks).
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import type { Scene } from '@core/types/scene';

// Runtime state for image scenes with captions
export type CaptionState = 'hidden' | 'showing' | 'dismissed';

// Runtime state for input scenes
export type InputState = 'idle' | 'recording' | 'waiting' | 'converting';

// Runtime state for a scene (can be extended for other scene types)
export interface SceneRuntimeState {
  captionState?: CaptionState;
  inputState?: InputState;
  // Future: other runtime flags like skipFlag, completionState, etc.
}

// Map of sceneId → runtime state
type SceneStateMap = Map<string, SceneRuntimeState>;

export interface SceneOrchestratorHook {
  // Get runtime state for a scene
  getSceneState: (sceneId: string) => SceneRuntimeState | undefined;

  // Get caption state specifically (convenience accessor)
  getCaptionState: (sceneId: string) => CaptionState | undefined;

  // Update caption state (for future manual control)
  setCaptionState: (sceneId: string, state: CaptionState) => void;

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
  currentIndex,
}: UseSceneOrchestratorParams): SceneOrchestratorHook {
  // Runtime state storage - persists across renders
  const stateMapRef = useRef<SceneStateMap>(new Map());

  // Force re-render when state map changes
  const [, forceUpdate] = useState({});

  // Get state for a scene
  const getSceneState = useCallback((sceneId: string): SceneRuntimeState | undefined => {
    return stateMapRef.current.get(sceneId);
  }, []);

  // Get caption state specifically
  const getCaptionState = useCallback((sceneId: string): CaptionState | undefined => {
    return stateMapRef.current.get(sceneId)?.captionState;
  }, []);

  // Set caption state
  const setCaptionState = useCallback((sceneId: string, state: CaptionState) => {
    const existing = stateMapRef.current.get(sceneId) || {};
    stateMapRef.current.set(sceneId, {
      ...existing,
      captionState: state,
    });
    console.log(`🎯 setCaptionState: ${sceneId} → ${state}`, stateMapRef.current.get(sceneId));
    forceUpdate({}); // Trigger re-render so components see the new state
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

  // Listen to scroll:attempt events and update caption states
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

      // Only handle image scenes with captions
      if (currentScene.type !== 'image') return;

      const imageScene = currentScene as Scene & { caption?: string; text?: string; sceneId?: string };
      const captionText = imageScene.caption || imageScene.text;
      const sceneId = imageScene.sceneId;

      // Skip if no caption or no sceneId
      if (!captionText || !captionText.trim() || !sceneId) return;

      // Get current caption state
      const currentState = getCaptionState(sceneId);

      // State machine: hidden → showing → dismissed
      if (!currentState || currentState === 'hidden') {
        // First blocked scroll: show caption
        setCaptionState(sceneId, 'showing');
        console.log(`📸 Caption showing for scene ${sceneId}`);
      } else if (currentState === 'showing') {
        // Second blocked scroll: dismiss caption
        setCaptionState(sceneId, 'dismissed');
        console.log(`📸 Caption dismissed for scene ${sceneId}`);
      }
      // If already dismissed, do nothing (caption stays dismissed)
    };

    window.addEventListener('scroll:attempt', handleScrollAttempt);

    return () => {
      window.removeEventListener('scroll:attempt', handleScrollAttempt);
    };
  }, [scenes, getCaptionState, setCaptionState]);

  // Initialize caption and input states when scenes change
  useEffect(() => {
    console.log('🔄 Initializing scene states for', scenes.length, 'scenes');
    let needsUpdate = false;

    scenes.forEach((scene, index) => {
      const sceneWithId = scene as Scene & { sceneId?: string; caption?: string; text?: string };
      const sceneId = sceneWithId.sceneId;

      // Skip scenes without sceneId
      if (!sceneId) {
        console.log(`  ⚠️ Skipping scene ${index}: no sceneId`);
        return;
      }

      // Initialize IMAGE scenes with caption state
      if (scene.type === 'image') {
        const captionText = sceneWithId.caption || sceneWithId.text;

        console.log(`  Scene ${index}:`, { type: scene.type, sceneId, hasCaption: !!captionText });

        // Only initialize if scene has caption
        if (captionText && captionText.trim()) {
          // Initialize to 'hidden' if not already set
          if (!stateMapRef.current.has(sceneId)) {
            stateMapRef.current.set(sceneId, { captionState: 'hidden' });
            console.log(`  ✅ Initialized caption state for ${sceneId}: hidden`);
            needsUpdate = true;
          } else if (!stateMapRef.current.get(sceneId)?.captionState) {
            const existing = stateMapRef.current.get(sceneId) || {};
            stateMapRef.current.set(sceneId, { ...existing, captionState: 'hidden' });
            console.log(`  ✅ Added caption state to existing scene ${sceneId}: hidden`);
            needsUpdate = true;
          } else {
            console.log(`  ℹ️ Image scene ${sceneId} already has caption state:`, stateMapRef.current.get(sceneId));
          }
        }
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
    getCaptionState,
    setCaptionState,
    getInputState,
    setInputState,
    convertDialogueToScenes,
  };
}
