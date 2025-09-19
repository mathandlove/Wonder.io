import type { Scene } from "../../types/scene";

// Input: flattened scenes
// Output: new scenes array where any scene inside a character-flow
// has meta.panelLeft/meta.panelRight set to { character: string }.
export function injectPanelMetaFromFlows(scenes: Scene[]): Scene[] {
  if (!Array.isArray(scenes) || scenes.length === 0) return scenes;

  let inFlow = false;
  let currentLeft: string | null = null;
  let currentRight: string | null = null;

  const out = scenes.map((s) => {
    // Check if this is a character scene that starts or continues a flow
    // Character scenes have left-character and/or right-character properties
    const hasCharacters = (s as any)["left-character"] || (s as any)["right-character"];

    if (s.type === "character" && hasCharacters) {
      // Update current character state
      currentLeft = (s as any)["left-character"] ?? currentLeft;
      currentRight = (s as any)["right-character"] ?? currentRight;
      inFlow = true;
    }

    // Check if we're leaving a character flow (non-character scene)
    if (s.type !== "character" && !hasCharacters) {
      // Only reset if we're not in a flow sequence
      if (!(s as any).flowSequence) {
        inFlow = false;
        currentLeft = null;
        currentRight = null;
        return s;
      }
    }

    // For any scene in a character context, inject meta.panelLeft/Right
    if (inFlow || hasCharacters) {
      const meta = { ...(s as any).meta };
      // Only characters, no poses/speaking
      if (currentLeft)  meta.panelLeft  = { character: currentLeft };
      if (currentRight) meta.panelRight = { character: currentRight };
      return { ...s, meta } as Scene;
    }

    return s;
  });

  return out;
}