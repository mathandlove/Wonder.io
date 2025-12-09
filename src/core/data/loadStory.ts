/**
 * Loads and processes story data from JSON files.
 * Flattens character-flow scenes into individual scenes and validates data structure.
 * Character descriptions are loaded from the depositions array in story.json.
 */
// src/data/loadStory.ts
import type { Scene, Story } from '@core/types/scene';
import type { ConversationMetadataMap } from '@core/data/FlowMetadataStore';
import { PHASES, type Phase } from '@core/navigation/navigationGraphTypes';

// Re-export for convenience
export type { ConversationMetadataMap } from '@core/data/FlowMetadataStore';

type Deposition = {
  character: string;
  title: string;
  content: string;
};

/**
 * Looks up a character description from the depositions array in story.json.
 * @param characterRef - The character name (e.g., "butterbuns")
 * @param depositions - The depositions array from story.json
 * @returns The character description content, or null if not found
 */
function getCharacterDescription(
  characterRef: string,
  depositions: Deposition[] | undefined
): string | null {
  if (!depositions) return null;

  // Remove .txt extension if present for matching
  const characterName = characterRef.endsWith('.txt')
    ? characterRef.slice(0, -4)
    : characterRef;

  const deposition = depositions.find(d => d.character === characterName);
  return deposition?.content ?? null;
}

/**
 * Ensures an image path has a file extension, defaulting to .png if none specified.
 * @param imagePath - The image path from the JSON
 * @returns The image path with .png extension if no extension was present
 */
function ensureImageExtension(imagePath: string | undefined): string | undefined {
  if (!imagePath) return imagePath;
  // Check if the path already has an extension (contains a dot in the filename portion)
  const lastSlashIndex = imagePath.lastIndexOf('/');
  const filename = lastSlashIndex >= 0 ? imagePath.substring(lastSlashIndex + 1) : imagePath;
  if (filename.includes('.')) {
    return imagePath; // Already has an extension
  }
  return `${imagePath}.png`;
}

/**
 * Ensures a story image path is prefixed with "story/" and has .png extension.
 * Used for image scenes that should load from the story subfolder.
 * @param imagePath - The image path from the JSON
 * @returns The image path with story/ prefix and .png extension
 */
function ensureStoryImagePath(imagePath: string | undefined): string | undefined {
  if (!imagePath) return imagePath;

  // First ensure the extension
  let result = ensureImageExtension(imagePath)!;

  // Add story/ prefix if not already present
  if (!result.startsWith('story/')) {
    result = `story/${result}`;
  }

  return result;
}

type RawFlowItem = {
  side?: "left" | "right";
  text?: string;
  waiting?: boolean;
  type?: "input" | "quest"; // Marks where to add input/quest phases
  "left-character"?: string;
  "right-character"?: string;
};

type RawScene = {
  type: string;
  text?: string;
  speaker?: string;
  background?: string;
  "left-character"?: string;
  "right-character"?: string;
  image?: string;
  flow?: RawFlowItem[];
  // Flow-level metadata (character-flow scenes)
  CharacterDescription?: string; // AI chat context
  useClues?: boolean; // Whether to use clues from most recent clue-image scene
  successAnswer?: string; // Expected phrase for quest/input completion
  incorrectAnswer?: string[]; // Optional array of incorrect facts to penalize
  question?: string; // Legacy quest text field
  hint?: string; // Hint text to help the player
  requiredAsk?: boolean; // Whether player must ask questions before answering
  monologue?: boolean; // Whether this is a monologue (single character speaking)
  // ...other raw fields allowed in your JSON
};

type RawStory = {
  scenes?: RawScene[];
  depositions?: Deposition[];
  [k: string]: unknown;
};

// Internal type - not exported as it's only used within this file
interface FlattenResult {
  scenes: Scene[];
  flowMetadata: ConversationMetadataMap;
}

function flattenScenes(rawScenes: RawScene[]): FlattenResult {
  const out: Scene[] = [];
  const flowMetadata: ConversationMetadataMap = {};
  let sceneCounter = 0;
  let flowCounter = 0;

  // Track the most recent clue-image scene for automatic clueReference linking
  let lastClueImageName: string | null = null;

  rawScenes.forEach((scene) => {
    // Track clue-image scenes for automatic clueReference
    if (scene.type === 'clue-image' && scene.image) {
      // Strip file extension to get just the map name (e.g., "insideBakery.jpg" -> "insideBakery")
      lastClueImageName = scene.image.replace(/\.(png|jpg|jpeg|webp)$/i, '');
    }
    if (scene.type === "character-flow" && scene.flow) {
      // Check if flow has input or quest markers
      const hasInputMarker = scene.flow.some(f => f.type === "input");
      const hasQuestMarker = scene.flow.some(f => f.type === "quest");

      // Check if flow-level metadata exists
      const hasFlowMetadata = scene.CharacterDescription || scene.successAnswer || scene.question;

      // Generate unique conversationId if this flow has metadata
      const conversationId = (hasInputMarker || hasQuestMarker || hasFlowMetadata)
        ? `conv-${flowCounter++}`
        : undefined;

      // Store metadata if found (read from flow level)
      if (conversationId && hasFlowMetadata) {
        flowMetadata[conversationId] = {
          characterDescription: scene.CharacterDescription,
          questText: scene.question,
          successAnswer: scene.successAnswer!,
          incorrectAnswer: scene.incorrectAnswer,
          useClues: scene.useClues,
          // Auto-link to most recent clue-image scene if useClues is enabled
          clueReference: scene.useClues ? lastClueImageName ?? undefined : undefined,
          hint: scene.hint,
          requiredAsk: scene.requiredAsk,
          monologue: scene.monologue
        };
      }

      // Smart flow parsing: dialogue items "consume" following quest/input markers
      // Algorithm: Iterate through flow, build scenes with their phaseSteps
      // Metadata (CharacterDescription, useClues, successAnswer) is read from flow level

      let currentLeftCharacter = scene["left-character"];
      let currentRightCharacter = scene["right-character"];
      let currentDialogue: Partial<Scene> | null = null;
      let currentPhaseSteps: Phase[] = [PHASES.BASIC];
      let isFirstInFlow = true;

      scene.flow.forEach((f, flowIndex) => {
        // Update characters if specified in this flow item
        if (f["left-character"]) {
          currentLeftCharacter = f["left-character"];
        }
        if (f["right-character"]) {
          currentRightCharacter = f["right-character"];
        }

        // Dialogue item - save previous and start new
        if (f.side && f.text) {
          // Save previous dialogue if exists
          if (currentDialogue) {
            out.push({
              ...currentDialogue,
              phaseSteps: currentPhaseSteps
            } as Scene);
          }

          // Start new dialogue scene
          currentDialogue = {
            type: "character",
            text: f.text,
            speaker: f.side,
            background: ensureImageExtension(scene.background),
            "left-character": currentLeftCharacter,
            "right-character": currentRightCharacter,
            flowSequence: true,
            isFirstInFlow,
            conversationId
          };
          currentPhaseSteps = [PHASES.BASIC];
          isFirstInFlow = false;
        }
        // Quest marker - CREATE SEPARATE STANDALONE NODE (not phase)
        // Quest nodes are displayed without speech bubbles on mobile
        else if (f.type === "quest" && !f.side) {
          // Save current dialogue with its current phases (no quest phase added)
          if (currentDialogue) {
            out.push({
              ...currentDialogue,
              phaseSteps: currentPhaseSteps
            } as Scene);
          }

          // Create standalone quest node
          out.push({
            type: "character",
            nodeType: "quest",
            text: "", // Quest text comes from metadata via RecordPanel
            speaker: currentRightCharacter ? "right" : "left",
            background: ensureImageExtension(scene.background),
            "left-character": currentLeftCharacter,
            "right-character": currentRightCharacter,
            flowSequence: true,
            isFirstInFlow: false,
            conversationId,
            phaseSteps: [PHASES.QUEST_STANDALONE],
            hidesSpeechBubble: true,
          } as Scene);

          // Reset state - quest consumed the previous dialogue
          currentDialogue = null;
          currentPhaseSteps = [PHASES.BASIC];
        }
        // Input marker - CREATE SEPARATE STANDALONE NODE (not phase)
        // Input nodes are displayed without speech bubbles on mobile
        else if (f.type === "input" && !f.text) {
          // Save current dialogue with its current phases if exists
          if (currentDialogue) {
            out.push({
              ...currentDialogue,
              phaseSteps: currentPhaseSteps
            } as Scene);
          }

          // Create standalone input node
          out.push({
            type: "character",
            nodeType: "input",
            text: "",
            speaker: "left",
            background: ensureImageExtension(scene.background),
            "left-character": currentLeftCharacter,
            "right-character": currentRightCharacter,
            flowSequence: true,
            isFirstInFlow: false,
            conversationId,
            phaseSteps: [PHASES.INPUT],
            hidesSpeechBubble: true,
          } as Scene);

          // Reset state
          currentDialogue = null;
          currentPhaseSteps = [PHASES.BASIC];
        }
        // Unrecognized flow item - ignore
        else {
          // console.log('[loadStory] Skipping unrecognized flow item at index', flowIndex, f);
        }
      });

      // Save last dialogue if exists
      if (currentDialogue) {
        const finalScene = currentDialogue as Scene;
        out.push({
          ...finalScene,
          phaseSteps: currentPhaseSteps
        });
      }
    } else if (scene.type === "image" && scene.image) {
      // Create single image scene with caption (if text is present)
      // Determine phaseSteps based on whether caption exists
      const hasCaption = !!scene.text;
      const phaseSteps: Phase[] = hasCaption
        ? [PHASES.IMAGE_ONLY, PHASES.CAPTION]
        : [PHASES.IMAGE_ONLY];

      // console.log('[loadStory] Image scene:', {
    // hasCaption,
    // phaseSteps,
    // text: scene.text?.substring(0, 30)
    // });

      out.push({
        type: "image",
        sceneId: `scene-${sceneCounter++}`,
        image: ensureStoryImagePath(scene.image),
        text: scene.text, // Include caption text from the JSON
        background: ensureImageExtension(scene.background),
        flowSequence: false,
        isFirstInFlow: false,
        phaseSteps, // Explicitly set phaseSteps
      } as Scene);
    } else {
      // Pass-through for any already-flat scene types you might have
      // Add flowSequence and isFirstInFlow properties for background system compatibility
      // Apply image extension normalization to image and background fields
      out.push({
        ...scene,
        sceneId: `scene-${sceneCounter++}`,
        image: ensureImageExtension(scene.image),
        background: ensureImageExtension(scene.background),
        flowSequence: false,
        isFirstInFlow: false,
        panelRestricted: false,
      } as Scene);
    }
  });

  return { scenes: out, flowMetadata };
}

export async function loadStory(url: string): Promise<{ story: Story; flowMetadata: ConversationMetadataMap }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load story: ${res.status}`);
  const data = (await res.json()) as RawStory;
  const rawScenes = data.scenes ?? [];
  const depositions = data.depositions;
  const { scenes, flowMetadata } = flattenScenes(rawScenes);

  // Load character descriptions from depositions array in story.json
  // The CharacterDescription field references a character name that matches a deposition
  Object.entries(flowMetadata).forEach(([conversationId, metadata]) => {
    if (metadata.characterDescription) {
      const loadedDescription = getCharacterDescription(
        metadata.characterDescription,
        depositions
      );
      if (loadedDescription) {
        flowMetadata[conversationId].characterDescription = loadedDescription;
      }
      // If not found, keep the original value (for backward compatibility with inline descriptions)
    }
  });

  return { story: { scenes, wrongCharacter: data.wrongCharacter as string | undefined }, flowMetadata };
}
