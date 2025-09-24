/**
 * Displays quest prompts with golden styling and accept button.
 * Used for key story moments that require player acknowledgment.
 */
import React, { useEffect } from "react";
import type { SceneProps } from "../registry";
import type { QuestScene } from "../../types/scene";
import { useQuest } from "../../quest/QuestManager";
import { useNavigation } from "../../context/NavigationContext";
import { sceneBus } from "../../scenes/registry/sceneBus";

export default function QuestScene({ scene, onComplete, sceneIndex }: SceneProps<QuestScene>) {
  const { offer, accept, state } = useQuest();
  const { currentIndex, scenes, setCurrentIndex } = useNavigation();
  const [hasOffered, setHasOffered] = React.useState(false);
  const [isAccepted, setIsAccepted] = React.useState(false);

  // Check if this quest scene is currently active
  const isActiveScene = sceneIndex === currentIndex;


  // Offer quest only when this scene becomes active
  useEffect(() => {
    if (sceneIndex === currentIndex && !hasOffered) {
      offer({
        id: 'story-quest',
        title: 'Quest',
        text: scene.text
      });
      setHasOffered(true);
    }
  }, [currentIndex, sceneIndex, scene.text, offer, hasOffered]);

  // Detect when quest is accepted (phase changes to 'minimized')
  useEffect(() => {
    if (hasOffered && state.phase === 'minimized' && !isAccepted) {
      setIsAccepted(true);

      // Small delay to ensure scroll lock is released before advancing
      setTimeout(() => {
        const sceneId = scene.sceneId || `quest-${sceneIndex}`;

        // Emit scene leave event for this quest scene
        if (sceneId) {
          sceneBus.emit('scene:leave', sceneId, 'forward');
        }

        // Find the next scene
        const nextSceneIndex = currentIndex + 1;
        const nextScene = scenes[nextSceneIndex];

        if (nextScene && (nextScene as any).sceneId) {
          // Emit scene enter event for the next scene
          sceneBus.emit('scene:enter', (nextScene as any).sceneId, 'forward');
        }

        // Update navigation index to sync debugger and other components
        setCurrentIndex(nextSceneIndex);

        // Trigger scroll navigation to the next scene
        const nextSection = document.querySelector(`[data-section-index="${nextSceneIndex}"]`);
        if (nextSection) {
          nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        onComplete?.(); // Mark scene as complete if callback exists
      }, 50);
    }
  }, [hasOffered, state.phase, isAccepted, onComplete, scene, sceneIndex, currentIndex, scenes]);

  // Detect when user scrolls away from this scene (fallback)
  useEffect(() => {
    if (sceneIndex !== undefined && currentIndex !== sceneIndex && hasOffered && !isAccepted) {
      accept();
    }
  }, [currentIndex, sceneIndex, hasOffered, isAccepted, accept]);

  // Don't render any visible UI - quest manager handles display
  return (
    <div style={{
      height: '100vh',
      width: '100%'
    }}>
      {/* Empty scene - quest UI is handled by QuestLayer */}
    </div>
  );
}