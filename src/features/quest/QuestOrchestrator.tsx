/**
 * QuestOrchestrator - Watches navigation state and syncs with QuestManager
 *
 * Responsibilities:
 * - Detect when navigationIndex reaches quest-showing state
 * - Trigger QuestManager.offer() with quest metadata from FlowMetadataStore
 * - Advance to quest-accepted when quest is accepted
 * - Keep QuestManager state in sync with navigation progression
 */

import { useEffect, useRef } from 'react';
import { useSceneManager } from '@core/scenes/SceneManager';
import { useSceneFlowMetadata } from '@core/data/FlowMetadataStore';
import { useQuest } from './QuestManager';
import type { NavigationItem } from '@core/navigation/types';

// Type guard to check if navigation item has quest-showing state
function isQuestShowingState(navItem: NavigationItem | null): boolean {
  if (!navItem) return false;
  return (
    navItem.sceneState.type === 'dialogue' &&
    navItem.sceneState.state === 'quest-showing'
  );
}

// Type guard for scenes with flowId
type SceneWithFlowId = {
  flowId?: string;
};

function hasFlowId(scene: unknown): scene is SceneWithFlowId {
  return typeof scene === 'object' && scene !== null && 'flowId' in scene;
}

export function QuestOrchestrator() {
  const sceneManager = useSceneManager();
  const quest = useQuest();

  // Get current navigation item
  const currentNavItem = sceneManager.getCurrentNavigationItem();
  const currentScene = currentNavItem?.scene;

  // Get flow metadata for current scene
  const flowMetadata = useSceneFlowMetadata(hasFlowId(currentScene) ? currentScene : null);

  // Track previous quest phase to detect acceptance
  const previousPhaseRef = useRef(quest.state.phase);

  // Effect 1: Offer quest when reaching quest-showing state
  useEffect(() => {
    // Check if we're on a quest-showing state
    if (!isQuestShowingState(currentNavItem)) {
      return;
    }

    // Check if we have quest metadata
    if (!flowMetadata?.questText) {
      console.warn('⚠️ QuestOrchestrator: quest-showing state but no quest metadata found');
      return;
    }

    // Null check for currentNavItem
    if (!currentNavItem) {
      console.warn('⚠️ QuestOrchestrator: No current navigation item');
      return;
    }

    // Only offer if quest is not already offered/active
    if (quest.state.phase === 'idle' || quest.state.phase === 'clear') {
      console.log('🎯 QuestOrchestrator: Offering quest', {
        questText: flowMetadata.questText,
        successPhrase: flowMetadata.successCharacterSays,
        sceneId: currentNavItem.sceneId
      });

      quest.offer({
        id: currentNavItem.sceneId, // Use sceneId as quest ID
        title: undefined, // Could extract from questText if needed
        text: flowMetadata.questText
      });
    }
  }, [currentNavItem, flowMetadata, quest]);

  // Effect 2: Advance navigation when quest is accepted
  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    const currentPhase = quest.state.phase;

    // Detect transition from 'offered' to 'minimized' (user clicked Accept)
    if (previousPhase === 'offered' && currentPhase === 'minimized') {
      console.log('✅ QuestOrchestrator: Quest accepted, advancing and collapsing quest-showing state');

      // Use forceAdvanceNavigation to bypass locks but still collapse states
      sceneManager.forceAdvanceNavigation('forward');
    }

    // Update ref for next comparison
    previousPhaseRef.current = currentPhase;
  }, [quest.state.phase, sceneManager]);

  // This is a non-visual orchestrator component
  return null;
}
