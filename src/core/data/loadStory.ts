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
  quest?: string;
  input?: string;
  type?: "input" | "quest"; // Marks this as metadata item
  CharacterDescription?: string; // AI chat context (for input)
  successAnswer?: string; // Expected phrase for quest completion
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
      // Scan for input metadata in this flow
      const inputMetadataItem = scene.flow.find(
        f => f.type === "input" && f.CharacterDescription
      );

      // Scan for quest metadata in this flow
      const questMetadataItem = scene.flow.find(
        f => f.type === "quest" && f.text && f.successAnswer
      );

      // Generate unique conversationId if this flow has either input or quest metadata
      const hasMetadata = inputMetadataItem || questMetadataItem;
      const conversationId = hasMetadata ? `conv-${flowCounter++}` : undefined;

      // Store metadata if found
      if (conversationId) {
        flowMetadata[conversationId] = {
          characterDescription: inputMetadataItem?.CharacterDescription,
          questText: questMetadataItem?.text,
          successAnswer: (questMetadataItem?.successAnswer || inputMetadataItem?.successAnswer)!
        };
      }

      // Smart flow parsing: dialogue items "consume" following quest/input metadata
      // Algorithm: Iterate through flow, build scenes with their phaseSteps

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
        // Quest metadata - add quest-showing followed by appropriate next phase
        else if (f.type === "quest" && !f.side) {
          if (!currentDialogue) {
            console.warn('[loadStory] Quest metadata found without preceding dialogue at flow index', flowIndex, '- skipping');
            return;
          }

          // Look ahead to see what follows the quest
          const nextFlowItem = scene.flow[flowIndex + 1];

          // Add quest-showing phase
          currentPhaseSteps.push(PHASES.QUEST_SHOWING);

          // Determine what should follow quest-showing:
          // - If next item is input metadata → phases will be [basic, quest-showing, input]
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
        // Input metadata - add to current dialogue's phases
        else if (f.type === "input" && !f.text) {
          if (!currentDialogue) {
            console.warn('[loadStory] Input metadata found without preceding dialogue at flow index', flowIndex, '- skipping');
            return;
          }
          currentPhaseSteps.push(PHASES.INPUT);
        }
        // Legacy: flow items with f.input or f.quest (old format) - ignore
        else {
          console.log('[loadStory] Skipping unrecognized flow item at index', flowIndex, f);
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

      console.log('[loadStory] Image scene:', {
        hasCaption,
        phaseSteps,
        text: scene.text?.substring(0, 30)
      });

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