/**
 * StepScrollDebug - Visual display of navigation graph and scene state
 *
 * Shows real-time state of:
 * - Current node position in graph
 * - Node and scene information
 * - Lock states
 * - Caption states for image scenes
 * - Character positions (prev/current/next)
 * - Navigation graph statistics
 */
import { useEffect, useState } from 'react';
import { useNodeManager } from '@core/navigation/NodeManager';
import type { Scene } from '@core/types/scene';
import type { ImageState } from '@core/dialogue/types';

export function StepScrollDebug() {

  // Draggable position state - load from localStorage or default to top-right
  const getInitialPosition = () => {
    const saved = localStorage.getItem('debugPanel:position');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { top: 10, right: 10, left: null, bottom: null };
      }
    }
    return { top: 10, right: 10, left: null, bottom: null };
  };

  const [position, setPosition] = useState<{ top: number | null; right: number | null; left: number | null; bottom: number | null }>(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load visibility state from localStorage, default to true if not set
  const getInitialVisibility = () => {
    const saved = localStorage.getItem('debugPanel:visible');
    if (saved !== null) {
      return saved === 'true';
    }
    return true; // Default to visible
  };

  const [isVisible, setIsVisible] = useState(getInitialVisibility);

  // Get node manager for navigation context (single source of truth)
  const nodeManager = useNodeManager();

  // Get current node and navigation graph
  const currentNode = nodeManager.getCurrentNode();
  const { navigationGraph, allScenes, scenes } = nodeManager;

  // Get frozen snapshot (used for exit animations)
  const frozenSnapshot = navigationGraph.lastFrozenNode;

  // Get current index from navigation graph
  const currentNodeId = navigationGraph.currentId;
  const navigationIndex = currentNodeId ? navigationGraph.order.indexOf(currentNodeId) : -1;

  // Total number of nodes in the graph
  const totalNodes = navigationGraph.order.length;

  // Get current scene
  const currentScene = currentNode?.scene as (Scene & { sceneId?: string, flowId?: string }) | undefined;

  // Helper to get node by index from graph
  const getNodeByIndex = (index: number) => {
    if (index < 0 || index >= navigationGraph.order.length) return null;
    const nodeId = navigationGraph.order[index];
    return navigationGraph.byId[nodeId];
  };

  // Keyboard shortcut: backslash (\) to toggle visibility and recenter
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check for backslash key
      if (e.key === '\\' || e.key === 'Backslash') {
        e.preventDefault();

        setIsVisible(prev => {
          const newVisible = !prev;

          // Save visibility state to localStorage
          localStorage.setItem('debugPanel:visible', String(newVisible));

          // If showing the panel, recenter it to default position
          if (newVisible) {
            const centerPosition = { top: 10, right: 10, left: null, bottom: null };
            setPosition(centerPosition);
            localStorage.setItem('debugPanel:position', JSON.stringify(centerPosition));
          }

          return newVisible;
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // Extract scene info
  const sceneType = currentScene?.type || 'unknown';
  const sceneId = currentNode?.sceneId || 'no-id';
  const nodeId = currentNode?.nodeId || 'no-id';

  // Get caption state from current node (single source of truth)
  const captionState: ImageState =
    currentNode?.sceneState.type === 'image'
      ? currentNode.sceneState.state
      : 'hidden';
  // Type-safe caption check - only ImageScene has caption/text properties
  const hasCaption = sceneType === 'image' && currentScene && 'caption' in currentScene
    ? ((currentScene.caption || currentScene.text)?.trim() || false)
    : false;

  // Get dialogue messages for current scene (safely) - currently unused but available for future debugging
  // const messages = dialogue?.getMessagesForScene(sceneId) ?? [];
  // const pendingConversions = dialogue?.getPendingConversions() ?? [];

  // Format scene state for display
  const formatSceneState = (): string => {
    if (!currentNode) return 'No state';
    const { sceneState } = currentNode;

    if (sceneState.type === 'image') {
      return `image: ${sceneState.state}`;
    } else if (sceneState.type === 'dialogue') {
      return `dialogue: ${sceneState.state}`;
    } else if (sceneState.type === 'static') {
      return 'static';
    } else if (sceneState.type === 'quest') {
      return `quest: ${sceneState.state}`;
    }
    return 'unknown';
  };


  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if clicking on the header (not buttons)
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - (position.left ?? window.innerWidth - (position.right ?? 0) - 400),
      y: e.clientY - (position.top ?? 0)
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newLeft = e.clientX - dragStart.x;
    const newTop = e.clientY - dragStart.y;

    setPosition({
      top: newTop,
      left: newLeft,
      right: null,
      bottom: null
    });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // Save position to localStorage
      localStorage.setItem('debugPanel:position', JSON.stringify(position));
    }
  };

  // Add/remove mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        top: position.top !== null ? `${position.top}px` : undefined,
        right: position.right !== null ? `${position.right}px` : undefined,
        left: position.left !== null ? `${position.left}px` : undefined,
        bottom: position.bottom !== null ? `${position.bottom}px` : undefined,
        background: 'rgba(0, 0, 0, 0.95)',
        color: '#0f0',
        padding: '15px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '11px',
        zIndex: 999999,
        minWidth: '320px',
        maxWidth: '400px',
        border: '2px solid #0f0',
        maxHeight: '90vh',
        overflowY: 'auto',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0ff', cursor: 'grab' }}>
          📊 Scene & Flow Debug
        </div>
        <div style={{ fontSize: '9px', color: '#666', fontStyle: 'italic', cursor: 'default', userSelect: 'text' }}>
          Press \ to hide
        </div>
      </div>

      <div style={{ display: 'grid', gap: '5px' }}>
        {/* Scene & State Section */}
        <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #0ff' }}>
          <div style={{ color: '#0ff', marginBottom: '4px', fontWeight: 'bold' }}>🎬 Node & State</div>
          <div style={{ color: '#0f0' }}>
            📍 Index: <strong>{navigationIndex}</strong> / {totalNodes - 1}
          </div>
          <div style={{ color: '#0f0' }}>
            🆔 Scene ID: <strong>{sceneId}</strong>
          </div>
          <div style={{ color: '#0ff', fontSize: '9px', marginTop: '2px' }}>
            Node ID: {nodeId.substring(0, 10)}...
          </div>
          <div style={{ color: '#ff0' }}>
            🔧 State: <strong>{formatSceneState()}</strong>
          </div>
          <div style={{ color: '#888', fontSize: '9px', marginTop: '2px' }}>
            Type: {sceneType}
          </div>
          {/* Show speaker if available */}
          {currentScene && 'speaker' in currentScene && currentScene.speaker && (
            <div style={{ color: '#0ff', fontSize: '10px', marginTop: '4px' }}>
              🎤 Speaker: <strong>{currentScene.speaker}</strong>
            </div>
          )}
          {/* Show scene text if available (including empty strings) */}
          {currentScene && 'text' in currentScene && currentScene.text !== undefined && (
            <div style={{
              color: '#ff0',
              fontSize: '9px',
              marginTop: '4px',
              padding: '4px',
              background: 'rgba(255,255,0,0.1)',
              borderRadius: '4px',
              maxHeight: '60px',
              overflowY: 'auto',
              wordBreak: 'break-word'
            }}>
              💬 Text: {currentScene.text === '' ? '<empty>' : `"${currentScene.text}"`}
            </div>
          )}
        </div>

        {/* Flow Metadata Section - Hidden for more space */}
        {/*
        <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f0f' }}>
          <div style={{ color: '#f0f', marginBottom: '4px', fontWeight: 'bold' }}>🗃️ Flow Metadata</div>
          <div style={{ color: currentScene?.flowId ? '#0f0' : '#666' }}>
            🔑 Flow ID: <strong>{currentScene?.flowId || 'None'}</strong>
          </div>
        </div>
        */}

        {/* Image Caption State Section - Only show for image scenes with captions */}
        {sceneType === 'image' && hasCaption && (
          <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f0f' }}>
            <div style={{ color: '#f0f', marginBottom: '4px', fontWeight: 'bold' }}>🖼️ Image Caption State</div>
            <div style={{
              padding: '6px',
              background: 'rgba(255,0,255,0.1)',
              borderRadius: '4px',
              border: '1px solid #f0f'
            }}>
              <div style={{
                color: captionState === 'showing' ? '#0f0' : '#666',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {captionState === 'hidden' && '⚫ HIDDEN'}
                {captionState === 'showing' && '✅ SHOWING'}
              </div>
              <div style={{ color: '#888', fontSize: '9px', marginTop: '2px' }}>
                {captionState === 'hidden' && 'Caption waiting (scroll blocked until shown)'}
                {captionState === 'showing' && 'Caption visible (scroll unlocked)'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Frozen Snapshot Section - Shows what animations see */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #ff0' }}>
        <div style={{ color: '#ff0', marginBottom: '8px', fontWeight: 'bold' }}>❄️ Frozen Snapshot (for exit animations)</div>
        {frozenSnapshot ? (
          <div style={{
            padding: '8px',
            background: 'rgba(255, 255, 0, 0.1)',
            borderRadius: '4px',
            border: '1px solid #ff0'
          }}>
            <div style={{ color: '#ff0', fontSize: '10px', marginBottom: '4px' }}>
              🆔 Scene ID: <strong>{frozenSnapshot.sceneId}</strong>
            </div>
            <div style={{ color: '#888', fontSize: '9px', marginTop: '2px' }}>
              Node ID: {frozenSnapshot.nodeId.substring(0, 10)}...
            </div>
            <div style={{ color: '#ff0', fontSize: '10px', marginTop: '4px' }}>
              🔧 State Key: <strong>{frozenSnapshot.stateKey}</strong>
            </div>
            {/* Show frozen characters */}
            {(() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const frozenScene = frozenSnapshot.scene as any;
              const leftChar = frozenScene?.['left-character'] || 'none';
              const rightChar = frozenScene?.['right-character'] || 'none';
              return (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#888', fontSize: '9px' }}>Left:</div>
                    <div style={{ color: '#ff0', fontSize: '10px', fontWeight: 'bold' }}>
                      {leftChar}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#888', fontSize: '9px' }}>Right:</div>
                    <div style={{ color: '#ff0', fontSize: '10px', fontWeight: 'bold' }}>
                      {rightChar}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div style={{
            padding: '8px',
            background: 'rgba(100, 100, 100, 0.2)',
            borderRadius: '4px',
            border: '1px solid #666',
            color: '#666',
            fontSize: '10px',
            fontStyle: 'italic'
          }}>
            No frozen snapshot (first navigation or no previous node)
          </div>
        )}
      </div>

      {/* Character Information Section - Current Node Only */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f90' }}>
        <div style={{ color: '#f90', marginBottom: '8px', fontWeight: 'bold' }}>👥 Current Characters & Animations</div>

        {/* Helper function to get character name from scene */}
        {(() => {
          const getCharacter = (node: typeof currentNode, side: 'left' | 'right') => {
            if (!node?.scene) return 'NOCHARACTER';
            const key = side === 'left' ? 'left-character' : 'right-character';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (node.scene as any)[key] || 'NOCHARACTER';
          };

          // Get current, previous, and next characters for animation logic
          const prevNode = getNodeByIndex(navigationIndex - 1);
          const nextNode = getNodeByIndex(navigationIndex + 1);

          const currentLeft = getCharacter(currentNode, 'left');
          const currentRight = getCharacter(currentNode, 'right');
          const previousLeft = getCharacter(prevNode ? { scene: prevNode.scene } as typeof currentNode : null, 'left');
          const previousRight = getCharacter(prevNode ? { scene: prevNode.scene } as typeof currentNode : null, 'right');
          const nextLeft = getCharacter(nextNode ? { scene: nextNode.scene } as typeof currentNode : null, 'left');
          const nextRight = getCharacter(nextNode ? { scene: nextNode.scene } as typeof currentNode : null, 'right');

          // Get speaker
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const speaker = (currentNode?.scene as any)?.speaker || null;

          // Replicate CharacterPanel animation logic
          const calculateAnimationType = (
            currentChar: string,
            previousChar: string,
            nextChar: string,
            side: 'left' | 'right'
          ): string => {
            const hasCharacter = currentChar !== 'NOCHARACTER';
            if (!hasCharacter) return 'hidden';

            // Check if same scene (using sceneId comparison like CharacterPanel does)
            const currentSceneId = currentNode?.sceneId;
            const previousSceneId = frozenSnapshot?.sceneId;
            const isSameScene = currentSceneId && previousSceneId && currentSceneId === previousSceneId;

            // Infer which character we came from
            const characterWeComingFrom = previousChar !== currentChar ? previousChar : nextChar;

            // Check if this is a new character (same logic as CharacterPanel line 77)
            const isNewCharacter = !isSameScene && characterWeComingFrom !== currentChar && currentChar !== 'NOCHARACTER';

            // Check for jiggle state
            const dialogueState = currentNode?.sceneState?.type === 'dialogue' ? currentNode.sceneState.state : null;
            const isSuccessDanceScene = currentNode?.scene?.type === 'success-dance';
            const shouldJiggle = dialogueState === 'answer-right' || isSuccessDanceScene;

            // Phase priority (same as CharacterPanel getCurrentPhase)
            if (isNewCharacter) return 'entering 🎬';
            if (shouldJiggle) return 'jiggling 💃';
            if (speaker === side) return 'speaking 🗣️';
            return 'idle 😐';
          };

          const leftAnimation = calculateAnimationType(currentLeft, previousLeft, nextLeft, 'left');
          const rightAnimation = calculateAnimationType(currentRight, previousRight, nextRight, 'right');

          // Color based on animation type
          const getAnimationColor = (animation: string) => {
            if (animation.includes('entering')) return '#ff0'; // Yellow - NEW CHARACTER
            if (animation.includes('jiggling')) return '#0ff'; // Cyan
            if (animation.includes('speaking')) return '#0f0'; // Green
            if (animation.includes('idle')) return '#888'; // Gray
            return '#666'; // Hidden
          };

          return (
            <>
              {/* Current Scene Characters with Animation Types */}
              <div style={{
                marginBottom: '8px',
                padding: '8px',
                background: 'rgba(0, 255, 0, 0.15)',
                borderRadius: '4px',
                border: '2px solid #0f0'
              }}>
                <div style={{ color: '#0f0', fontSize: '10px', marginBottom: '8px', fontWeight: 'bold' }}>
                  ▶️ Current Node (idx: {navigationIndex})
                </div>

                {/* Left Character */}
                <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#888', fontSize: '9px' }}>Left Character:</div>
                      <div style={{ color: '#0f0', fontSize: '11px', fontWeight: 'bold' }}>
                        {currentLeft}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '4px',
                      border: `1px solid ${getAnimationColor(leftAnimation)}`
                    }}>
                      <div style={{ color: getAnimationColor(leftAnimation), fontSize: '10px', fontWeight: 'bold' }}>
                        {leftAnimation}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Character */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#888', fontSize: '9px' }}>Right Character:</div>
                      <div style={{ color: '#0f0', fontSize: '11px', fontWeight: 'bold' }}>
                        {currentRight}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '4px',
                      border: `1px solid ${getAnimationColor(rightAnimation)}`
                    }}>
                      <div style={{ color: getAnimationColor(rightAnimation), fontSize: '10px', fontWeight: 'bold' }}>
                        {rightAnimation}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Speaker indicator */}
                {speaker && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #444' }}>
                    <div style={{ color: '#0ff', fontSize: '9px' }}>
                      Current Speaker: <strong>{speaker}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Animation Logic Explanation */}
              <div style={{
                padding: '6px',
                background: 'rgba(100, 100, 100, 0.1)',
                borderRadius: '4px',
                fontSize: '8px',
                color: '#666',
                fontStyle: 'italic'
              }}>
                💡 Entering = new char from frozen snapshot | Same scene = no entering
              </div>
            </>
          );
        })()}
      </div>

      {/* Stats Footer */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #0f0', fontSize: '9px', color: '#666' }}>
        Total Scenes: {allScenes.length} | Visible: {scenes.length} | Nodes: {totalNodes} | Graph v{navigationGraph.historyVersion}
      </div>
    </div>
  );
}
