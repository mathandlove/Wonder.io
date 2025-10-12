/**
 * StepScrollDebug - Visual display of scroll and scene state
 *
 * Shows real-time state of:
 * - Animation flag
 * - Wheel accumulator
 * - Current index and scene info
 * - Lock states
 * - Caption states
 * - Timers
 */
import { useEffect, useState } from 'react';
import { useSceneManager } from '@core/scenes/SceneManager';
import { useDialogue } from '@core/dialogue/DialogueContext';
import type { Scene } from '@core/types/scene';
import type { ImageState } from '@core/dialogue/types';

interface DebugState {
  wheelAccum: number;
  debounceActive: boolean;
  lastEvent: string;
  timestamp: number;
}

export function StepScrollDebug() {
  const [state, setState] = useState<DebugState>({
    wheelAccum: 0,
    debounceActive: false,
    lastEvent: '',
    timestamp: 0,
  });

  // Draggable position state - load from localStorage or default to top-right
  const getInitialPosition = () => {
    const saved = localStorage.getItem('debugPanel:position');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { top: 10, right: 10, left: null, bottom: null };
      }
    }
    return { top: 10, right: 10, left: null, bottom: null };
  };

  const [position, setPosition] = useState<{ top: number | null; right: number | null; left: number | null; bottom: number | null }>(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Get scene manager for additional context (single source of truth)
  const sceneManager = useSceneManager();

  // Get current navigation state directly from SceneManager
  const { navigationIndex, navigationArray, isLocked, lockReason } = sceneManager;

  // Try to get dialogue context, may be undefined if not in provider tree
  let dialogue;
  try {
    dialogue = useDialogue();
  } catch (e) {
    // DialogueProvider not available
    dialogue = null;
  }

  useEffect(() => {
    // Listen for custom debug events from useStepScroll
    const handleDebug = (e: CustomEvent) => {
      setState(e.detail);
    };

    window.addEventListener('stepscroll:debug' as any, handleDebug);

    return () => {
      window.removeEventListener('stepscroll:debug' as any, handleDebug);
    };
  }, []);

  // Get current navigation item and scene info (using navigationIndex from SceneManager)
  const currentNavItem = navigationArray[navigationIndex];
  // IMPORTANT: Use the scene from NavigationItem, not allScenes array
  // NavigationItem.scene is the actual scene object being rendered (including dynamically created ones)
  const currentScene = currentNavItem?.scene as (Scene & { sceneId?: string, caption?: string, text?: string }) | undefined;
  const sceneType = currentScene?.type || 'unknown';
  const sceneId = currentNavItem?.sceneId || 'no-id';

  // Get caption state from navigation array (single source of truth)
  const captionState: ImageState =
    currentNavItem?.sceneState.type === 'image'
      ? currentNavItem.sceneState.state
      : 'hidden';
  const hasCaption = sceneType === 'image' && ((currentScene?.caption || currentScene?.text)?.trim() || false);

  // Get dialogue messages for current scene (safely)
  const messages = dialogue?.getMessagesForScene(sceneId) ?? [];
  const pendingConversions = dialogue?.getPendingConversions() ?? [];

  // Format scene state for display
  const formatSceneState = (): string => {
    if (!currentNavItem) return 'No state';
    const { sceneState } = currentNavItem;

    if (sceneState.type === 'image') {
      return `image: ${sceneState.state}`;
    } else if (sceneState.type === 'dialogue') {
      return `dialogue: ${sceneState.state}`;
    } else if (sceneState.type === 'simple') {
      return 'simple';
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
      <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', color: '#0ff', cursor: 'grab' }}>
        📊 Scroll & Scene Debug
      </div>

      <div style={{ display: 'grid', gap: '5px' }}>
        {/* Scene & State Section */}
        <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #0ff' }}>
          <div style={{ color: '#0ff', marginBottom: '4px', fontWeight: 'bold' }}>🎬 Scene & State</div>
          <div style={{ color: '#0f0' }}>
            📍 Index: <strong>{navigationIndex}</strong> / {navigationArray.length - 1}
          </div>
          <div style={{ color: '#0f0' }}>
            🆔 Scene ID: <strong>{sceneId}</strong>
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

        {/* Scroll State Section */}
        <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #0f0' }}>
          <div style={{ color: '#0ff', marginBottom: '4px', fontWeight: 'bold' }}>🖱️ Scroll State</div>
          <div style={{ color: state.debounceActive ? '#ff0' : '#0f0' }}>
            ⏱️ Debounce: <strong>{state.debounceActive ? 'ACTIVE' : 'INACTIVE'}</strong>
          </div>
          <div style={{ color: Math.abs(state.wheelAccum) > 0 ? '#ff0' : '#0f0' }}>
            📊 Wheel Accum: <strong>{state.wheelAccum.toFixed(0)}px</strong>
          </div>
        </div>

        {/* Lock State Section */}
        <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #0f0' }}>
          <div style={{ color: '#0ff', marginBottom: '4px', fontWeight: 'bold' }}>🔒 Lock State</div>
          <div style={{ color: isLocked ? '#f00' : '#0f0' }}>
            Status: <strong>{isLocked ? 'LOCKED' : 'FREE'}</strong>
          </div>
          {lockReason && (
            <div style={{ color: '#f80', fontSize: '10px' }}>
              Reason: {lockReason}
            </div>
          )}
        </div>

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

        {/* Last Event Section */}
        {state.lastEvent && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #0f0' }}>
            <div style={{ color: '#0ff', fontSize: '10px' }}>Last Event:</div>
            <div style={{ color: '#ff0', fontSize: '10px', wordBreak: 'break-word' }}>{state.lastEvent}</div>
            <div style={{ color: '#666', fontSize: '9px' }}>
              {new Date(state.timestamp).toLocaleTimeString()}.{String(state.timestamp % 1000).padStart(3, '0')}
            </div>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #0f0', fontSize: '9px', color: '#666' }}>
        Total Scenes: {sceneManager.allScenes.length} | Visible: {sceneManager.scenes.length} | Nav Items: {navigationArray.length}
      </div>
    </div>
  );
}
