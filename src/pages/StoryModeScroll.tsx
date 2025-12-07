/**
 * Main story mode component that renders a story as scrollable scenes.
 * Each scene gets its own 100vh section with snap-scroll behavior.
 */
import React, { useMemo } from "react";
import { FlowLayout } from '@features/flow-layout/FlowLayout';
import { SceneRenderer } from '@core/scenes/SceneRenderer';
import { SceneFactoryProvider } from '@core/navigation/SceneFactory';
import { useNavigationStore, selectNavigationGraph, selectCurrentNodeId } from '@core/navigation/navigationStore';
import { BackgroundOrchestrator } from '@features/background/BackgroundOrchestrator';
import { CharacterOrchestrator } from '@features/characters/CharacterOrchestrator';
import { SpeechBubbleOrchestrator } from '@features/chat/orchestrators/SpeechBubbleOrchestrator';
import { injectPanelMetaFromFlows } from '@features/characters/adapters/injectPanelMetaFromFlows';
import { ScrollControl } from '@core/scroll/ScrollControl';
import { CharacterAnimationProvider } from '@features/characters/CharacterAnimationContext';
import TurnCueBanner from '@features/chat/components/TurnCueBanner';
import { useDialogue } from '@features/chat/context/useChatDialogue';
import type { Scene } from '@core/types/scene';

// Type extension for debugging window object
declare global {
  interface Window {
    __scenes?: Scene[];
  }
}
import { UIOverlayRoot } from '@core/uiLayout/UIOverlayRoot'
import { StepScrollDebug } from '@core/scroll/StepScrollDebug'
import { AIModuleProvider } from '@features/ai/AIModule'
import { AIMemoryStoreProvider } from '@core/ai/AIMemoryStore'
import { FlowMetadataProvider } from '@core/data/FlowMetadataStore'

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

// StoryContent: inner component that reads from navigation store
const StoryContent: React.FC = () => {
  // OPTIMIZED: Subscribe only to specific graph slices instead of entire navigationGraph
  const navigationGraph = useNavigationStore(selectNavigationGraph);
  const currentNodeId = useNavigationStore(selectCurrentNodeId);

  // Dialogue context for turn banners
  const { showTurnBanner, turnBannerText } = useDialogue();

  // The navigation machine now loads the story during boot sequence
  // We just wait for the graph to be populated
  const isGraphReady = navigationGraph.order.length > 0;

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

  // Build array of unique scenes with their nodeIds for rendering
  // Each node gets rendered, so non-focused scenes can display their own phase
  const uniqueScenes = useMemo(() => {
    return allNavigationNodes.map((node, index) => ({
      scene: allNavigationScenes[index],
      nodeId: node.id,
    }));
  }, [allNavigationNodes, allNavigationScenes]);

  // Map current node to DOM scroll index
  // Find which scene entry corresponds to the current nodeId
  const scrollIndex = useMemo(() => {
    if (!currentNodeId) return 0;

    const index = uniqueScenes.findIndex(entry => entry.nodeId === currentNodeId);
    return index >= 0 ? index : 0;
  }, [uniqueScenes, currentNodeId]);

  // Calculate navigation index (position in the full node array)
  const navigationIndex = useMemo(() => {
    if (!currentNodeId) return 0;

    const index = navigationGraph.order.indexOf(currentNodeId);
    return index >= 0 ? index : 0;
  }, [currentNodeId, navigationGraph.order]);

  // TODO: Populate flow metadata store when the machine loads the story
  // For now, we'll skip this since the machine doesn't yet expose flowMetadata
  // This will be wired up when we integrate FlowMetadataStore with the boot sequence

  // Handle scene index changes - now handled via scroll control
  // ScrollControl manages the visual scroll position
  // Navigation graph manages the logical navigation state
  const handleIndexChange = () => {
    // Note: ScrollControl handles scroll position
    // Navigation advances are triggered by user interactions (quest acceptance, etc.)
    // The scroll index is derived from the current node's sceneId
  };

  // Note: Focus management is now handled within ScrollControl component

  // RENDER PATH #1: waiting for the machine to load the story → show a friendly centered message
  if (!isGraphReady) {
    return <FullScreen>Loading story…</FullScreen>;
  }

  // RENDER PATH #3: story loaded → render each scene in a vertical, snap-scrolling layout

  return (
    <SceneFactoryProvider>
      <AIMemoryStoreProvider maxMessagesPerFlow={10}>
        <AIModuleProvider>
          <CharacterAnimationProvider>
            {/* Unified scroll control component - uses uniqueScenes from navigationArray */}
            <ScrollControl
            scenes={uniqueScenes}
            currentIndex={scrollIndex}
            onIndexChange={handleIndexChange}
            className="story-scroll"
          >
              {/* Layer 1: Node-based background system - shows current scene's background */}
              <BackgroundOrchestrator
                storyId="gingerbread"
                currentScene={currentNodeId ? navigationGraph.byId[currentNodeId]?.scene : null}
                navigationDirection={navigationGraph.navigationHistory?.[navigationGraph.navigationHistory.length - 1]?.trigger}
              />

              {/* Layer 1.5: Character panels - uses navigation graph internally */}
              <CharacterOrchestrator storyId="gingerbread" scenes={allNavigationScenes} />

              {/* Layer 1.8: Speech bubbles - already uses navigationArray internally */}
              <SpeechBubbleOrchestrator />

              {/* Layer 1.9: Turn cue banner */}
              <TurnCueBanner show={showTurnBanner} text={turnBannerText} />

              {/* Layer 2: Document flow content with scroll snap targets - renders from navigationArray */}
              <div style={{ position: "relative" }}>
                {uniqueScenes.map((entry, i: number) => {
                  const { scene, nodeId } = entry;
                  // Use nodeId as stable key
                  const stableKey = nodeId;

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
                        <SceneContentWithNavigation scene={scene} nodeId={nodeId} sceneIndex={i} />
                      </FlowLayout>
                    </div>
                  );
                })}
              </div>

            {/* Debug display - inside ScrollControl to access SceneOrchestrator context */}
            {import.meta.env.DEV && <StepScrollDebug />}
          </ScrollControl>

          {/* UI Overlays */}
          <UIOverlayRoot />
          </CharacterAnimationProvider>
      </AIModuleProvider>
      </AIMemoryStoreProvider>
    </SceneFactoryProvider>
  );
};


// SceneContentWithNavigation: thin wrapper to render a scene and navigate to the next scene when it completes
const SceneContentWithNavigation = React.memo(function SceneContentWithNavigation({ scene, nodeId, sceneIndex }: { scene: Scene; nodeId: string; sceneIndex: number }) {
  // SceneRenderer picks the right visual component for the given scene.type
  return (
    <SceneRenderer
      scene={scene}
      nodeId={nodeId}
      sceneIndex={sceneIndex}
    />
  );
});

// Default export so the router or parent can render this screen
// (kept simple for easy wiring during the demo)
export default StoryModeScroll;