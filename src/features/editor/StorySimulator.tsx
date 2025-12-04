/**
 * Story Simulator Component
 *
 * Renders scenes inside an iframe that loads the simulator app.
 * This allows viewport units (100vw, 100vh) to work correctly
 * within the contained preview area.
 *
 * Communication with the iframe is done via postMessage.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Scene } from '@core/types/scene';
import './StorySimulator.css';

// ============================================================================
// Types
// ============================================================================

interface StorySimulatorProps {
  /** The scene to display */
  scene: Scene;
  /** Index of the scene in the story */
  sceneIndex: number;
  /** Story ID for asset resolution */
  storyId: string;
  /** All scenes (for character orchestration context) */
  allScenes: Scene[];
  /** Callback when scene completes (optional) */
  onComplete?: () => void;
}

// ============================================================================
// Main Story Simulator Component
// ============================================================================

const StorySimulator: React.FC<StorySimulatorProps> = ({
  scene,
  sceneIndex,
  storyId,
  allScenes,
  onComplete,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [scenesInitialized, setScenesInitialized] = useState(false);

  // Handle messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || !data.type) return;

      switch (data.type) {
        case 'READY':
          console.log('[StorySimulator] Iframe is ready');
          setIsReady(true);
          break;

        case 'SCENE_CHANGED':
          console.log('[StorySimulator] Scene changed in iframe:', data.nodeId);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send scenes to iframe when ready
  useEffect(() => {
    if (!isReady || !iframeRef.current?.contentWindow) return;
    if (scenesInitialized) return;

    console.log('[StorySimulator] Sending scenes to iframe:', allScenes.length);
    iframeRef.current.contentWindow.postMessage({
      type: 'SET_SCENES',
      scenes: allScenes,
      storyId: storyId,
    }, '*');

    setScenesInitialized(true);
  }, [isReady, allScenes, storyId, scenesInitialized]);

  // Navigate to scene when index changes
  useEffect(() => {
    if (!isReady || !scenesInitialized || !iframeRef.current?.contentWindow) return;

    console.log('[StorySimulator] Navigating to scene:', sceneIndex);
    iframeRef.current.contentWindow.postMessage({
      type: 'GO_TO_SCENE',
      sceneIndex: sceneIndex,
    }, '*');
  }, [isReady, scenesInitialized, sceneIndex]);

  // Reset when allScenes changes (e.g., after editing)
  useEffect(() => {
    if (scenesInitialized && iframeRef.current?.contentWindow) {
      console.log('[StorySimulator] Scenes changed, re-sending to iframe');
      iframeRef.current.contentWindow.postMessage({
        type: 'SET_SCENES',
        scenes: allScenes,
        storyId: storyId,
      }, '*');
    }
  }, [allScenes]);

  return (
    <div className="story-simulator">
      <iframe
        ref={iframeRef}
        src="/simulator.html"
        className="story-simulator-iframe"
        title="Story Simulator"
        sandbox="allow-scripts allow-same-origin"
      />
      {!isReady && (
        <div className="story-simulator-loading">
          <p>Loading simulator...</p>
        </div>
      )}
    </div>
  );
};

export default StorySimulator;
