/**
 * useContentLocks - Pure logic for determining scroll lock state
 *
 * Returns a simple function: given a direction and scene index, should we block?
 * No side effects, no events, just pure decision logic.
 */
import type { Scene } from '@core/types/scene';
import type { CaptionState } from './useSceneOrchestrator';

type UseContentLocksParams = {
  scenes: Scene[];
  isPlayerTurn: boolean;
  waiting: boolean;
  questState: 'idle' | 'active' | 'completed' | 'complete' | 'failed';
  getCaptionState?: (sceneId: string) => CaptionState | undefined;
};

export function useContentLocks({ scenes, isPlayerTurn, waiting, questState, getCaptionState }: UseContentLocksParams) {
  /**
   * Pure function: Check if scroll should be blocked
   * Returns true to BLOCK, false to ALLOW
   */
  const checkContentLocks = (direction: 'forward' | 'backward', currentIndex: number): boolean => {
    const currentScene = scenes[currentIndex];

    if (!currentScene) return false;

    // === EDGE DETECTION ===
    // Block backward scroll on first scene
    if (direction === 'backward' && currentIndex === 0) {
      return true;
    }

    // Block forward scroll on last scene
    if (direction === 'forward' && currentIndex === scenes.length - 1) {
      return true;
    }

    // === INPUT SCENES ===
    if (currentScene.type === 'input') {
      return isPlayerTurn || waiting;
    }

    // === QUEST SCENES ===
    if (currentScene.type === 'quest') {
      return questState === 'active';
    }

    // === IMAGE SCENES WITH CAPTIONS ===
    if (currentScene.type === 'image' && direction === 'forward') {
      const imageScene = currentScene as Scene & { caption?: string; text?: string; sceneId?: string };
      const captionText = imageScene.caption || imageScene.text;
      const sceneId = imageScene.sceneId;

      // Only lock if scene has caption and sceneId
      if (captionText && captionText.trim() && sceneId && getCaptionState) {
        const captionState = getCaptionState(sceneId);

        // Lock if caption is hidden or showing (not yet dismissed)
        // Allow scroll once caption is dismissed
        if (!captionState || captionState === 'hidden' || captionState === 'showing') {
          return true; // Block forward scroll
        }
      }

      // No caption or caption dismissed - allow scroll
      return false;
    }

    return false;
  };

  return { checkContentLocks };
}
