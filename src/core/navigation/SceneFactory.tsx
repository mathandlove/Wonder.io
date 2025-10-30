/**
 * SceneFactory (formerly PageFactory/NodeFactory) - Creates new scenes dynamically
 *
 * Architecture:
 * - Creates Scene objects with proper sceneId and initial phase="basic"
 * - Scenes are added to NodeManager via insertScene()
 * - NodeManager's buildNavigationGraph() converts scenes to nodes automatically
 *
 * Scene → Node Conversion (happens automatically in navigationGraphBuilder):
 * - All scenes create a single basic node
 * - Phase tracking is handled on the scene itself, not via multiple nodes
 * - FailDanceScene → Node with state: dance:fail (answer-wrong)
 * - SuccessDanceScene → Node with state: dance:success (answer-right)
 */
import React, { createContext, useContext } from "react";
import type { CharacterScene, Scene, FailDanceScene, SuccessDanceScene } from "@core/types/scene";
import { NOCHARACTER } from "@features/characters/buildPanelRangesFromScenes";

/**
 * SceneFactory context - provides scene creation methods
 *
 * Creates Scene objects that will be converted to Nodes by the navigation
 * graph builder. Scenes are the source data, nodes are derived.
 */
type SceneFactoryContextType = {
  /**
   * Creates a recording scene (user is speaking)
   * Sets phase='basic' initially
   */
  createRecordingScene: (
    recordingId: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ) => CharacterScene;

  /**
   * Creates an AI response scene (NPC speaking)
   * Sets phase='basic' initially
   */
  createAIResponseScene: (
    responseText: string,
    flowId: string | undefined,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ) => CharacterScene;

  /**
   * Creates a fail-dance scene (wrong answer animation)
   * Converts to: Node with state dance:fail (answer-wrong)
   */
  createFailDanceScene: (
    character: string,
    answerText: string,
    questionText: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ) => FailDanceScene;

  /**
   * Creates a success-dance scene (correct answer animation)
   * Converts to: Node with state dance:success (answer-right)
   */
  createSuccessDanceScene: (
    character: string,
    answerText: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ) => SuccessDanceScene;
};

const SceneFactoryContext = createContext<SceneFactoryContextType | null>(null);

type SceneFactoryProviderProps = {
  children: React.ReactNode;
  onSceneAdded?: (scene: Scene) => void;
};

export function SceneFactoryProvider({ children }: SceneFactoryProviderProps) {

  /**
   * Create a recording scene - CharacterScene for user input
   *
   * Flow:
   * 1. User clicks Ask/Record button
   * 2. This scene is created with unique recordingId and phase='basic'
   * 3. Added to navigation graph via insertScene()
   * 4. Graph builder creates a single node with state: dialogue:basic
   * 5. Phase transitions are managed separately (e.g., basic → recording → processing)
   *
   * @param recordingId - Unique ID linking scene to recording session
   * @param currentBackground - Inherited background for visual continuity
   * @param leftCharacter - User's character (usually left side)
   * @param rightCharacter - NPC character (usually right side)
   * @returns CharacterScene with phase='basic'
   */
  const createRecordingScene = (
    recordingId: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ): CharacterScene => {
    const sceneId = `recording-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newScene: CharacterScene = {
      type: "character",
      sceneId,
      text: "Test words", // Debug text for visibility - will be replaced by transcript
      speaker: "left", // User is speaking
      recordingId,
      "left-character": leftCharacter || "leo", // Inherit or fallback
      "right-character": rightCharacter || "bakerMom", // Inherit or fallback
      background: currentBackground, // Inherit background from current scene
      phase: "basic", // All scenes start with basic phase
    };

    return newScene;
  };

  /**
   * Create an AI response scene - CharacterScene for NPC response
   *
   * Flow:
   * 1. AI processes user's question from recording scene
   * 2. This scene is created with AI's response text and phase='basic'
   * 3. Added to navigation graph via insertScene()
   * 4. Graph builder creates a single node with state: dialogue:basic
   * 5. Phase can be managed separately if needed (e.g., to show input UI)
   *
   * @param responseText - AI's response to display
   * @param flowId - Conversation flow ID for continuity
   * @param currentBackground - Inherited background
   * @param leftCharacter - User's character
   * @param rightCharacter - NPC/AI character (speaker)
   * @returns CharacterScene with phase='basic'
   */
  const createAIResponseScene = (
    responseText: string,
    flowId: string | undefined,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ): CharacterScene => {
    const sceneId = `ai-response-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newScene: CharacterScene = {
      type: "character",
      sceneId,
      text: responseText, // AI's response text
      speaker: "right", // AI character speaks
      flowId, // Preserve flowId for conversation continuity
      "left-character": leftCharacter || "leo", // User's character
      "right-character": rightCharacter || "bakerMom", // AI character
      background: currentBackground,
      phase: "basic", // All scenes start with basic phase
    };

    return newScene;
  };

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
  const createFailDanceScene = (
    character: string,
    answerText: string,
    questionText: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ): FailDanceScene => {
    const sceneId = `fail-dance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      phase: "basic", // All scenes start with basic phase
      // NOTE: meta will be injected automatically by injectPanelMetaFromFlows in StoryModeScroll
    };

    return newScene;
  };

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
  const createSuccessDanceScene = (
    character: string,
    answerText: string,
    currentBackground?: string,
    leftCharacter?: string,
    rightCharacter?: string
  ): SuccessDanceScene => {
    const sceneId = `success-dance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      phase: "basic", // All scenes start with basic phase
      // NOTE: meta will be injected automatically by injectPanelMetaFromFlows in StoryModeScroll
    };

    return newScene;
  };

  const contextValue: SceneFactoryContextType = {
    createRecordingScene,
    createAIResponseScene,
    createFailDanceScene,
    createSuccessDanceScene
  };

  return (
    <SceneFactoryContext.Provider value={contextValue}>
      {children}
    </SceneFactoryContext.Provider>
  );
}

/**
 * Hook to access SceneFactory (scene creation) functionality
 *
 * Usage Pattern:
 * ```typescript
 * const { createRecordingScene } = useSceneFactory();
 * const newScene = createRecordingScene(recordingId, background, left, right);
 * insertScene(currentSceneId, newScene); // Adds to NodeManager
 * // Scene automatically expands to Node(s) via buildNavigationGraph
 * ```
 *
 * Creates Scene objects that are the source data for the navigation graph.
 * NodeManager's buildNavigationGraph() converts scenes to nodes automatically.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSceneFactory() {
  const ctx = useContext(SceneFactoryContext);
  if (!ctx) throw new Error("useSceneFactory must be used within SceneFactoryProvider");
  return ctx;
}

// Deprecated: Use useSceneFactory instead
// eslint-disable-next-line react-refresh/only-export-components
export const usePageFactory = useSceneFactory;

/**
 * ARCHITECTURE NOTES
 * ==================
 *
 * Why SceneFactory creates Scenes instead of Nodes directly:
 *
 * 1. **Scenes are the source of truth** - stored in NodeManager.allScenes
 * 2. **Nodes are derived** - generated by buildNavigationGraph() from scenes
 * 3. **Single expansion logic** - all scenes go through the same builder
 * 4. **Phase-based state management** - scenes have a phase field (default: "basic")
 *
 * The Scene → Node conversion happens in navigationGraphBuilder.ts:
 * - All scene types create a single node (no more multi-state expansion)
 * - `character` type → single `dialogue:basic` node
 * - `image` type → single `image:basic` node
 * - `fail-dance` type → `dance:fail` node with answer-wrong state
 * - `success-dance` type → `dance:success` node with answer-right state
 * - Phase transitions are managed on the scene object itself, not via multiple nodes
 *
 * This architecture ensures:
 * - Consistent node creation
 * - Proper linking (prev/next pointers)
 * - Simpler scene/node relationship (1:1 instead of 1:many)
 * - Scene registry updates
 * - Graph integrity
 */