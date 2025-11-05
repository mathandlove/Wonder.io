/**
 * SceneFactory - Pure utility functions for creating scenes
 *
 * Architecture:
 * - Pure functions with no React dependencies
 * - Can be used by XState actions, orchestrators, and React components
 * - Creates Scene objects with proper sceneId and initial phase="basic"
 * - Scenes are added to navigationStore via insertSceneNodes()
 *
 * Scene → Node Conversion (happens automatically in navigationGraphBuilder):
 * - All scenes create a single basic node
 * - Phase tracking is handled on the scene itself, not via multiple nodes
 * - FailDanceScene → Node with state: dance:fail (answer-wrong)
 * - SuccessDanceScene → Node with state: dance:success (answer-right)
 */

import type { CharacterScene, FailDanceScene, SuccessDanceScene } from "@core/types/scene";
import { NOCHARACTER } from "@features/characters/buildPanelRangesFromScenes";

/**
 * Create a recording scene - CharacterScene for user input
 *
 * Flow:
 * 1. User clicks Ask/Record button
 * 2. This scene is created with unique recordingId and phase='basic'
 * 3. Added to navigation graph via insertSceneNodes()
 * 4. Graph builder creates a single node with state: dialogue:basic
 * 5. Phase transitions are managed separately (e.g., basic → recording → processing)
 *
 * @param recordingId - Unique ID linking scene to recording session
 * @param conversationId - Conversation context ID (inherited from parent scene)
 * @param currentBackground - Inherited background for visual continuity
 * @param leftCharacter - User's character (usually left side)
 * @param rightCharacter - NPC character (usually right side)
 * @returns CharacterScene with phase='basic'
 */
export function createRecordingScene(
  recordingId: string,
  conversationId: string | undefined,
  currentBackground?: string,
  leftCharacter?: string,
  rightCharacter?: string
): CharacterScene {
  const sceneId = `recording-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // console.log('[createRecordingScene] 🎨 Creating recording scene:', {
  //   background: currentBackground,
  //   conversationId,
  //   leftCharacter,
  //   rightCharacter
  // });

  const newScene: CharacterScene = {
    type: "character",
    sceneId,
    text: "Test words", // Debug text for visibility - will be replaced by transcript
    speaker: "left", // User is speaking
    recordingId,
    conversationId, // Inherit conversationId from parent scene for AI context continuity
    "left-character": leftCharacter || "leo", // Inherit or fallback
    "right-character": rightCharacter || "bakerMom", // Inherit or fallback
    background: currentBackground, // Inherit background from current scene
    flowSequence: true, // Mark as part of flow to prevent background range changes
    isFirstInFlow: false, // Not the first in flow, so inherit background from previous scene
    phase: "basic", // All scenes start with basic phase
  };

  return newScene;
}

/**
 * Create an AI response scene - CharacterScene for NPC response with immediate input
 *
 * Flow:
 * 1. AI processes user's question from recording scene
 * 2. This scene is created with AI's response text and phase='input'
 * 3. Added to navigation graph via insertSceneNodes()
 * 4. Scene immediately shows AI response with Ask button for follow-up questions
 * 5. User can immediately ask another question without scrolling
 *
 * @param responseText - AI's response to display
 * @param conversationId - Conversation context ID for continuity
 * @param currentBackground - Inherited background
 * @param leftCharacter - User's character
 * @param rightCharacter - NPC/AI character (speaker)
 * @returns CharacterScene with phase='input' for immediate follow-up
 */
export function createAIResponseScene(
  responseText: string,
  conversationId: string | undefined,
  currentBackground?: string,
  leftCharacter?: string,
  rightCharacter?: string
): CharacterScene {
  const sceneId = `ai-response-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // console.log('[createAIResponseScene] 🎨 Creating AI response scene:', {
  //   background: currentBackground,
  //   conversationId,
  //   leftCharacter,
  //   rightCharacter
  // });

  const newScene: CharacterScene = {
    type: "character",
    sceneId,
    text: responseText, // AI's response text
    speaker: "right", // AI character speaks
    conversationId, // Preserve conversationId for conversation continuity
    "left-character": leftCharacter || "leo", // User's character
    "right-character": rightCharacter || "bakerMom", // AI character
    background: currentBackground,
    flowSequence: true, // Mark as part of flow to prevent background range changes
    isFirstInFlow: false, // Not the first in flow, so inherit background from previous scene
    phase: "input", // Immediately show input UI for follow-up questions
    phaseSteps: ["input"], // Only input phase available (no progression needed)
  };

  return newScene;
}

/**
 * Create a fail-dance scene - Animation for incorrect quest answers
 *
 * Flow:
 * 1. User gives wrong answer to quest
 * 2. answer-wrong state shows feedback (1 second)
 * 3. This scene is created and inserted
 * 4. Expands to Node with state: dance:fail (answer-wrong)
 * 5. Angry character animation plays
 * 6. Returns to input-showInput for retry
 *
 * Visual:
 * - Left character visible (user)
 * - Right character exits (triggers exit animation via NOCHARACTER)
 * - Angry overlay animation on right side
 * - Record panel shows answer text, quest, and seal
 *
 * @param character - Character to show angry (usually NPC)
 * @param answerText - Wrong answer text to display
 * @param questionText - Quest question for context
 * @param currentBackground - Inherited background
 * @param leftCharacter - User's character (visible)
 * @param rightCharacter - Usually NOCHARACTER to trigger exit
 * @returns FailDanceScene that will expand to answer-wrong node
 */
export function createFailDanceScene(
  character: string,
  answerText: string,
  questionText: string,
  currentBackground?: string,
  leftCharacter?: string,
  rightCharacter?: string
): FailDanceScene {
  const sceneId = `fail-dance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // console.log('[createFailDanceScene] 🎨 Creating fail-dance scene:', {
  //   background: currentBackground,
  //   leftCharacter,
  //   rightCharacter
  // });

  const newScene: FailDanceScene = {
    type: "fail-dance",
    sceneId,
    character: character,
    angryCharacter: `angry${character}`,
    side: "right",
    "left-character": leftCharacter || "leo", // Inherit or fallback
    "right-character": rightCharacter || NOCHARACTER, // Use NOCHARACTER to trigger exit animation
    background: currentBackground,
    answerText: answerText,
    questionText: questionText,
    duration: 3500,
    phase: "fail-dance", // Matches phaseSteps for fail-dance scenes
    phaseSteps: ["fail-dance"], // Only one phase - the animation itself
    flowSequence: true, // Mark as part of flow to prevent background range changes
    isFirstInFlow: false, // Not the first in flow, so inherit background from previous scene
    // NOTE: meta will be injected automatically by injectPanelMetaFromFlows in StoryModeScroll
  };

  return newScene;
}

/**
 * Create a success-dance scene - Animation for correct quest answers
 *
 * Flow:
 * 1. User gives correct answer to quest
 * 2. answer-right state shows feedback with jiggle animation
 * 3. This scene is created and inserted
 * 4. Expands to Node with state: dance:success (answer-right)
 * 5. Happy/celebration character animation plays
 * 6. Auto-advances to next scene after completion
 *
 * Visual:
 * - Both characters visible initially
 * - Happy overlay animation (celebration)
 * - Record panel shows answer text
 *
 * @param character - Character to show happy (usually NPC)
 * @param answerText - Correct answer text to display
 * @param currentBackground - Inherited background
 * @param leftCharacter - User's character (visible)
 * @param rightCharacter - NPC character (kept visible for celebration)
 * @returns SuccessDanceScene that will expand to answer-right node
 */
export function createSuccessDanceScene(
  character: string,
  answerText: string,
  currentBackground?: string,
  leftCharacter?: string,
  rightCharacter?: string
): SuccessDanceScene {
  const sceneId = `success-dance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // console.log('[createSuccessDanceScene] 🎨 Creating success-dance scene:', {
  //   background: currentBackground,
  //   leftCharacter,
  //   rightCharacter
  // });

  const newScene: SuccessDanceScene = {
    type: "success-dance",
    sceneId,
    character: character,
    happyCharacter: `happy${character}`,
    side: "right",
    "left-character": leftCharacter || "leo", // Inherit or fallback
    "right-character": rightCharacter || NOCHARACTER, // Use NOCHARACTER to trigger exit animation
    background: currentBackground,
    answerText: answerText,
    duration: 3500,
    phase: "success-dance", // Matches phaseSteps for success-dance scenes
    phaseSteps: ["success-dance"], // Only one phase - the animation itself
    flowSequence: true, // Mark as part of flow to prevent background range changes
    isFirstInFlow: false, // Not the first in flow, so inherit background from previous scene
    // NOTE: meta will be injected automatically by injectPanelMetaFromFlows in StoryModeScroll
  };

  return newScene;
}

/**
 * ARCHITECTURE NOTES
 * ==================
 *
 * Why SceneFactory is now a pure module instead of React Context:
 *
 * 1. **XState compatibility** - Actions can import and use these functions directly
 * 2. **Universal access** - Works in React components, XState actions, and tests
 * 3. **No side effects** - Pure functions with deterministic outputs
 * 4. **Better testability** - No need to mock React context
 * 5. **Simpler architecture** - Just import the function you need
 *
 * The Scene → Node conversion happens in navigationGraphBuilder.ts:
 * - All scene types create a single node (no more multi-state expansion)
 * - `character` type → single `dialogue:basic` node
 * - `image` type → single `image:basic` node
 * - `fail-dance` type → `dance:fail` node with answer-wrong state
 * - `success-dance` type → `dance:success` node with answer-right state
 * - Phase transitions are managed on the scene object itself, not via multiple nodes
 */
