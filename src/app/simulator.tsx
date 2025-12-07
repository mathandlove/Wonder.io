/**
 * Simulator Entry Point
 *
 * This is loaded inside an iframe by the Story Review editor.
 * It renders a single scene using the full app infrastructure
 * (orchestrators, providers, etc.) but controlled via postMessage.
 *
 * Messages from parent:
 * - { type: 'SET_SCENES', scenes: Scene[] } - Initialize with all scenes
 * - { type: 'GO_TO_SCENE', sceneIndex: number } - Navigate to a specific scene
 * - { type: 'ADVANCE', direction: 'forward' | 'backward' } - Advance navigation
 *
 * Messages to parent:
 * - { type: 'READY' } - Simulator is ready to receive commands
 * - { type: 'SCENE_CHANGED', sceneIndex: number, nodeId: string } - Current scene changed
 */
import ReactDOM from 'react-dom/client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { FlowLayout } from '@features/flow-layout/FlowLayout';
import { SceneRenderer } from '@core/scenes/SceneRenderer';
import { SceneFactoryProvider } from '@core/navigation/SceneFactory';
import { useNavigationStore } from '@core/navigation/navigationStore';
import { BackgroundOrchestrator } from '@features/background/BackgroundOrchestrator';
import { CharacterOrchestrator } from '@features/characters/CharacterOrchestrator';
import { SpeechBubbleOrchestrator } from '@features/chat/orchestrators/SpeechBubbleOrchestrator';
import { injectPanelMetaFromFlows } from '@features/characters/adapters/injectPanelMetaFromFlows';
import { CharacterAnimationProvider } from '@features/characters/CharacterAnimationContext';
import { AIModuleProvider } from '@features/ai/AIModule';
import { AIMemoryStoreProvider } from '@core/ai/AIMemoryStore';
import { FlowMetadataProvider } from '@core/data/FlowMetadataStore';
import { DialogueProvider } from '@core/dialogue/DialogueContext';
import { ChatDialogueProvider } from '@features/chat/context/ChatDialogueContext';
import { ClueStoreProvider } from '@core/data/ClueStore';
import { RecordingProvider } from '@core/recording/RecordingOrchestrator';
import { resetAllToasts } from '@core/toast';
import type { Scene } from '@core/types/scene';
import './global.css';

// DEBUG: Reset all first-time toasts at session start so they show every time
// Remove this line when ready for production
resetAllToasts();

// ============================================================================
// Types for postMessage communication
// ============================================================================

interface SetScenesMessage {
  type: 'SET_SCENES';
  scenes: Scene[];
  storyId: string;
}

interface GoToSceneMessage {
  type: 'GO_TO_SCENE';
  sceneIndex: number;
}

interface AdvanceMessage {
  type: 'ADVANCE';
  direction: 'forward' | 'backward';
}

type SimulatorMessage = SetScenesMessage | GoToSceneMessage | AdvanceMessage;

// ============================================================================
// Simulator App Component
// ============================================================================

function SimulatorApp() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [storyId, setStoryId] = useState('gingerbread');
  const [targetSceneIndex, setTargetSceneIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Navigation store
  const setNavigationScenes = useNavigationStore(state => state.setScenes);
  const advance = useNavigationStore(state => state.advance);
  const graph = useNavigationStore(state => state.graph);
  const currentId = useNavigationStore(state => state.currentId);

  // Handle messages from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as SimulatorMessage;

      if (!data || !data.type) return;

      console.log('[Simulator] Received message:', data.type);

      switch (data.type) {
        case 'SET_SCENES':
          console.log('[Simulator] Setting scenes:', data.scenes.length);
          // Debug: log clue-image scene to verify clueDescriptions are present
          const clueScene = data.scenes.find((s: Scene) => s.type === 'clue-image');
          if (clueScene) {
            console.log('[Simulator] Clue-image scene found:', clueScene);
            console.log('[Simulator] clueDescriptions:', (clueScene as any).clueDescriptions);
          }
          setScenes(data.scenes);
          setStoryId(data.storyId || 'gingerbread');
          break;

        case 'GO_TO_SCENE':
          console.log('[Simulator] Go to scene:', data.sceneIndex);
          setTargetSceneIndex(data.sceneIndex);
          break;

        case 'ADVANCE':
          console.log('[Simulator] Advance:', data.direction);
          advance(data.direction);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [advance]);

  // Initialize navigation store when scenes change
  useEffect(() => {
    if (scenes.length > 0) {
      console.log('[Simulator] Initializing navigation store with', scenes.length, 'scenes');
      setNavigationScenes(scenes);
      setIsReady(true);
    }
  }, [scenes, setNavigationScenes]);

  // Navigate to target scene index
  useEffect(() => {
    if (!isReady || graph.order.length === 0 || scenes.length === 0) return;

    // Find the node that corresponds to this scene index
    // Character-flow scenes expand into multiple nodes, so we need to find the first one
    let targetNodeIndex = -1;
    let sceneCounter = 0;

    for (let i = 0; i < graph.order.length; i++) {
      const node = graph.byId[graph.order[i]];
      if (!node) continue;

      const nodeScene = node.scene;
      if (!nodeScene) continue;

      // Check if this is the start of a new "original" scene
      const isFlowStart = (nodeScene as any).isFirstInFlow === true;
      const isNotFlow = !(nodeScene as any).flowSequence;

      if (isNotFlow || isFlowStart) {
        if (sceneCounter === targetSceneIndex) {
          targetNodeIndex = i;
          break;
        }
        sceneCounter++;
      }
    }

    if (targetNodeIndex === -1) {
      targetNodeIndex = Math.min(targetSceneIndex, graph.order.length - 1);
    }

    const targetNodeId = graph.order[targetNodeIndex];
    const currentIndex = currentId ? graph.order.indexOf(currentId) : 0;

    if (targetNodeId && targetNodeIndex !== currentIndex) {
      // Navigate to target
      if (targetNodeIndex > currentIndex) {
        for (let i = currentIndex; i < targetNodeIndex; i++) {
          advance('forward');
        }
      } else if (targetNodeIndex < currentIndex) {
        for (let i = currentIndex; i > targetNodeIndex; i--) {
          advance('backward');
        }
      }
    }
  }, [targetSceneIndex, graph.order, graph.byId, currentId, advance, isReady, scenes.length]);

  // Notify parent when scene changes
  useEffect(() => {
    if (currentId && window.parent !== window) {
      window.parent.postMessage({
        type: 'SCENE_CHANGED',
        nodeId: currentId,
      }, '*');
    }
  }, [currentId]);

  // Notify parent when ready
  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'READY' }, '*');
    }
  }, []);

  // Inject panel meta for character orchestration
  const scenesWithMeta = useMemo(() => {
    return injectPanelMetaFromFlows(scenes);
  }, [scenes]);

  // Get current scene
  const currentNode = currentId ? graph.byId[currentId] : null;
  const currentScene = currentNode?.scene;
  const nodeId = currentNode?.id || 'sim-node-0';

  // Find scene index for current node
  const currentSceneIndex = useMemo(() => {
    if (!currentId || graph.order.length === 0) return 0;

    let sceneCounter = 0;
    for (let i = 0; i < graph.order.length; i++) {
      const node = graph.byId[graph.order[i]];
      if (!node) continue;

      if (node.id === currentId) {
        return sceneCounter;
      }

      const nodeScene = node.scene;
      if (!nodeScene) continue;

      const isFlowStart = (nodeScene as any).isFirstInFlow === true;
      const isNotFlow = !(nodeScene as any).flowSequence;

      if (isNotFlow || isFlowStart) {
        sceneCounter++;
      }
    }
    return 0;
  }, [currentId, graph]);

  // Show loading state if no scenes
  if (scenes.length === 0 || !currentScene) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e293b',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <p>Waiting for scenes...</p>
      </div>
    );
  }

  return (
    <DialogueProvider>
      <RecordingProvider>
        <ClueStoreProvider>
          <ChatDialogueProvider>
            <FlowMetadataProvider>
              <SceneFactoryProvider>
                <AIMemoryStoreProvider maxMessagesPerFlow={10}>
                  <AIModuleProvider>
                    <CharacterAnimationProvider>
                      <div style={{
                        position: 'relative',
                        width: '100vw',
                        height: '100vh',
                        overflow: 'hidden',
                      }}>
                        {/* Layer 1: Background */}
                        <BackgroundOrchestrator
                          storyId={storyId}
                          currentScene={currentScene}
                          navigationDirection="initial"
                        />

                        {/* Layer 1.5: Character panels */}
                        <CharacterOrchestrator
                          storyId={storyId}
                          scenes={scenesWithMeta}
                        />

                        {/* Layer 1.8: Speech bubbles */}
                        <SpeechBubbleOrchestrator />

                        {/* Layer 2: Scene content */}
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                        }}>
                          <FlowLayout
                            keyId={currentSceneIndex.toString()}
                            panelRestricted={(currentScene as any)?.panelRestricted ?? false}
                          >
                            <SceneRenderer
                              scene={currentScene}
                              nodeId={nodeId}
                              sceneIndex={currentSceneIndex}
                            />
                          </FlowLayout>
                        </div>
                      </div>
                    </CharacterAnimationProvider>
                  </AIModuleProvider>
                </AIMemoryStoreProvider>
              </SceneFactoryProvider>
            </FlowMetadataProvider>
          </ChatDialogueProvider>
        </ClueStoreProvider>
      </RecordingProvider>
    </DialogueProvider>
  );
}

// ============================================================================
// Mount the app
// ============================================================================

ReactDOM.createRoot(document.getElementById('simulator-root')!).render(
  <SimulatorApp />
);
