/**
 * Type definitions for all story scene types and data structures.
 * Defines the shape of character, waiting, quest, input, and image scenes.
 */
// src/types/scene.ts
export type CharacterScene = {
  type: "character";
  sceneId?: string;
  text: string;
  speaker?: "left" | "right";
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  States?: string[]; // Array of feature states: "quest", "input" (from character-flow flattening)
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

export type QuestScene = {
  type: "quest";
  sceneId?: string;
  text: string;
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

export type InputScene = {
  type: "input";
  sceneId?: string;
  text?: string; // prompt
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

export type ImageScene = {
  type: "image";
  sceneId?: string;
  image: string;
  text?: string; // Caption text (legacy property name)
  caption?: string; // Alternative caption property
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

export type CharacterFlowScene = {
  type: "character-flow";
  sceneId?: string;
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
  hidden?: boolean;
  flow: Array<{
    side?: "left" | "right";
    text?: string;
    quest?: string;
    input?: string;
    States?: string[]; // Array of feature states: "quest", "input"
  }>;
};

export type FullScene = {
  type: "full";
  sceneId?: string;
  text: string;
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

export type TextScene = {
  type: "text";
  sceneId?: string;
  text: string;
  character?: string;
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
};

export type InteractiveBubbleScene = {
  type: "interactive-bubble";
  sceneId?: string;
  recordingId?: string;  // Links to active recording in DialogueContext
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

export type CaptionScene = {
  type: "caption";
  sceneId?: string;
  caption: string;
  align?: "center" | "bottom";
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
};

export type Scene =
  | CharacterScene
  | QuestScene
  | InputScene
  | ImageScene
  | CharacterFlowScene
  | FullScene
  | TextScene
  | InteractiveBubbleScene
  | CaptionScene;

export type Story = {
  scenes: Scene[];
};