/**
 * Loads and processes story data from JSON files.
 * Flattens character-flow scenes into individual scenes and validates data structure.
 */
// src/data/loadStory.ts
import type { Scene, Story } from '@core/types/scene';

type RawFlowItem = {
  side?: "left" | "right";
  text?: string;
  waiting?: boolean;
  quest?: string;
  input?: string;
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

function flattenScenes(rawScenes: RawScene[]): Scene[] {
  const out: Scene[] = [];
  let sceneCounter = 0;

  rawScenes.forEach((scene) => {
    if (scene.type === "character-flow" && scene.flow) {
      // Track current characters throughout the flow
      let currentLeftCharacter = scene["left-character"];
      let currentRightCharacter = scene["right-character"];

      scene.flow.forEach((f, flowIndex) => {
        // Update characters if specified in this flow item
        if (f["left-character"]) {
          currentLeftCharacter = f["left-character"];
        }
        if (f["right-character"]) {
          currentRightCharacter = f["right-character"];
        }

        // Use the current character state
        let flattened: Partial<Scene> = {
          sceneId: `scene-${sceneCounter++}`,
          flowSequence: true,
          isFirstInFlow: flowIndex === 0,
          background: scene.background,
          "left-character": currentLeftCharacter,
          "right-character": currentRightCharacter,
        };

        if (f.quest) {
          flattened = {
            ...flattened,
            type: "quest",
            text: f.text || f.quest, // Use f.text if available, fallback to f.quest
          };
        } else if (f.input) {
          flattened = {
            ...flattened,
            type: "input",
            text: f.input,
          };
        } else if (f.text) {
          flattened = {
            ...flattened,
            type: "character",
            text: f.text,
            speaker: f.side,
          };
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

  return out;
}

export async function loadStory(url: string): Promise<Story> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load story: ${res.status}`);
  const data = (await res.json()) as RawStory;
  const rawScenes = data.scenes ?? [];
  const scenes = flattenScenes(rawScenes);
  return { scenes };
}