import React, { useMemo, useLayoutEffect } from "react";
import { useCharacterAnimation } from '@features/characters/CharacterAnimationContext';
import { useNodeManager } from '@core/navigation/NodeManager';
import type { Scene } from '@core/types/scene';
import { getNodeById } from '@core/navigation/navigationGraphBuilder';
import { CharacterPanel } from "./CharacterPanel";



type Props = {
  storyId: string;
  scenes: Scene[];
};

export const CharacterOrchestrator: React.FC<Props> = ({ storyId, scenes }) => {
  const { notifyEntranceComplete, notifyJiggleComplete } = useCharacterAnimation();
  const { navigationGraph, getCurrentNodeId } = useNodeManager();

  // Compute panel data from current node in navigation graph
  // Use currentNode.nodeId as animation nonce, lastFrozenNode for previousSceneId
  const { leftPanel, rightPanel, currentSpeaker, isJiggling, transitionNonce, currentSceneId, previousSceneId } = useMemo(() => {
    const nodeId = getCurrentNodeId();

    if (!nodeId) {
      return {
        leftPanel: {
          character: 'NOCHARACTER',
          previousCharacter: 'NOCHARACTER',
          nextCharacter: 'NOCHARACTER',
          pose: null,
        },
        rightPanel: {
          character: 'NOCHARACTER',
          previousCharacter: 'NOCHARACTER',
          nextCharacter: 'NOCHARACTER',
          pose: null,
        },
        currentSpeaker: null,
        isJiggling: false,
        transitionNonce: undefined,
        currentSceneId: undefined,
        previousSceneId: undefined
      };
    }

    const currentNode = getNodeById(navigationGraph, nodeId);

    if (!currentNode) {
      return {
        leftPanel: {
          character: 'NOCHARACTER',
          previousCharacter: 'NOCHARACTER',
          nextCharacter: 'NOCHARACTER',
          pose: null,
        },
        rightPanel: {
          character: 'NOCHARACTER',
          previousCharacter: 'NOCHARACTER',
          nextCharacter: 'NOCHARACTER',
          pose: null,
        },
        currentSpeaker: null,
        isJiggling: false,
        transitionNonce: undefined,
        currentSceneId: undefined,
        previousSceneId: undefined
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const speaker = (currentNode.scene as any)?.speaker || null;

    // Check if we're in answer-right state or success-dance scene (should trigger jiggle dance)
    const dialogueState = currentNode.sceneState?.type === 'dialogue' ? currentNode.sceneState.state : null;
    const isSuccessDanceScene = currentNode.scene?.type === 'success-dance';
    const shouldJiggle = dialogueState === 'answer-right' || isSuccessDanceScene;

    // Get previous and next nodes using pointer-based navigation
    const previousNode = currentNode.prevId ? getNodeById(navigationGraph, currentNode.prevId) : null;
    const nextNode = currentNode.nextId ? getNodeById(navigationGraph, currentNode.nextId) : null;

    // Helper to extract character from a node
    const getChar = (node: typeof currentNode | null, side: 'left' | 'right') => {
      if (!node) return 'NOCHARACTER';
      const key = side === 'left' ? 'left-character' : 'right-character';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (node.scene as any)?.[key] || 'NOCHARACTER';
    };

    const leftChar = getChar(currentNode, 'left');
    const rightChar = getChar(currentNode, 'right');

    return {
      leftPanel: {
        character: leftChar,
        previousCharacter: getChar(previousNode, 'left'),
        nextCharacter: getChar(nextNode, 'left'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pose: (currentNode.scene as any)?.meta?.panelLeft?.pose || null,
      },
      rightPanel: {
        character: rightChar,
        previousCharacter: getChar(previousNode, 'right'),
        nextCharacter: getChar(nextNode, 'right'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pose: (currentNode.scene as any)?.meta?.panelRight?.pose || null,
      },
      currentSpeaker: speaker,
      isJiggling: shouldJiggle,
      transitionNonce: currentNode.id, // Use current node ID as animation nonce
      currentSceneId: currentNode.sceneId, // Current scene from live node
      previousSceneId: navigationGraph.lastFrozenNode?.sceneId // Previous scene from frozen snapshot
    };
  }, [navigationGraph, getCurrentNodeId]);

  // Create callbacks to notify when entrance completes
  // Using nodeId instead of scene index for coordination
  const handleLeftEntranceComplete = () => {
    // Note: The animation system may need to be updated to use nodeId instead of index
    // For now, we'll use 0 as a placeholder since index-based coordination is being phased out
    notifyEntranceComplete(0, 'left');
  };

  const handleRightEntranceComplete = () => {
    notifyEntranceComplete(0, 'right');
  };

  // Create callbacks to notify when jiggle completes
  const handleLeftJiggleComplete = () => {
    notifyJiggleComplete(0, 'left');
  };

  const handleRightJiggleComplete = () => {
    notifyJiggleComplete(0, 'right');
  };

  // Speaking is always allowed - CharacterPanel handles priority internally
  // (entering phase blocks speaking via phase priority system in CharacterPanel.tsx)
  const allowSpeaking = true;

  // AnimNonce increment logic removed - transition.id key handles animation triggering
  // The transition system already creates a unique key per navigation, so we don't need
  // a separate nonce mechanism that causes double animations


  // Publish panel widths as CSS variables to constrain main content
  useLayoutEffect(() => {
    const updatePanelWidths = () => {
      // Use 22vw for both panels
      const panelWidth = window.innerWidth * 0.22; // 22% of viewport width
      const leftWidth = `${panelWidth}px`;
      const rightWidth = `${panelWidth}px`;

      document.documentElement.style.setProperty("--panel-left-width", leftWidth);
      document.documentElement.style.setProperty("--panel-right-width", rightWidth);
    };

    updatePanelWidths();

    // Update on resize
    window.addEventListener('resize', updatePanelWidths);
    return () => window.removeEventListener('resize', updatePanelWidths);
  }, [scenes]);



  // Use stable keys - don't unmount/remount on transitions
  // The component stays mounted and reacts to prop changes from the frozen snapshot
  const leftPanelKey = 'character-panel-left';
  const rightPanelKey = 'character-panel-right';

  // Fixed overlay container
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }}>
      {/* Left gutter column - 22% of viewport width */}
      <div className="character-panel--left" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "22vw", pointerEvents: "auto" }}>
        <CharacterPanel
          key={leftPanelKey}
          side="left"
          visible={true}
          characterName={leftPanel.character}
          previousCharacter={leftPanel.previousCharacter}
          nextCharacter={leftPanel.nextCharacter}
          pose={leftPanel.pose}
          storyId={storyId}
          isSpeaking={allowSpeaking && currentSpeaker === 'left'}
          isJiggling={isJiggling}
          transitionNonce={transitionNonce}
          currentSceneId={currentSceneId}
          previousSceneId={previousSceneId}
          onEntranceComplete={handleLeftEntranceComplete}
          onJiggleComplete={handleLeftJiggleComplete}
        />
      </div>

      {/* Right gutter column - 22% of viewport width */}
      <div className="character-panel--right" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "22vw", pointerEvents: "auto" }}>
        <CharacterPanel
          key={rightPanelKey}
          side="right"
          visible={true}
          characterName={rightPanel.character}
          previousCharacter={rightPanel.previousCharacter}
          nextCharacter={rightPanel.nextCharacter}
          pose={rightPanel.pose}
          storyId={storyId}
          isSpeaking={allowSpeaking && currentSpeaker === 'right'}
          isJiggling={isJiggling}
          transitionNonce={transitionNonce}
          currentSceneId={currentSceneId}
          previousSceneId={previousSceneId}
          onEntranceComplete={handleRightEntranceComplete}
          onJiggleComplete={handleRightJiggleComplete}
        />
      </div>
    </div>
  );
};