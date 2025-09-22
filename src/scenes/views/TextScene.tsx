/**
 * TextScene view wrapper - handles pure text scenes with character animations
 * Similar to main-reference implementation but adapted for current navigation system
 */
import React from "react";
import type { SceneProps } from "../registry";
import type { TextScene as TextSceneType } from "../../types/scene";
import TextSceneComponent from "../../components/TextScene";
import { useNavigation } from "../../context/NavigationContext";

export default function TextScene({ scene, onComplete }: SceneProps<TextSceneType>) {
  const { goToNext } = useNavigation();

  const handleComplete = () => {
    // Navigate to next scene when text scene is completed
    onComplete?.();
    goToNext();
  };

  // Use the same storyId as used throughout the app
  const storyId = "gingerbread";

  return (
    <TextSceneComponent
      scene={scene}
      storyId={storyId}
      onComplete={handleComplete}
    />
  );
}