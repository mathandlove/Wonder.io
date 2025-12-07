import React, { useMemo, useLayoutEffect, useRef, useCallback } from "react";
import { useCharacterAnimation } from '@features/characters/CharacterAnimationContext';
import { useNavigationStore, selectCurrentNodeId, selectLastFrozenNode, selectNavigationGraph } from '@core/navigation/navigationStore';
import type { Scene } from '@core/types/scene';
import { getNodeById } from '@core/navigation/navigationGraphBuilder';
import { CharacterPanel } from "./CharacterPanel";



type Props = {
  storyId: string;
  scenes: Scene[];
};

export const CharacterOrchestrator: React.FC<Props> = ({ storyId, scenes }) => {
  const { notifyEntranceComplete, emitEvent } = useCharacterAnimation();

  // Track which panels have completed their jiggle animation
  const jiggleCompletionRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  // OPTIMIZED: Subscribe only to currentId and lastFrozenNode
  // This prevents re-renders when other parts of the graph change (insertions, deletions, etc.)
  const currentId = useNavigationStore(selectCurrentNodeId);
  const lastFrozenNode = useNavigationStore(selectLastFrozenNode);
  const graph = useNavigationStore(selectNavigationGraph);

  // Compute panel data from current node in navigation graph
  // Use currentNode.nodeId as animation nonce
  const { leftPanel, rightPanel, currentSpeaker, isJiggling, isClueImageScene, transitionNonce } = useMemo(() => {
    const nodeId = currentId;

    if (!nodeId) {
      return {
        leftPanel: {
          character: 'NOCHARACTER',
          previousCharacter: 'NOCHARACTER',
        },
        rightPanel: {
          character: 'NOCHARACTER',
          previousCharacter: 'NOCHARACTER',
        },
        currentSpeaker: null,
        isJiggling: false,
        isClueImageScene: false,
        transitionNonce: undefined
      };
    }

    const currentNode = getNodeById(graph, nodeId);

    if (!currentNode) {
      return {
        leftPanel: {
          character: 'NOCHARACTER',
          previousCharacter: 'NOCHARACTER',
        },
        rightPanel: {
          character: 'NOCHARACTER',
          previousCharacter: 'NOCHARACTER',
        },
        currentSpeaker: null,
        isJiggling: false,
        isClueImageScene: false,
        transitionNonce: undefined
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const speaker = (currentNode.scene as any)?.speaker || null;

    // Check if we're in success-dance scene (should trigger jiggle dance)
    // Note: NOT during answer-right - that's for showing the stamp video
    const scene = currentNode.scene as Scene | undefined;
    const isSuccessDanceScene = scene?.type === 'success-dance';
    const shouldJiggle = isSuccessDanceScene; // Only jiggle during success-dance, not answer-right

    // Check if we're in a clue-image scene (should disable pointer events)
    const isClueImageScene = scene?.type === 'clue-image';

    // Get frozen snapshot node (the state BEFORE this transition started)
    const frozenNode = lastFrozenNode;

    // Helper to extract character from a node or frozen snapshot
    const getChar = (node: typeof currentNode | typeof frozenNode | null, side: 'left' | 'right') => {
      if (!node) return 'NOCHARACTER';
      const key = side === 'left' ? 'left-character' : 'right-character';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (node.scene as any)?.[key];
      // Normalize all "no character" representations to 'NOCHARACTER'
      if (!value || value === 'none' || value === 'NOCHARACTER') return 'NOCHARACTER';
      return value;
    };

    const leftChar = getChar(currentNode, 'left');
    const rightChar = getChar(currentNode, 'right');

    return {
      leftPanel: {
        character: leftChar,
        previousCharacter: getChar(frozenNode, 'left'), // Use frozen snapshot, not previous node
      },
      rightPanel: {
        character: rightChar,
        previousCharacter: getChar(frozenNode, 'right'), // Use frozen snapshot, not previous node
      },
      currentSpeaker: speaker,
      isJiggling: shouldJiggle,
      isClueImageScene,
      transitionNonce: currentNode.id // Use current node ID as animation nonce
    };
  }, [currentId, lastFrozenNode, graph]);

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

  // Reset jiggle completion tracking when jiggle state changes
  React.useEffect(() => {
    if (isJiggling) {
      // console.log('[CharacterOrchestrator] 🎉 Jiggle started!', {
      //   leftCharacter: leftPanel.character,
      //   rightCharacter: rightPanel.character
      // });
      // Reset tracking when we start jiggling
      // Mark panels as complete if they have no character (NOCHARACTER won't animate)
      jiggleCompletionRef.current = {
        left: leftPanel.character === 'NOCHARACTER',
        right: rightPanel.character === 'NOCHARACTER'
      };

      // If both panels are NOCHARACTER, emit immediately
      if (leftPanel.character === 'NOCHARACTER' && rightPanel.character === 'NOCHARACTER') {
        // console.log('[CharacterOrchestrator] ⚡ No characters - emitting jiggle-complete immediately');
        emitEvent('jiggle-complete', 0);
      }
    }
  }, [isJiggling, leftPanel.character, rightPanel.character, emitEvent]);

  // Jiggle complete callbacks - emit event when both panels complete
  const handleLeftJiggleComplete = useCallback(() => {
    // console.log('[CharacterOrchestrator] ✅ LEFT jiggle complete', jiggleCompletionRef.current);
    jiggleCompletionRef.current.left = true;

    // If both panels have completed, emit the jiggle-complete event
    if (jiggleCompletionRef.current.left && jiggleCompletionRef.current.right) {
      // console.log('[CharacterOrchestrator] 🎊 BOTH panels complete - emitting jiggle-complete event');
      emitEvent('jiggle-complete', 0); // Using 0 as scene index (not currently used)
    }
  }, [emitEvent]);

  const handleRightJiggleComplete = useCallback(() => {
    // console.log('[CharacterOrchestrator] ✅ RIGHT jiggle complete', jiggleCompletionRef.current);
    jiggleCompletionRef.current.right = true;

    // If both panels have completed, emit the jiggle-complete event
    if (jiggleCompletionRef.current.left && jiggleCompletionRef.current.right) {
      // console.log('[CharacterOrchestrator] 🎊 BOTH panels complete - emitting jiggle-complete event');
      emitEvent('jiggle-complete', 0); // Using 0 as scene index (not currently used)
    }
  }, [emitEvent]);

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
  // Disable pointer events on character panels during clue-image scenes
  // to allow hotspot clicks to pass through
  const panelPointerEvents = isClueImageScene ? "none" : "auto";

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }}>
      {/* Left gutter column - 22% of viewport width */}
      <div className="character-panel--left" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "22vw", pointerEvents: panelPointerEvents }}>
        <CharacterPanel
          key={leftPanelKey}
          side="left"
          visible={true}
          currentCharacter={leftPanel.character}
          previousCharacter={leftPanel.previousCharacter}
          storyId={storyId}
          isSpeaking={allowSpeaking && currentSpeaker === 'left'}
          isJiggling={isJiggling}
          transitionNonce={transitionNonce}
          onEntranceComplete={handleLeftEntranceComplete}
          onJiggleComplete={handleLeftJiggleComplete}
        />
      </div>

      {/* Right gutter column - 22% of viewport width */}
      <div className="character-panel--right" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "22vw", pointerEvents: panelPointerEvents }}>
        <CharacterPanel
          key={rightPanelKey}
          side="right"
          visible={true}
          currentCharacter={rightPanel.character}
          previousCharacter={rightPanel.previousCharacter}
          storyId={storyId}
          isSpeaking={allowSpeaking && currentSpeaker === 'right'}
          isJiggling={isJiggling}
          transitionNonce={transitionNonce}
          onEntranceComplete={handleRightEntranceComplete}
          onJiggleComplete={handleRightJiggleComplete}
        />
      </div>
    </div>
  );
};