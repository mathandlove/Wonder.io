import type { Scene } from "../../types/scene";
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
    // Check if this is a character scene that starts or continues a flow
    // Character scenes have left-character and/or right-character properties
    const hasCharacters = (s as any)["left-character"] || (s as any)["right-character"];
    let isNewFlow = false;

    if (s.type === "character" && hasCharacters) {
      // Detect if this is a new flow (explicit character change or new character introduction)
      const sceneLeft = (s as any)["left-character"];
      const sceneRight = (s as any)["right-character"];

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

      // For character scenes, determine speaking state based on speaker and whether character was already present
      if (s.type === "character") {
        const speaker = (s as any).speaker;
        const meta = { ...(s as any).meta };

        // Set character data with animation state
        if (currentLeft) {
          const previousCharacter = previousLeft;
          const currentCharacter = currentLeft;
          // Look ahead to next scene for aboutToSwap detection
          const nextScene = scenes[i + 1];
          const nextCharacter = nextScene?.type === "character" ?
            (nextScene as any)["left-character"] ||
            nextScene?.meta?.panelLeft?.character :
            // For quest scenes, assume character continues; for image scenes, character disappears
            nextScene?.type === "quest" ? currentCharacter : NOCHARACTER;

          const isSpeaking = speaker === 'left';
          const isPageFactoryScene = !s.flowSequence && s.type === "character";

          // Determine main animation state
          let animationState: string;
          if (isPageFactoryScene && isSpeaking) {
            // PageFactory scenes - character speaks if they are the speaker
            animationState = "speaking";
          } else if (isPageFactoryScene && !isSpeaking) {
            // PageFactory scenes - non-speaking character is idle
            animationState = "idle";
          } else if (previousCharacter !== currentCharacter) {
            // Character changed - play combined exit→enter animation
            animationState = "entering";
          } else if (isSpeaking) {
            // Character present and speaking
            animationState = "speaking";
          } else {
            // Character present but idle
            animationState = "idle";
          }

          // Check if character will exit in next scene
          const aboutToSwap = nextCharacter !== currentCharacter;

          meta.panelLeft = {
            character: currentLeft,
            previousCharacter: previousCharacter || NOCHARACTER,
            nextCharacter: nextCharacter || NOCHARACTER,
            animationState,
            aboutToSwap
          };
        }

        if (currentRight) {
          const previousCharacter = previousRight;
          const currentCharacter = currentRight;
          // Look ahead to next scene for aboutToSwap detection
          const nextScene = scenes[i + 1];
          const nextCharacter = nextScene?.type === "character" ?
            (nextScene as any)["right-character"] ||
            nextScene?.meta?.panelRight?.character :
            // For quest scenes, assume character continues; for image scenes, character disappears
            nextScene?.type === "quest" ? currentCharacter : NOCHARACTER;

          const isSpeaking = speaker === 'right';
          const isPageFactoryScene = !s.flowSequence && s.type === "character";

          // Determine main animation state
          let animationState: string;
          if (isPageFactoryScene && isSpeaking) {
            // PageFactory scenes - character speaks if they are the speaker
            animationState = "speaking";
          } else if (isPageFactoryScene && !isSpeaking) {
            // PageFactory scenes - non-speaking character is idle
            animationState = "idle";
          } else if (previousCharacter !== currentCharacter) {
            // Character changed - play combined exit→enter animation
            animationState = "entering";
          } else if (isSpeaking) {
            // Character present and speaking
            animationState = "speaking";
          } else {
            // Character present but idle
            animationState = "idle";
          }

          // Check if character will exit in next scene
          const aboutToSwap = nextCharacter !== currentCharacter;

          meta.panelRight = {
            character: currentRight,
            previousCharacter: previousCharacter || NOCHARACTER,
            nextCharacter: nextCharacter || NOCHARACTER,
            animationState,
            aboutToSwap
          };
        }

        // Determine if bubble should animate immediately (not wait for entrance)
        const leftIsEntering = meta.panelLeft?.animationState === 'entering';
        const rightIsEntering = meta.panelRight?.animationState === 'entering';
        const speakerSide = (s as any).speaker;

        // Bubble animates immediately if the speaking character is not entering
        const bubbleAnimateImmediately = speakerSide === 'left' ? !leftIsEntering :
                                        speakerSide === 'right' ? !rightIsEntering :
                                        true; // Center speakers always animate immediately

        meta.bubbleAnimateImmediately = bubbleAnimateImmediately;

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

        // For scenes not in character flows, inject NOCHARACTER with proper animation states
        const meta = { ...(s as any).meta };

        // Check if we had characters before this scene (should animate entering)
        const hadLeftCharacter = prevLeftCharacter && prevLeftCharacter !== NOCHARACTER;
        const hadRightCharacter = prevRightCharacter && prevRightCharacter !== NOCHARACTER;

        meta.panelLeft = {
          character: NOCHARACTER,
          previousCharacter: prevLeftCharacter || NOCHARACTER,
          nextCharacter: NOCHARACTER,
          animationState: hadLeftCharacter ? "entering" : "idle",
          aboutToSwap: false
        };
        meta.panelRight = {
          character: NOCHARACTER,
          previousCharacter: prevRightCharacter || NOCHARACTER,
          nextCharacter: NOCHARACTER,
          animationState: hadRightCharacter ? "entering" : "idle",
          aboutToSwap: false
        };

        // Non-character scenes always animate immediately
        meta.bubbleAnimateImmediately = true;

        return { ...s, meta } as Scene;
      }
    }

    // For any scene in a character context, inject meta.panelLeft/Right
    if (inFlow || hasCharacters) {
      const meta = { ...(s as any).meta };
      // Always set both panels - use current character or NOCHARACTER
      meta.panelLeft = currentLeft ? { character: currentLeft } : { character: NOCHARACTER };
      meta.panelRight = currentRight ? { character: currentRight } : { character: NOCHARACTER };

      // Mark as new flow if this scene starts a new character flow
      const sceneData = { ...s, meta } as any;
      if (isNewFlow) {
        sceneData.newFlow = true;
      }

      return sceneData as Scene;
    }

    // Fallback: if scene doesn't match any condition above, still inject NOCHARACTER
    const meta = { ...(s as any).meta };
    meta.panelLeft = { character: NOCHARACTER };
    meta.panelRight = { character: NOCHARACTER };
    meta.bubbleAnimateImmediately = true; // Fallback scenes animate immediately

    return { ...s, meta } as Scene;
  });
  return out;
}