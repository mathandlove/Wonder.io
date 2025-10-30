/**
 * Loads and processes story data from JSON files.
 * Flattens character-flow scenes into individual scenes and validates data structure.
 */
// src/data/loadStory.ts
import type { Scene, Story } from '@core/types/scene';
import type { FlowMetadataMap } from '@core/data/FlowMetadataStore';

// Re-export for convenience
export type { FlowMetadataMap } from '@core/data/FlowMetadataStore';

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
  flowMetadata: FlowMetadataMap;
}

function flattenScenes(rawScenes: RawScene[]): FlattenResult {
  const out: Scene[] = [];
  const flowMetadata: FlowMetadataMap = {};
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

      // Generate unique flowId if this flow has either input or quest metadata
      const hasMetadata = inputMetadataItem || questMetadataItem;
      const flowId = hasMetadata ? `flow-${flowCounter++}` : undefined;

      // Store metadata if found
      if (flowId) {
        flowMetadata[flowId] = {
          characterDescription: inputMetadataItem?.CharacterDescription,
          questText: questMetadataItem?.text,
          successAnswer: (questMetadataItem?.successAnswer || inputMetadataItem?.successAnswer)!
        };
      }

      // Track current characters throughout the flow
      let currentLeftCharacter = scene["left-character"];
      let currentRightCharacter = scene["right-character"];

      scene.flow.forEach((f, flowIndex) => {
        // Handle pure input metadata items (skip - they don't become scenes)
        if (f.type === "input" && !f.text && !f.quest) {
          return; // Skip creating a scene for this metadata item
        }

        // Handle pure quest metadata items (skip - they don't become scenes)
        if (f.type === "quest" && !f.side) {
          return; // Skip creating a scene for this metadata item
        }

        // Update characters if specified in this flow item
        if (f["left-character"]) {
          currentLeftCharacter = f["left-character"];
        }
        if (f["right-character"]) {
          currentRightCharacter = f["right-character"];
        }

        // Use the current character state
        let flattened: Partial<Scene> = {
        
          flowSequence: true,
          isFirstInFlow: flowIndex === 0,
          background: scene.background,
          "left-character": currentLeftCharacter,
          "right-character": currentRightCharacter,
        };

        // Attach flowId reference if this flow has metadata
        if (flowId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (flattened as any).flowId = flowId;
        }

        // Only create scenes for flow items with actual dialogue content
        if (f.input) {
          // Input flow items become character scenes
          flattened = {
            ...flattened,
            type: "character",
            text: f.input,
            speaker: f.side,
          };
        } else if (f.text) {
          flattened = {
            ...flattened,
            type: "character",
            text: f.text,
            speaker: f.side,
          };
        } else {
          // No text content, skip creating a scene
          return;
        }

        out.push(flattened as Scene);
      });
    } else if (scene.type === "image" && scene.image) {
      // Create single image scene with caption (if text is present)
      out.push({
        type: "image",
        sceneId: `scene-${sceneCounter++}`,
        image: scene.image,
        text: scene.text, // Include caption text from the JSON
        background: scene.background,
        flowSequence: false,
        isFirstInFlow: false,
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

export async function loadStory(url: string): Promise<{ story: Story; flowMetadata: FlowMetadataMap }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load story: ${res.status}`);
  const data = (await res.json()) as RawStory;
  const rawScenes = data.scenes ?? [];
  const { scenes, flowMetadata } = flattenScenes(rawScenes);
  return { story: { scenes }, flowMetadata };
}