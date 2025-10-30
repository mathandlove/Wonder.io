/**
 * Maps scene types to their corresponding React components.
 * Handles lazy loading and provides type-safe scene routing.
 *
 * Note: quest and input are no longer scene types - they are features
 * that appear within character-flow scenes via the States field.
 */
import type { ComponentType } from "react";
import type { Scene } from '@core/types/scene';

import CharacterScene from "./CharacterScene";
import ImageScene from "@core/scenes/image/ImageScene";
import FullScene from "./FullScene";
import TextScene from "./TextScene";
import FailDanceScene from "./FailDanceScene";
import SuccessDanceScene from "./SuccessDanceScene";

export type SceneProps<T extends Scene = Scene> = {
  scene: T;
  sceneIndex?: number;
  nodeId?: string;
  onComplete?: () => void;
};

export const sceneRegistry: Record<string, ComponentType<SceneProps>> = {
  character: CharacterScene as ComponentType<SceneProps>,
  "character-flow": CharacterScene as ComponentType<SceneProps>, // Uses States field for quest/input features
  image: ImageScene as ComponentType<SceneProps>,
  full: FullScene as ComponentType<SceneProps>,
  text: TextScene as ComponentType<SceneProps>,
  "fail-dance": FailDanceScene as ComponentType<SceneProps>,
  "success-dance": SuccessDanceScene as ComponentType<SceneProps>,
  // caption: removed - captions are now handled within ImageScene
};