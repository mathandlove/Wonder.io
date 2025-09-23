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
  const { offer, accept } = useQuest();
  const { currentIndex } = useNavigation();
  const [hasOffered, setHasOffered] = React.useState(false);

  // Check if this quest scene is currently active
  const isActiveScene = sceneIndex === currentIndex;

  // Block all scrolling when quest is active and offered
  useDirectionalLock({
    active: isActiveScene && hasOffered,
    forward: true,
    backward: true
  });

  // Offer quest only when this scene becomes active
  useEffect(() => {
    if (sceneIndex === currentIndex && !hasOffered) {
      console.log('[QuestScene] Scene is active, offering quest:', scene.text);
      offer({
        id: 'story-quest',
        title: 'Quest',
        text: scene.text
      });
      setHasOffered(true);
    }
  }, [currentIndex, sceneIndex, scene.text, offer, hasOffered]);

  // Detect when user scrolls away from this scene
  useEffect(() => {
    if (sceneIndex !== undefined && currentIndex !== sceneIndex && hasOffered) {
      console.log('[QuestScene] User scrolled away, accepting quest');
      accept();
      onComplete?.(); // Mark scene as complete if callback exists
    }
  }, [currentIndex, sceneIndex, hasOffered, accept, onComplete]);

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