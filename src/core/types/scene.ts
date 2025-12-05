/**
 * Type definitions for all story scene types and data structures.
 * Defines the shape of character, quest, image, and caption scenes.
 */
// src/types/scene.ts
export type CharacterScene = {
  type: "character";
  text: string; // Empty string during recording, filled when transcript arrives
  speaker?: "left" | "right";
  background?: string;
  "left-character"?: string | null;
  "right-character"?: string | null;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  phase?: string; // Current phase of the scene (default: "basic")
  phaseSteps?: string[]; // Available phases for this scene (e.g., ["basic", "quest-showing", "input"])
  recordingId?: string; // Links to active recording session - used to update text when recording completes
  conversationId?: string; // Reference to conversation metadata (characterDescription, successAnswer, conversation history)
  questionText?: string; // User's question in quest flow
  answerText?: string; // User's answer to quest question
  feedbackText?: string; // AI-generated feedback for wrong answers
  selectedClue?: string; // Label of the selected clue (when useClues=true)
  selectedClueDescription?: string; // Description of the selected clue to pass to AI
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

export type ImageScene = {
  type: "image";
  image: string;
  text?: string; // Caption text (legacy property name)
  caption?: string; // Alternative caption property
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  phase?: string; // Current phase of the scene (default: "basic")
  phaseSteps?: string[]; // Available phases for this scene (e.g., ["image_only", "caption"])
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

export type CharacterFlowScene = {
  type: "character-flow";
  background?: string;
  "left-character"?: string | null;
  "right-character"?: string | null;
  hidden?: boolean;
  phase?: string; // Current phase of the scene (default: "basic")
  phaseSteps?: string[]; // Available phases (note: character-flow is flattened in loadStory, so this is rarely used)
  flow: Array<{
    side?: "left" | "right";
    text?: string;
    quest?: string;
    input?: string;
    type?: "input" | "quest"; // Marks this flow item as metadata
    CharacterDescription?: string; // AI chat context (for input)
    successAnswer?: string; // Expected phrase for quest completion
  }>;
};

export type FullScene = {
  type: "full";
  text: string;
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  phase?: string; // Current phase of the scene (default: "basic")
  phaseSteps?: string[]; // Available phases (usually ["static"])
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

export type TextScene = {
  type: "text";
  text: string;
  character?: string;
  background?: string;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  phase?: string; // Current phase of the scene (default: "basic")
  phaseSteps?: string[]; // Available phases (usually ["static"])
};

export type FailDanceScene = {
  type: "fail-dance";
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
  phase?: string; // Current phase of the scene (default: "basic")
  phaseSteps?: string[]; // Available phases (usually ["answer-wrong"])
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

export type SuccessDanceScene = {
  type: "success-dance";
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
  phase?: string; // Current phase of the scene (default: "basic")
  phaseSteps?: string[]; // Available phases (usually ["answer-right"])
  meta?: {
    panelLeft?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
    panelRight?: { character: string; previousCharacter?: string; nextCharacter?: string; newCharacter?: boolean; aboutToSwap?: boolean };
  };
};

export type ClueImageScene = {
  type: "clue-image";
  image?: string; // Base image path (optional, can be derived from hotspot data)
  background?: string;
  clueDescriptions: Array<{
    hotspotName: string; // Label matching hotspot JSON (e.g., "Hair", "Potion")
    description: string; // Human-readable description of the clue (e.g., "A bowl of human hair")
    image: string; // Image name to find thumbnails
    dialog?: string;  // Dialog text to show when hotspot is clicked (legacy, may be removed)
  }>;
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  phase?: string; // Current phase: 'active' (finding clues) or 'complete' (all found)
  phaseSteps?: string[]; // Available phases: ["active", "complete"]
  // Runtime state (not persisted in JSON, managed by component)
  foundClues?: string[]; // Array of found hotspot labels
};

export type MapScene = {
  type: "map";
  image: string; // Map image filename (e.g., "cityMap.jpg")
  location: string; // Location to highlight via hotspot (e.g., "Bakery", "Cobbler")
  character?: string; // Optional character associated with this location
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  phase?: string;
  phaseSteps?: string[];
};

export type TitleScene = {
  type: "title";
  lvl1?: string; // First line of the title (e.g., "The")
  lvl2?: string; // Second line of the title (e.g., "Cookie Thief")
  author?: string; // Author name
  illustrator?: string; // Illustrator name
  background?: string; // Background image filename
  flowSequence?: boolean;
  isFirstInFlow?: boolean;
  hidden?: boolean;
  phase?: string;
  phaseSteps?: string[];
};

// CaptionScene removed - captions are now handled within ImageScene

export type Scene =
  | CharacterScene
  | ImageScene
  | CharacterFlowScene
  | FullScene
  | TextScene
  | FailDanceScene
  | SuccessDanceScene
  | ClueImageScene
  | MapScene
  | TitleScene;

export type Story = {
  scenes: Scene[];
  wrongCharacter?: string; // Character image for fail-dance scenes (e.g., "angrybutterbuns.png")
};