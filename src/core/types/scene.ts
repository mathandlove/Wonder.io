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
  flowId?: string; // Reference to flow metadata (characterDescription, successCharacterSays)
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

// QuestScene removed - quest functionality is now part of character-flow scenes via States field

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
    type?: "input" | "quest"; // Marks this flow item as metadata
    CharacterDescription?: string; // AI chat context (for input)
    successCharacterSays?: string; // Expected phrase for quest completion
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

// CaptionScene removed - captions are now handled within ImageScene

export type Scene =
  | CharacterScene
  | ImageScene
  | CharacterFlowScene
  | FullScene
  | TextScene;

export type Story = {
  scenes: Scene[];
};