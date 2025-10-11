/**
 * Displays quest prompts with golden styling and accept button.
 * Used for key story moments that require player acknowledgment.
 */
import React, { useEffect } from "react";
import type { SceneProps } from "../registry";
import type { QuestScene } from "@core/types/scene";
import { useQuest } from "@core/quest/QuestManager";
import { useSceneManager } from "@core/scenes/SceneManager";

export default function QuestScene({ scene, onComplete, sceneIndex }: SceneProps<QuestScene>) {
  const { offer, accept, state } = useQuest();
  const { currentIndex, scenes, navigateToNext } = useSceneManager();
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

      // Use the reusable navigation method and hide this quest scene after advancing
      const sceneId = scene.sceneId || `quest-${sceneIndex}`;
      navigateToNext(sceneId, onComplete, true); // true = hide the quest scene after advancing
    }
  }, [hasOffered, state.phase, isAccepted, onComplete, scene, sceneIndex, navigateToNext]);

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