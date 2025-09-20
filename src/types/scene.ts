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
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; animationState?: string; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; animationState?: string; aboutToSwap?: boolean };
  };
};

export type QuestScene = {
  type: "quest";
  text: string;
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; animationState?: string; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; animationState?: string; aboutToSwap?: boolean };
  };
};

export type InputScene = {
  type: "input";
  text?: string; // prompt
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; animationState?: string; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; animationState?: string; aboutToSwap?: boolean };
  };
};

export type ImageScene = {
  type: "image";
  image: string;
  caption?: string;
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; animationState?: string; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; animationState?: string; aboutToSwap?: boolean };
  };
};

export type CharacterFlowScene = {
  type: "character-flow";
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
  flow: Array<{
    side?: "left" | "right";
    text?: string;
    quest?: string;
    input?: string;
  }>;
};

export type FullScene = {
  type: "full";
  text: string;
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; animationState?: string; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; animationState?: string; aboutToSwap?: boolean };
  };
};

export type Scene =
  | CharacterScene
  | QuestScene
  | InputScene
  | ImageScene
  | CharacterFlowScene
  | FullScene;

export type Story = {
  scenes: Scene[];
};