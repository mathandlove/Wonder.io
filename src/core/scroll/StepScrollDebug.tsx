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
import { useNavigationStore, selectNavigationGraph, selectCurrentNode } from '@core/navigation/navigationStore';
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

  // Subscribe to navigation store (single source of truth)
  const navigationGraph = useNavigationStore(selectNavigationGraph);
  const currentNode = useNavigationStore(selectCurrentNode);

  // Get current index from navigation graph
  const currentNodeId = navigationGraph.currentId;
  const navigationIndex = currentNodeId ? navigationGraph.order.indexOf(currentNodeId) : -1;

  // Total number of nodes in the graph
  const totalNodes = navigationGraph.order.length;

  // Get current scene
  const currentScene = currentNode?.scene as (Scene & { sceneId?: string, flowId?: string }) | undefined;

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
  const nodeId = currentNode?.id || 'no-id';

  // Get phase from current node (this is the new way - replaces old sceneState)
  const phase = currentNode?.phase || 'unknown';

  // Determine caption state from phase (for image scenes)
  const captionState: ImageState =
    sceneType === 'image' && phase === 'caption' ? 'showing' : 'hidden';
  // Type-safe caption check - only ImageScene has caption/text properties
  const hasCaption = sceneType === 'image' && currentScene && 'caption' in currentScene
    ? ((currentScene.caption || currentScene.text)?.trim() || false)
    : false;

  // Format phase for display (replaces old formatSceneState)
  const formatPhase = (): string => {
    if (!currentNode) return 'No phase';
    return phase;
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
          <div style={{ color: '#0ff', fontSize: '9px', marginTop: '2px' }}>
            🆔 Node ID: {nodeId.substring(0, 10)}...
          </div>
          <div style={{ color: '#ff0' }}>
            🔧 Phase: <strong>{formatPhase()}</strong>
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

      {/* Navigation History Section */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #0ff' }}>
        <div style={{ color: '#0ff', marginBottom: '8px', fontWeight: 'bold' }}>📜 Navigation History</div>

        {navigationGraph.navigationHistory && navigationGraph.navigationHistory.length > 0 ? (
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {navigationGraph.navigationHistory.slice(-20).reverse().map((entry, idx) => {
              const isCurrentNode = entry.nodeId === currentNodeId;
              const triggerColor =
                entry.trigger === 'force-forward' ? '#0f0' :
                entry.trigger === 'force-backward' ? '#ff0' :
                entry.trigger === 'initial' ? '#0ff' : '#888';

              const triggerIcon =
                entry.trigger === 'force-forward' ? '▶️' :
                entry.trigger === 'force-backward' ? '◀️' :
                entry.trigger === 'initial' ? '🏁' : '↔️';

              return (
                <div
                  key={`${entry.nodeId}-${entry.timestamp}-${idx}`}
                  style={{
                    padding: '6px',
                    background: isCurrentNode ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 150, 150, 0.1)',
                    borderRadius: '4px',
                    border: isCurrentNode ? '2px solid #0f0' : '1px solid #0ff',
                    fontSize: '9px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2px' }}>
                    <div style={{ color: triggerColor, fontWeight: 'bold', fontSize: '10px' }}>
                      {triggerIcon} {entry.trigger}
                    </div>
                    <div style={{ color: '#666', fontSize: '8px' }}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={{ color: '#0ff', fontSize: '9px', marginTop: '2px' }}>
                    🔑 {entry.stateKey}
                  </div>
                  {entry.description && (
                    <div style={{ color: '#888', fontSize: '8px', marginTop: '2px', fontStyle: 'italic' }}>
                      {entry.description}
                    </div>
                  )}
                  {isCurrentNode && (
                    <div style={{ color: '#0f0', fontSize: '8px', marginTop: '2px', fontWeight: 'bold' }}>
                      ← YOU ARE HERE
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: '9px', fontStyle: 'italic' }}>
            No navigation history yet
          </div>
        )}
      </div>

      {/* Node Lifecycle Events Section */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f0f' }}>
        <div style={{ color: '#f0f', marginBottom: '8px', fontWeight: 'bold' }}>🔄 Node Lifecycle Events</div>

        {navigationGraph.lifecycleEvents && navigationGraph.lifecycleEvents.length > 0 ? (
          <div style={{
            maxHeight: '150px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {navigationGraph.lifecycleEvents.slice(-15).reverse().map((event, idx) => {
              const typeColor =
                event.type === 'created' ? '#0f0' :
                event.type === 'marked-for-deletion' ? '#ff0' :
                '#f00';

              const typeIcon =
                event.type === 'created' ? '➕' :
                event.type === 'marked-for-deletion' ? '⚠️' :
                '❌';

              return (
                <div
                  key={`${event.nodeId}-${event.timestamp}-${idx}`}
                  style={{
                    padding: '5px',
                    background: 'rgba(255, 0, 255, 0.1)',
                    borderRadius: '4px',
                    border: `1px solid ${typeColor}`,
                    fontSize: '9px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ color: typeColor, fontWeight: 'bold', fontSize: '10px' }}>
                      {typeIcon} {event.type}
                    </div>
                    <div style={{ color: '#666', fontSize: '8px' }}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={{ color: '#f0f', fontSize: '9px', marginTop: '2px' }}>
                    🔑 {event.stateKey}
                  </div>
                  {event.context && (
                    <div style={{ color: '#888', fontSize: '8px', marginTop: '2px', fontStyle: 'italic' }}>
                      {event.context}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: '9px', fontStyle: 'italic' }}>
            No lifecycle events yet
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #0f0', fontSize: '9px', color: '#666' }}>
        Total Scenes: {navigationGraph.sceneRegistry?.order.length || 0} | Nodes: {totalNodes} | Graph v{navigationGraph.historyVersion}
        <br />
        History: {navigationGraph.navigationHistory?.length || 0} navigations | {navigationGraph.lifecycleEvents?.length || 0} lifecycle events
      </div>
    </div>
  );
}
