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
  }, [isDragging, dragStart, position]);

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

      {/* Character Information Section */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f90' }}>
        <div style={{ color: '#f90', marginBottom: '8px', fontWeight: 'bold' }}>👥 Characters</div>

        {/* Helper function to get character name from graph node */}
        {(() => {
          const getCharacter = (node: typeof currentNode, side: 'left' | 'right') => {
            if (!node?.scene) return 'none';
            const key = side === 'left' ? 'left-character' : 'right-character';
            return node.scene[key] || 'none';
          };

          const prevNode = getNodeByIndex(navigationIndex - 1);
          const nextNode = getNodeByIndex(navigationIndex + 1);

          // Convert graph nodes to the format expected by getCharacter
          const prevNavItem = prevNode ? {
            scene: prevNode.scene,
            sceneId: prevNode.sceneId,
            nodeId: prevNode.id,
          } : null;

          const nextNavItem = nextNode ? {
            scene: nextNode.scene,
            sceneId: nextNode.sceneId,
            nodeId: nextNode.id,
          } : null;

          return (
            <>
              {/* Previous Scene Characters */}
              <div style={{
                marginBottom: '8px',
                padding: '8px',
                background: 'rgba(100, 100, 100, 0.2)',
                borderRadius: '4px',
                border: '1px solid #666'
              }}>
                <div style={{ color: '#888', fontSize: '10px', marginBottom: '4px', fontWeight: 'bold' }}>
                  ⬆️ Previous Scene (idx: {navigationIndex - 1})
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#0ff', fontSize: '9px' }}>Left:</div>
                    <div style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
                      {prevNavItem ? getCharacter(prevNavItem, 'left') : 'N/A'}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#0ff', fontSize: '9px' }}>Right:</div>
                    <div style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
                      {prevNavItem ? getCharacter(prevNavItem, 'right') : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Scene Characters */}
              <div style={{
                marginBottom: '8px',
                padding: '8px',
                background: 'rgba(0, 255, 0, 0.15)',
                borderRadius: '4px',
                border: '2px solid #0f0'
              }}>
                <div style={{ color: '#0f0', fontSize: '10px', marginBottom: '4px', fontWeight: 'bold' }}>
                  ▶️ Current Node (idx: {navigationIndex})
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#0ff', fontSize: '9px' }}>Left:</div>
                    <div style={{ color: '#0f0', fontSize: '11px', fontWeight: 'bold' }}>
                      {currentNode ? getCharacter(currentNode, 'left') : 'N/A'}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#0ff', fontSize: '9px' }}>Right:</div>
                    <div style={{ color: '#0f0', fontSize: '11px', fontWeight: 'bold' }}>
                      {currentNode ? getCharacter(currentNode, 'right') : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Scene Characters */}
              <div style={{
                marginBottom: '8px',
                padding: '8px',
                background: 'rgba(100, 100, 100, 0.2)',
                borderRadius: '4px',
                border: '1px solid #666'
              }}>
                <div style={{ color: '#888', fontSize: '10px', marginBottom: '4px', fontWeight: 'bold' }}>
                  ⬇️ Next Scene (idx: {navigationIndex + 1})
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#0ff', fontSize: '9px' }}>Left:</div>
                    <div style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
                      {nextNavItem ? getCharacter(nextNavItem, 'left') : 'N/A'}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#0ff', fontSize: '9px' }}>Right:</div>
                    <div style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
                      {nextNavItem ? getCharacter(nextNavItem, 'right') : 'N/A'}
                    </div>
                  </div>
                </div>
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
