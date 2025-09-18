/**
 * Type definitions for all story scene types and data structures.
 * Defines the shape of character, waiting, quest, input, and image scenes.
 */
// src/types/scene.ts
export type CharacterScene = {
  type: "character";
  text: string;
  speaker?: "left" | "right";
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
};

export type QuestScene = {
  type: "quest";
  text: string;
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
};

export type InputScene = {
  type: "input";
  text?: string; // prompt
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
};

export type ImageScene = {
  type: "image";
  image: string;
  caption?: string;
  background?: string;
};

export type Scene =
  | CharacterScene
  | QuestScene
  | InputScene
  | ImageScene;

export type Story = {
  scenes: Scene[];
};