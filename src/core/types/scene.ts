/**
 * Type definitions for all story scene types and data structures.
 * Defines the shape of character, quest, image, and caption scenes.
 */
// src/types/scene.ts
export type CharacterScene = {
  type: "character";
  sceneId?: string;
  text: string; // Empty string during recording, filled when transcript arrives
  speaker?: "left" | "right";
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  States?: string[]; // Array of feature states: "quest", "input" (from character-flow flattening)
  recordingId?: string; // Links to active recording session - used to update text when recording completes
  isRecording?: boolean; // Visual flag: true during recording, false when text is filled in
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
  | ImageScene
  | CharacterFlowScene
  | FullScene
  | TextScene
  | CaptionScene;

export type Story = {
  scenes: Scene[];
};