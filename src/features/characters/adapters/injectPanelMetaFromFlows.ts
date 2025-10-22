/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Scene } from "@core/types/scene";
import { NOCHARACTER } from "../buildPanelRangesFromScenes";

// Input: flattened scenes
// Output: new scenes array where any scene inside a character-flow
// has meta.panelLeft/meta.panelRight set to { character: string }.
export function injectPanelMetaFromFlows(scenes: Scene[]): Scene[] {
  if (!Array.isArray(scenes) || scenes.length === 0) return scenes;

  let inFlow = false;
  let currentLeft: string | null = null;
  let currentRight: string | null = null;

  const out = scenes.map((s, i) => {
    // Debug logging for fail-dance scenes
    if ((s as any).type === 'fail-dance') {
      console.log('[injectPanelMetaFromFlows] Processing fail-dance scene:', {
        index: i,
        leftCharacter: (s as any)['left-character'],
        rightCharacter: (s as any)['right-character'],
        dancingSide: (s as any).side,
        currentLeft,
        currentRight
      });
    }

    // Check if this is a scene that has character data (character, input, quest, etc.)
    // These scenes have left-character and/or right-character properties
    const hasCharacters = (s as any)["left-character"] || (s as any)["right-character"];
    let isNewFlow = false;

    if (hasCharacters) {
      // Update character tracking for any scene type with character data
      const sceneLeft = (s as any)["left-character"];
      const sceneRight = (s as any)["right-character"];

      // Check if this scene has "input" or "interactive-bubble" in States array
      // NOTE: These are not scene types - they're feature states in character-flow scenes
      const sceneStates = (s as any).States as string[] | undefined;
      const hasInputState = sceneStates?.includes('input');
      const hasInteractiveBubble = sceneStates?.includes('interactive-bubble');

      // For non-character scenes that don't have character-related states, skip processing
      if (s.type !== "character" && s.type !== "fail-dance" && !hasInputState && !hasInteractiveBubble) {
        currentLeft = sceneLeft || currentLeft;
        currentRight = sceneRight || currentRight;
        return s; // Return unchanged for scenes that don't need character rendering
      }

      // Continue with character scene processing...
      // Detect if this is a new flow (explicit character change or new character introduction)

      // Check if this scene explicitly resets characters (new flow detected)
      // Don't treat the very first character scene as a new flow
      const hasExistingFlow = currentLeft !== null || currentRight !== null;
      isNewFlow = hasExistingFlow && (
        (sceneLeft && !sceneRight && currentRight) || // Only left char when we had right
        (sceneLeft !== currentLeft && !!sceneLeft) ||     // Different left character
        (sceneRight !== currentRight && !!sceneRight)     // Different right character
      );

      // Store previous character state to determine who was already present
      const previousLeft = currentLeft;
      const previousRight = currentRight;

      // Update current character state
      if (isNewFlow) {
        // Reset to only what this scene explicitly defines
        currentLeft = sceneLeft || null;
        currentRight = sceneRight || null;
      } else {
        // Continue previous flow
        currentLeft = sceneLeft ?? currentLeft;
        currentRight = sceneRight ?? currentRight;
      }
      inFlow = true;

      // For character scenes, fail-dance scenes, and scenes with input state, determine speaking state
      if (s.type === "character" || s.type === "fail-dance" || hasInputState) {
        // @ts-expect-error - Reserved for future use
        const _speaker = (s as any).speaker; // Unused - reserved for future use
        const meta = { ...(s as any).meta };

        // Helper function to create panel state
        const createPanelState = (side: 'left' | 'right', current: string | null, previous: string | null) => {
          if (!current) return null;

          const nextScene = scenes[i + 1];
          const nextCharacterKey = side === 'left' ? 'left-character' : 'right-character';
          const nextSceneStates = nextScene ? (nextScene as any).States as string[] | undefined : undefined;
          const hasQuestState = nextSceneStates?.includes('quest');

          const nextCharacter = (nextScene?.type === "character" || nextScene?.type === "fail-dance") ?
            (nextScene as any)[nextCharacterKey] ||
            nextScene?.meta?.[side === 'left' ? 'panelLeft' : 'panelRight']?.character :
            hasQuestState ? current : // Quest scenes keep current character
            // If no next scene exists, assume character continues (for dynamically created scenes)
            !nextScene ? current : NOCHARACTER;

          const aboutToSwap = nextCharacter !== current;
          // Character is "new" if it's different from the previous character
          const newCharacter = previous !== current;


          return {
            character: current,
            previousCharacter: previous || NOCHARACTER,
            nextCharacter: nextCharacter || NOCHARACTER,
            newCharacter,
            aboutToSwap
          };
        };

        // Set panel states
        const leftPanel = createPanelState('left', currentLeft, previousLeft);
        const rightPanel = createPanelState('right', currentRight, previousRight);

        if (leftPanel) meta.panelLeft = leftPanel;
        if (rightPanel) meta.panelRight = rightPanel;

        // Debug logging for fail-dance panel states
        if (s.type === 'fail-dance') {
          console.log('[injectPanelMetaFromFlows] Fail-dance panel states created:', {
            leftPanel: leftPanel ? { character: leftPanel.character, newCharacter: leftPanel.newCharacter } : null,
            rightPanel: rightPanel ? { character: rightPanel.character, newCharacter: rightPanel.newCharacter } : null
          });
        }

        // Bubble animates immediately if the speaking character is not new
        const speakerSide = (s as any).speaker;
        const speakingPanelNew = speakerSide === 'left' ? leftPanel?.newCharacter :
                                speakerSide === 'right' ? rightPanel?.newCharacter :
                                false;
        meta.bubbleAnimateImmediately = !speakingPanelNew;

        // Mark as new flow if this scene starts a new character flow
        const sceneData = { ...s, meta } as any;
        if (isNewFlow) {
          sceneData.newFlow = true;
        }

        return sceneData as Scene;
      }
    }

    // Check if we're leaving a character flow (non-character scene)
    if (s.type !== "character" && !hasCharacters) {
      // Only reset if we're not in a flow sequence
      if (!(s as any).flowSequence) {
        // Save the characters before resetting
        const prevLeftCharacter = currentLeft;
        const prevRightCharacter = currentRight;

        inFlow = false;
        currentLeft = null;
        currentRight = null;

        // For scenes ending character flows, animate character exit
        const meta = { ...(s as any).meta };
        const hadLeftChar = prevLeftCharacter && prevLeftCharacter !== NOCHARACTER;
        const hadRightChar = prevRightCharacter && prevRightCharacter !== NOCHARACTER;

        meta.panelLeft = {
          character: NOCHARACTER,
          previousCharacter: prevLeftCharacter || NOCHARACTER,
          nextCharacter: NOCHARACTER,
          newCharacter: hadLeftChar,
          aboutToSwap: false
        };
        meta.panelRight = {
          character: NOCHARACTER,
          previousCharacter: prevRightCharacter || NOCHARACTER,
          nextCharacter: NOCHARACTER,
          newCharacter: hadRightChar,
          aboutToSwap: false
        };
        meta.bubbleAnimateImmediately = true;

        return { ...s, meta } as Scene;
      }
    }

    // For any scene in a character context, inject basic panel metadata
    if (inFlow || hasCharacters) {
      const meta = { ...(s as any).meta };
      meta.panelLeft = { character: currentLeft || NOCHARACTER };
      meta.panelRight = { character: currentRight || NOCHARACTER };

      const sceneData = { ...s, meta } as any;
      if (isNewFlow) sceneData.newFlow = true;

      return sceneData as Scene;
    }

    // Fallback: inject NOCHARACTER for scenes outside character flows
    const meta = { ...(s as any).meta };
    meta.panelLeft = { character: NOCHARACTER };
    meta.panelRight = { character: NOCHARACTER };
    meta.bubbleAnimateImmediately = true;

    return { ...s, meta } as Scene;
  });

  return out;
}