/**
 * Displays quest prompts with golden styling and accept button.
 * Used for key story moments that require player acknowledgment.
 */
import React, { useEffect } from "react";
import type { SceneProps } from "../registry";
import type { QuestScene } from "../../types/scene";
import { useQuest } from "../../quest/QuestManager";
import { useNavigation } from "../../context/NavigationContext";
import { useDirectionalLock } from "../../hooks/useDirectionalLock";

export default function QuestScene({ scene, onComplete, sceneIndex }: SceneProps<QuestScene>) {
  const { offer, accept, state } = useQuest();
  const { currentIndex, nextAndHide } = useNavigation();
  const [hasOffered, setHasOffered] = React.useState(false);
  const [isAccepted, setIsAccepted] = React.useState(false);

  // Check if this quest scene is currently active
  const isActiveScene = sceneIndex === currentIndex;

  // Block all scrolling when quest is active and offered (but not when accepted)
  useDirectionalLock({
    active: isActiveScene && hasOffered && !isAccepted,
    forward: true,
    backward: true
  });

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
        nextAndHide(sceneId); // Navigate and hide in one action
        onComplete?.(); // Mark scene as complete if callback exists
      }, 50);
    }
  }, [hasOffered, state.phase, isAccepted, nextAndHide, onComplete, scene, sceneIndex]);

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