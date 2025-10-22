import React, { useMemo, useLayoutEffect } from "react";
import { useCharacterAnimation } from '@features/characters/CharacterAnimationContext';
import { useSceneManager } from '@core/scenes/SceneManager';
import { useTransitionManager } from '@core/navigation/useTransitionManager';
import type { Scene } from '@core/types/scene';
import { CharacterPanel } from "./CharacterPanel";



type Props = {
  storyId: string;
  scenes: Scene[];
  currentIndex?: number;
};

export const CharacterOrchestrator: React.FC<Props> = ({ storyId, scenes, currentIndex = 0 }) => {
  const { notifyEntranceComplete, notifyJiggleComplete } = useCharacterAnimation();
  const { navigationArray } = useSceneManager();
  const { activeTransition } = useTransitionManager();

  // Use currentIndex directly (always passed from ScrollControl)
  const scrollOffset = currentIndex;

  // AnimNonce removed - using transition.id as React key instead
  // This prevents double animations (transition key + nonce both triggered re-mounts)

  // Compute panel data fresh from navigation array
  const { leftPanel, rightPanel, currentSpeaker, isJiggling, transitionNonce } = useMemo(() => {
    const i = Math.max(0, Math.min(navigationArray.length - 1, Math.round(scrollOffset)));
    const currentNavItem = navigationArray[i];

    if (!currentNavItem) {
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
        transitionNonce: undefined
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const speaker = (currentNavItem.scene as any)?.speaker || null;

    // Check if we're in answer-right state or success-dance scene (should trigger jiggle dance)
    const dialogueState = currentNavItem.sceneState?.type === 'dialogue' ? currentNavItem.sceneState.state : null;
    const isSuccessDanceScene = currentNavItem.scene?.type === 'success-dance';
    const shouldJiggle = dialogueState === 'answer-right' || isSuccessDanceScene;

    const previousNavItem = navigationArray[i - 1];
    const nextNavItem = navigationArray[i + 1];

    // Helper to extract character from a navigation item
    const getChar = (navItem: typeof currentNavItem | undefined, side: 'left' | 'right') => {
      if (!navItem) return 'NOCHARACTER';
      const key = side === 'left' ? 'left-character' : 'right-character';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (navItem.scene as any)?.[key] || 'NOCHARACTER';
    };

    const leftChar = getChar(currentNavItem, 'left');
    const rightChar = getChar(currentNavItem, 'right');

    return {
      leftPanel: {
        character: leftChar,
        previousCharacter: getChar(previousNavItem, 'left'),
        nextCharacter: getChar(nextNavItem, 'left'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pose: (currentNavItem.scene as any)?.meta?.panelLeft?.pose || null,
      },
      rightPanel: {
        character: rightChar,
        previousCharacter: getChar(previousNavItem, 'right'),
        nextCharacter: getChar(nextNavItem, 'right'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pose: (currentNavItem.scene as any)?.meta?.panelRight?.pose || null,
      },
      currentSpeaker: speaker,
      isJiggling: shouldJiggle,
      transitionNonce: activeTransition?.id, // Use transition ID from active transition
    };
  }, [scrollOffset, navigationArray, activeTransition]);

  // Get current scene index for callback coordination
  const currentSceneIndex = Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset)));

  // Create callbacks to notify when entrance completes
  const handleLeftEntranceComplete = () => {
    notifyEntranceComplete(currentSceneIndex, 'left');
  };

  const handleRightEntranceComplete = () => {
    notifyEntranceComplete(currentSceneIndex, 'right');
  };

  // Create callbacks to notify when jiggle completes
  const handleLeftJiggleComplete = () => {
    notifyJiggleComplete(currentSceneIndex, 'left');
  };

  const handleRightJiggleComplete = () => {
    notifyJiggleComplete(currentSceneIndex, 'right');
  };



  // Use scroll direction from active transition (source of truth)
  // Fallback to scroll offset calculation if no active transition
  const scrollDirection = activeTransition?.direction || 'forward';

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
  }, [scrollOffset, scenes]);



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
          scrollDirection={scrollDirection}
          isSpeaking={currentSpeaker === 'left'}
          isJiggling={isJiggling}
          transitionNonce={transitionNonce}
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
          scrollDirection={scrollDirection}
          isSpeaking={currentSpeaker === 'right'}
          isJiggling={isJiggling}
          transitionNonce={transitionNonce}
          onEntranceComplete={handleRightEntranceComplete}
          onJiggleComplete={handleRightJiggleComplete}
        />
      </div>
    </div>
  );
};