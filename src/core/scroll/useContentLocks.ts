/**
 * useContentLocks - Pure logic for determining scroll lock state
 *
 * Returns a simple function: given a direction and scene index, should we block?
 * No side effects, no events, just pure decision logic.
 */
import type { Scene } from '@core/types/scene';

type UseContentLocksParams = {
  scenes: Scene[];
  isPlayerTurn: boolean;
  waiting: boolean;
  questState: 'idle' | 'active' | 'completed' | 'complete' | 'failed';
};

export function useContentLocks({ scenes, isPlayerTurn, waiting, questState }: UseContentLocksParams) {
  /**
   * Pure function: Check if scroll should be blocked
   * Returns true to BLOCK, false to ALLOW
   */
  const checkContentLocks = (direction: 'forward' | 'backward', currentIndex: number): boolean => {
    const currentScene = scenes[currentIndex];

    console.log('🔍 checkContentLocks called:', {
      direction,
      currentIndex,
      totalScenes: scenes.length,
      sceneExists: !!currentScene,
      sceneType: currentScene?.type,
      sceneId: currentScene?.sceneId
    });

    if (!currentScene) return false;

    // === EDGE DETECTION ===
    // Block backward scroll on first scene
    if (direction === 'backward' && currentIndex === 0) {
      console.log('🔒 Edge: First scene - blocking backward scroll');
      return true;
    }

    // Block forward scroll on last scene
    if (direction === 'forward' && currentIndex === scenes.length - 1) {
      console.log('🔒 Edge: Last scene - blocking forward scroll');
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
    // For now: permanently lock to test locking mechanism
    if (currentScene.type === 'image') {
      const hasCaption = !!(currentScene.text && currentScene.text.trim() !== '');
      console.log('🖼️ Image scene - PERMANENT LOCK for testing:', { hasCaption, text: currentScene.text });
      return hasCaption; // Always block if has caption (for testing)
    }

    return false;
  };

  return { checkContentLocks };
}
