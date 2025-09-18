/**
 * Loads and processes story data from JSON files.
 * Flattens character-flow scenes into individual scenes and validates data structure.
 */
// src/data/loadStory.ts
import type { Scene, Story } from "../types/scene";

type RawFlowItem = {
  side?: "left" | "right";
  text?: string;
  waiting?: boolean;
  quest?: string;
  input?: string;
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

  rawScenes.forEach((scene) => {
    if (scene.type === "character-flow" && scene.flow) {
      scene.flow.forEach((f) => {
        if (f.waiting) {
          out.push({
            type: "waiting",
            background: scene.background,
            "left-character": scene["left-character"],
            "right-character": scene["right-character"],
          });
        } else if (f.quest) {
          out.push({
            type: "quest",
            text: f.quest,
            background: scene.background,
            "left-character": scene["left-character"],
            "right-character": scene["right-character"],
          });
        } else if (f.input) {
          out.push({
            type: "input",
            text: f.input,
            background: scene.background,
            "left-character": scene["left-character"],
            "right-character": scene["right-character"],
          });
        } else if (f.text) {
          out.push({
            type: "character",
            text: f.text,
            speaker: f.side,
            background: scene.background,
            "left-character": scene["left-character"],
            "right-character": scene["right-character"],
          });
        }
      });
    } else if (scene.type === "image" && scene.image) {
      out.push({
        type: "image",
        image: scene.image,
        caption: scene.text,
        background: scene.background,
      });
    } else {
      // Pass-through for any already-flat scene types you might have
      // (If needed, map them explicitly later.)
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