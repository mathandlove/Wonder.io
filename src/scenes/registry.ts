/**
 * Maps scene types to their corresponding React components.
 * Handles lazy loading and provides type-safe scene routing.
 */
// src/scenes/registry.ts
import type { ComponentType } from "react";
import type { Scene } from "../types/scene";

import CharacterScene from "./views/CharacterScene";
import QuestScene from "./views/QuestScene";
import InputScene from "./views/InputScene";
import ImageScene from "./views/ImageScene";
import FullScene from "./views/FullScene";
import TextScene from "./views/TextScene";

export type SceneProps<T extends Scene = Scene> = {
  scene: T;
  sceneIndex?: number;
  onComplete?: () => void;
};

export const sceneRegistry: Record<Scene["type"], ComponentType<SceneProps>> = {
  character: CharacterScene as ComponentType<SceneProps>,
  quest: QuestScene as ComponentType<SceneProps>,
  input: InputScene as ComponentType<SceneProps>,
  image: ImageScene as ComponentType<SceneProps>,
  full: FullScene as ComponentType<SceneProps>,
  text: TextScene as ComponentType<SceneProps>,
};