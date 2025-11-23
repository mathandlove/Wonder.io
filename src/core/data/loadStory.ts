/**
 * Loads and processes story data from JSON files.
 * Flattens character-flow scenes into individual scenes and validates data structure.
 */
// src/data/loadStory.ts
import type { Scene, Story } from '@core/types/scene';
import type { ConversationMetadataMap } from '@core/data/FlowMetadataStore';
import { PHASES, type Phase } from '@core/navigation/navigationGraphTypes';

// Re-export for convenience
export type { ConversationMetadataMap } from '@core/data/FlowMetadataStore';

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
  // ...other raw fields allowed in your JSON
};

type RawStory = {
  scenes?: RawScene[];
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

  rawScenes.forEach((scene) => {
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
          useClues: scene.useClues
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
            background: scene.background,
            "left-character": currentLeftCharacter,
            "right-character": currentRightCharacter,
            flowSequence: true,
            isFirstInFlow,
            conversationId
          };
          currentPhaseSteps = [PHASES.BASIC];
          isFirstInFlow = false;
        }
        // Quest marker - add quest-showing followed by appropriate next phase
        else if (f.type === "quest" && !f.side) {
          if (!currentDialogue) {
            console.warn('[loadStory] Quest marker found without preceding dialogue at flow index', flowIndex, '- skipping');
            return;
          }

          // Look ahead to see what follows the quest
          const nextFlowItem = scene.flow[flowIndex + 1];

          // Add quest-showing phase
          currentPhaseSteps.push(PHASES.QUEST_SHOWING);

          // Determine what should follow quest-showing:
          // - If next item is input marker → phases will be [basic, quest-showing, input]
          // - If next item is dialogue or nothing → add basic again [basic, quest-showing, basic]
          if (nextFlowItem?.type === "input" && !nextFlowItem.text) {
            // Input follows quest - don't add basic yet, wait for input processing
            // Phase sequence will be: basic → quest-showing → input
          } else {
            // Next is dialogue or end of flow - add basic so scroll back lands on basic
            // Phase sequence will be: basic → quest-showing → basic
            currentPhaseSteps.push(PHASES.BASIC);
          }
        }
        // Input marker - add to current dialogue's phases
        else if (f.type === "input" && !f.text) {
          if (!currentDialogue) {
            console.warn('[loadStory] Input marker found without preceding dialogue at flow index', flowIndex, '- skipping');
            return;
          }
          currentPhaseSteps.push(PHASES.INPUT);
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
        image: scene.image,
        text: scene.text, // Include caption text from the JSON
        background: scene.background,
        flowSequence: false,
        isFirstInFlow: false,
        phaseSteps, // Explicitly set phaseSteps
      } as Scene);
    } else {
      // Pass-through for any already-flat scene types you might have
      // Add flowSequence and isFirstInFlow properties for background system compatibility
      out.push({
        ...scene,
        sceneId: `scene-${sceneCounter++}`,
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
  const { scenes, flowMetadata } = flattenScenes(rawScenes);
  return { story: { scenes }, flowMetadata };
}
