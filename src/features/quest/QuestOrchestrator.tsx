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
import { getCurrentNode, forceAdvanceNavigation } from '@core/navigation/navigationHelpers';
import { useSceneFlowMetadata } from '@core/data/FlowMetadataStore';
import { useQuest } from './QuestManager';
import type { Node } from '@core/navigation/types';

// Type guard to check if node has quest-showing state
function isQuestShowingState(node: Node | null): boolean {
  if (!node) return false;
  return (
    node.sceneState.type === 'dialogue' &&
    node.sceneState.state === 'quest-showing'
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
  const quest = useQuest();

  // Get current node
  const currentNode = getCurrentNode();
  const currentScene = currentNode?.scene;

  // Get flow metadata for current scene
  const flowMetadata = useSceneFlowMetadata(hasFlowId(currentScene) ? currentScene : null);

  // Track previous quest phase to detect acceptance
  const previousPhaseRef = useRef(quest.state.phase);

  // Effect 1: Offer quest when reaching quest-showing state
  useEffect(() => {
    // Check if we're on a quest-showing state
    if (!isQuestShowingState(currentNode)) {
      return;
    }

    // Check if we have quest metadata
    if (!flowMetadata?.questText) {
      console.warn('⚠️ QuestOrchestrator: quest-showing state but no quest metadata found');
      return;
    }

    // Null check for currentNode
    if (!currentNode) {
      console.warn('⚠️ QuestOrchestrator: No current node');
      return;
    }

    // Only offer if quest is not already offered/active
    if (quest.state.phase === 'idle' || quest.state.phase === 'clear') {
      quest.offer({
        id: currentNode.sceneId, // Use sceneId as quest ID
        title: undefined, // Could extract from questText if needed
        text: flowMetadata.questText
      });
    }
  }, [currentNode, flowMetadata, quest]);

  // Effect 2: Advance navigation when quest is accepted
  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    const currentPhase = quest.state.phase;

    // Detect transition from 'offered' to 'minimized' (user clicked Accept)
    if (previousPhase === 'offered' && currentPhase === 'minimized') {
      // Use forceAdvanceNavigation to bypass locks but still collapse states
      forceAdvanceNavigation('forward');
    }

    // Update ref for next comparison
    previousPhaseRef.current = currentPhase;
  }, [quest.state.phase]);

  // This is a non-visual orchestrator component
  return null;
}
