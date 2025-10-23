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
  "left-character"?: string | null;
  "right-character"?: string | null;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  States?: string[]; // Array of feature states: "quest", "input", "recording" (from character-flow flattening or dynamically assigned)
  recordingId?: string; // Links to active recording session - used to update text when recording completes
  flowId?: string; // Reference to flow metadata (characterDescription, successAnswer)
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
  "left-character"?: string | null;
  "right-character"?: string | null;
  hidden?: boolean;
  flow: Array<{
    side?: "left" | "right";
    text?: string;
    quest?: string;
    input?: string;
    type?: "input" | "quest"; // Marks this flow item as metadata
    CharacterDescription?: string; // AI chat context (for input)
    successAnswer?: string; // Expected phrase for quest completion
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

export type FailDanceScene = {
  type: "fail-dance";
  sceneId?: string;
  background?: string;
  character: string; // The regular character name (e.g., "bakerMom")
  angryCharacter: string; // The angry version (e.g., "angrybakerMom")
  side?: "left" | "right"; // Which side the character is on (the one that dances)
  "left-character"?: string; // Left character (e.g., "leo") - shown normally
  "right-character"?: string | null; // Right character - set to null to trigger exit animation
  duration?: number; // Animation duration in ms (default: 3500)
  answerText?: string; // The wrong answer text to display in the record panel
  questionText?: string; // The question text for the quest display
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

export type SuccessDanceScene = {
  type: "success-dance";
  sceneId?: string;
  background?: string;
  character: string; // The regular character name (e.g., "bakerMom")
  happyCharacter: string; // The happy/celebrating version (e.g., "happybakerMom")
  side?: "left" | "right"; // Which side the character is on (the one that dances)
  "left-character"?: string; // Left character (e.g., "leo") - shown normally
  "right-character"?: string | null; // Right character - set to null to trigger exit animation
  duration?: number; // Animation duration in ms (default: 3500)
  answerText?: string; // The correct answer text to display in the record panel
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

// CaptionScene removed - captions are now handled within ImageScene

export type Scene =
  | CharacterScene
  | ImageScene
  | CharacterFlowScene
  | FullScene
  | TextScene
  | FailDanceScene
  | SuccessDanceScene;

export type Story = {
  scenes: Scene[];
};