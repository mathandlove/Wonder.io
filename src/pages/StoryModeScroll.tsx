/**
 * Main story mode component that renders a story as scrollable scenes.
 * Each scene gets its own 100vh section with snap-scroll behavior.
 */
import React, { useMemo } from "react";
import { useStory } from '@core/data/useStory';
import { FlowLayout } from '@features/flow-layout/FlowLayout';
import { SceneRenderer } from '@core/scenes/SceneRenderer';
import { SceneFactoryProvider } from '@core/navigation/SceneFactory';
import { useNodeManager } from '@core/navigation/NodeManager';
import { BackgroundOrchestrator } from '@features/background/BackgroundOrchestrator';
import { CharacterOrchestrator } from '@features/characters/CharacterOrchestrator';
import { SpeechBubbleOrchestrator } from '@features/chat/orchestrators/SpeechBubbleOrchestrator';
import { injectPanelMetaFromFlows } from '@features/characters/adapters/injectPanelMetaFromFlows';
import { ScrollControl } from '@core/scroll/ScrollControl';
import { CharacterAnimationProvider } from '@features/characters/CharacterAnimationContext';
import TurnCueBanner from '@features/chat/components/TurnCueBanner';
import { useDialogue } from '@features/chat/context/useChatDialogue';
import type { Scene } from '@core/types/scene';

// Extended scene type for dynamic properties
type SceneWithId = Scene & {
  sceneId?: string;
  hidden?: boolean;
};

// Type extension for debugging window object
declare global {
  interface Window {
    __scenes?: Scene[];
  }
}
import { UIOverlayRoot } from '@core/uiLayout/UIOverlayRoot'
import { StepScrollDebug } from '@core/scroll/StepScrollDebug'
import { SceneStatesProvider } from '@core/data/PersistentObjects'
import { AIModuleProvider } from '@features/ai/AIModule'
import { AIMemoryStoreProvider } from '@core/ai/AIMemoryStore'
import { ChatFlowOrchestratorComponent } from '@core/dialogue/ChatFlowOrchestratorComponent'
import { AnswerValidationOrchestrator } from '@core/dialogue/AnswerValidationOrchestrator'
import { FlowMetadataProvider, useFlowMetadata } from '@core/data/FlowMetadataStore'
// Path to the story JSON bundle we want to load. In demo mode we keep this fixed
// so the experience is deterministic for the presentation.

const STORY_URL = "/stories/gingerbread.bundle/story.json"; // <- story content source

// FullScreen: tiny helper to center any message while we load or show an error
function FullScreen({ children }: { children: React.ReactNode }) {
  // Inline style keeps this component self-contained (no external CSS needed here)
  return (
    <div style={{ height: "100vh", width: "100vw", display: "grid", placeItems: "center" }}>
      <h2>{children}</h2>
    </div>
  );
}


// StoryModeScrollV2 is the main screen that renders scenes as full-screen snap sections
const StoryModeScroll: React.FC = () => {
  return (
    <FlowMetadataProvider>
      <StoryContent />
    </FlowMetadataProvider>
  );
};

// StoryContent: inner component that uses SceneManagerProvider context
const StoryContent: React.FC = () => {
  // Load story data
  const { story, flowMetadata, loading, error } = useStory(STORY_URL);

  // Flow metadata store
  const flowMetadataStore = useFlowMetadata();

  // Track if we've already populated the store to prevent infinite loops
  const hasPopulatedMetadata = React.useRef(false);

  // Navigation context
  const {
    setScenes,
    navigationGraph,
    getCurrentNode,
  } = useNodeManager();

  // Dialogue context for turn banners
  const { showTurnBanner, turnBannerText } = useDialogue();

  // Initialize navigation graph from story on FIRST load only
  // Use ref to prevent re-initialization if story object changes
  const hasInitializedGraph = React.useRef(false);
  React.useEffect(() => {
    if (!story?.scenes || hasInitializedGraph.current) return;

    // Build initial graph from story scenes (this only happens once)
    const processedScenes = injectPanelMetaFromFlows(story.scenes);
    setScenes(processedScenes);

    hasInitializedGraph.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.scenes]); // Only depend on story.scenes, ignore setScenes to prevent loops

  // Build array of all nodes from navigation graph for rendering
  const allNavigationNodes = useMemo(() => {
    return navigationGraph.order
      .map(nodeId => navigationGraph.byId[nodeId])
      .filter(node => node && node.status === 'active');
  }, [navigationGraph]);

  // Extract scenes from nodes and inject meta for character orchestration
  const allNavigationScenes = useMemo(() => {
    const scenes = allNavigationNodes.map(node => node.scene as Scene);
    return injectPanelMetaFromFlows(scenes);
  }, [allNavigationNodes]);

  // Deduplicate nodes by sceneId to get unique scenes for DOM rendering
  // Each scene may have multiple states/nodes, but only needs one DOM element
  const uniqueScenes = useMemo(() => {
    const seenSceneIds = new Set<string>();
    const unique: Scene[] = [];

    allNavigationNodes.forEach((node, index) => {
      const sceneId = node.sceneId;
      if (!seenSceneIds.has(sceneId)) {
        seenSceneIds.add(sceneId);
        // Use the scene from allNavigationScenes at the correct index
        const sceneWithMeta = allNavigationScenes[index];
        unique.push(sceneWithMeta);
      }
    });

    return unique;
  }, [allNavigationNodes, allNavigationScenes]);

  // Map current node to DOM scroll index
  // Find which unique scene corresponds to the current node's sceneId
  const scrollIndex = useMemo(() => {
    const currentNode = getCurrentNode();
    if (!currentNode) return 0;

    const currentSceneId = currentNode.sceneId;
    const index = uniqueScenes.findIndex(scene => {
      const sceneWithId = scene as Scene & { sceneId?: string };
      return sceneWithId.sceneId === currentSceneId;
    });

    return index >= 0 ? index : 0;
  }, [getCurrentNode, uniqueScenes]);

  // Calculate navigation index (position in the full node array)
  const navigationIndex = useMemo(() => {
    const currentNodeId = navigationGraph.currentId;
    if (!currentNodeId) return 0;

    const index = navigationGraph.order.indexOf(currentNodeId);
    return index >= 0 ? index : 0;
  }, [navigationGraph]);

  // Populate flow metadata store when story loads (only once)
  React.useEffect(() => {
    if (!flowMetadata || hasPopulatedMetadata.current) return;

    const entries = Object.entries(flowMetadata);
    if (entries.length === 0) return;

    // Populate the FlowMetadataStore with all flow metadata from the story
    entries.forEach(([flowId, metadata]) => {
      flowMetadataStore.setFlowMetadata(flowId, metadata);
    });

    hasPopulatedMetadata.current = true;
  }, [flowMetadata, flowMetadataStore]);

  // Derive a stable array of scenes from the loaded story and set them in SceneManager
  React.useEffect(() => {
    if (!story?.scenes) return;
    // Inject panel metadata once during story load
    const processedScenes = injectPanelMetaFromFlows(story.scenes);
    setScenes(processedScenes);
  }, [story?.scenes, setScenes]);

  // Handle scene index changes - now handled via scroll control
  // ScrollControl manages the visual scroll position
  // Navigation graph manages the logical navigation state
  const handleIndexChange = () => {
    // Note: ScrollControl handles scroll position
    // Navigation advances are triggered by user interactions (quest acceptance, etc.)
    // The scroll index is derived from the current node's sceneId
  };

  // Note: Focus management is now handled within ScrollControl component

  // RENDER PATH #1: still loading the story → show a friendly centered message
  if (loading) {
    return <FullScreen>Loading story…</FullScreen>;
  }

  // RENDER PATH #2: failed or empty story → show an error/empty state
  if (error || !story || navigationGraph.order.length === 0) {
    return (
      <FullScreen>
        {error ? `Problem loading story: ${error.message}` : "No story content found"}
      </FullScreen>
    );
  }

  // RENDER PATH #3: story loaded → render each scene in a vertical, snap-scrolling layout

  return (
    <SceneFactoryProvider>
      <AIMemoryStoreProvider maxMessagesPerFlow={10}>
        <AIModuleProvider>
          <SceneStatesProvider>
            <CharacterAnimationProvider>
            {/* ChatFlow orchestrator watches for ai-waiting state and triggers responses */}
            <ChatFlowOrchestratorComponent />

            {/* AnswerValidation orchestrator watches for answer-waiting state and validates */}
            <AnswerValidationOrchestrator />

            {/* Unified scroll control component - uses uniqueScenes from navigationArray */}
            <ScrollControl
            scenes={uniqueScenes}
            currentIndex={scrollIndex}
            onIndexChange={handleIndexChange}
            className="story-scroll"
          >
              {/* Layer 1: Hybrid background system - uses navigation graph internally */}
              <BackgroundOrchestrator storyId="gingerbread" storyContent={allNavigationScenes} currentIndex={navigationIndex} />

              {/* Layer 1.5: Character panels - uses navigation graph internally */}
              <CharacterOrchestrator storyId="gingerbread" scenes={allNavigationScenes} />

              {/* Layer 1.8: Speech bubbles - already uses navigationArray internally */}
              <SpeechBubbleOrchestrator />

              {/* Layer 1.9: Turn cue banner */}
              <TurnCueBanner show={showTurnBanner} text={turnBannerText} />

              {/* Layer 2: Document flow content with scroll snap targets - renders from navigationArray */}
              <div style={{ position: "relative" }}>
                {uniqueScenes.map((scene: Scene, i: number) => {
                  // Use stable ID if available, fallback to index for original scenes
                  const stableKey = (scene as SceneWithId).sceneId || `original-${i}`;

                  // Hidden scenes are already filtered out by NavigationContext,
                  // but add safety check and zero-height container if somehow present
                  if (scene.hidden) {
                    return (
                      <div
                        key={stableKey}
                        style={{ height: 0, overflow: 'hidden', visibility: 'hidden' }}
                      />
                    );
                  }

                  return (
                    <div
                      key={stableKey}
                      className="scene story-scene-container"
                      data-section-index={i}
                      style={{
                        minHeight: '100vh',
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always',
                        outline: 'none',
                      }}
                    >
                      <FlowLayout
                        keyId={i.toString()}
                        panelRestricted={(scene as unknown as { panelRestricted?: boolean })?.panelRestricted ?? false}
                      >
                        <SceneContentWithNavigation scene={scene} sceneIndex={i} />
                      </FlowLayout>
                    </div>
                  );
                })}
              </div>

            {/* Debug display - inside ScrollControl to access SceneOrchestrator context */}
            <StepScrollDebug />
          </ScrollControl>

          {/* UI Overlays - must be inside SceneStatesProvider for RecordingOrchestrator */}
          <UIOverlayRoot />
          </CharacterAnimationProvider>
        </SceneStatesProvider>
      </AIModuleProvider>
      </AIMemoryStoreProvider>
    </SceneFactoryProvider>
  );
};


// SceneContentWithNavigation: thin wrapper to render a scene and navigate to the next scene when it completes
const SceneContentWithNavigation = React.memo(function SceneContentWithNavigation({ scene, sceneIndex }: { scene: Scene; sceneIndex: number }) {
  // SceneRenderer picks the right visual component for the given scene.type
  return (
    <SceneRenderer
      scene={scene}
      sceneIndex={sceneIndex}
    />
  );
});

// Default export so the router or parent can render this screen
// (kept simple for easy wiring during the demo)
export default StoryModeScroll;