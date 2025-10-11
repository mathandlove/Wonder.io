/**
 * useSceneOrchestrator - Manages runtime state for scenes
 *
 * Listens to scroll:attempt events and updates scene runtime state
 * (caption visibility, dismissal flags, etc.) based on user interactions.
 *
 * This hook provides the "single source of truth" for scene state that
 * affects both rendering (ImageScene) and locking (useContentLocks).
 */
import { useEffect, useRef, useCallback } from 'react';
import type { Scene } from '@core/types/scene';

// Runtime state for image scenes with captions
export type CaptionState = 'hidden' | 'showing' | 'dismissed';

// Runtime state for a scene (can be extended for other scene types)
export interface SceneRuntimeState {
  captionState?: CaptionState;
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

  // Initialize caption states when scenes change
  useEffect(() => {
    scenes.forEach((scene, index) => {
      if (scene.type !== 'image') return;

      const imageScene = scene as Scene & { caption?: string; text?: string; sceneId?: string };
      const captionText = imageScene.caption || imageScene.text;
      const sceneId = imageScene.sceneId;

      // Only initialize if scene has caption and sceneId
      if (!captionText || !captionText.trim() || !sceneId) return;

      // Initialize to 'hidden' if not already set
      if (!stateMapRef.current.has(sceneId)) {
        stateMapRef.current.set(sceneId, { captionState: 'hidden' });
      }
    });
  }, [scenes]);

  return {
    getSceneState,
    getCaptionState,
    setCaptionState,
  };
}
