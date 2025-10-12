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
import { useSceneOrchestratorContext } from './SceneOrchestratorContext';
import { useDialogue } from '@core/dialogue/DialogueContext';
import { useImageState } from '@features/image-scene/ImageStateContext';
import type { Scene } from '@core/types/scene';

interface DebugState {
  animating: boolean;
  wheelAccum: number;
  currentIndex: number;
  isLocked: boolean;
  lockReason: string;
  lockedForward: boolean;
  lockedBackward: boolean;
  blockDismissActive: boolean;
  settleTimerActive: boolean;
  lastEvent: string;
  timestamp: number;
}

export function StepScrollDebug() {
  const [state, setState] = useState<DebugState>({
    animating: false,
    wheelAccum: 0,
    currentIndex: 0,
    isLocked: false,
    lockReason: '',
    lockedForward: false,
    lockedBackward: false,
    blockDismissActive: false,
    settleTimerActive: false,
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

  // Get scene manager and orchestrator for additional context
  const sceneManager = useSceneManager();
  const orchestrator = useSceneOrchestratorContext();
  const imageState = useImageState();

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

  // Get current scene info
  const currentScene = sceneManager.visibleScenes[state.currentIndex] as (Scene & { sceneId?: string, caption?: string, text?: string }) | undefined;
  const sceneType = currentScene?.type || 'unknown';
  const sceneId = currentScene?.sceneId || 'no-id';
  const captionState = imageState.getImageState(sceneId);
  const hasCaption = sceneType === 'image' && ((currentScene?.caption || currentScene?.text)?.trim() || false);

  // Get dialogue messages for current scene (safely)
  const messages = dialogue?.getMessagesForScene(sceneId) ?? [];
  const pendingConversions = dialogue?.getPendingConversions() ?? [];

  // Get input state from orchestrator (or use 'idle' as default)
  const inputState = orchestrator?.getInputState(sceneId) ?? 'idle';

  // Test button handlers - update orchestrator state
  const handleSetIdle = () => {
    if (!orchestrator) return;
    console.log('🎯 Setting input state: IDLE for scene:', sceneId);
    orchestrator.setInputState(sceneId, 'idle');
  };

  const handleSetRecording = () => {
    if (!orchestrator) return;
    console.log('🎯 Setting input state: RECORDING for scene:', sceneId);
    orchestrator.setInputState(sceneId, 'recording');
  };

  const handleSetWaiting = () => {
    if (!orchestrator) return;
    console.log('🎯 Setting input state: WAITING for scene:', sceneId);
    orchestrator.setInputState(sceneId, 'waiting');
  };

  const handleSetConverting = () => {
    if (!orchestrator) return;
    console.log('🎯 Setting input state: CONVERTING for scene:', sceneId);
    orchestrator.setInputState(sceneId, 'converting');
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
        {/* Scroll State Section */}
        <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #0f0' }}>
          <div style={{ color: '#0ff', marginBottom: '4px', fontWeight: 'bold' }}>🖱️ Scroll State</div>
          <div style={{ color: state.animating ? '#ff0' : '#0f0' }}>
            🎬 Animating: <strong>{state.animating ? 'TRUE' : 'FALSE'}</strong>
          </div>
          <div style={{ color: Math.abs(state.wheelAccum) > 0 ? '#ff0' : '#0f0' }}>
            📊 Wheel Accum: <strong>{state.wheelAccum.toFixed(0)}px</strong>
          </div>
        </div>

        {/* Lock State Section */}
        <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #0f0' }}>
          <div style={{ color: '#0ff', marginBottom: '4px', fontWeight: 'bold' }}>🔒 Lock State</div>
          <div style={{ color: (state.lockedForward || state.lockedBackward) ? '#f00' : '#0f0' }}>
            Status: <strong>{state.isLocked ? 'LOCKED' : 'FREE'}</strong>
          </div>
          {state.lockReason && (
            <div style={{ color: '#f80', fontSize: '10px' }}>
              Reason: {state.lockReason}
            </div>
          )}
          <div style={{ color: state.lockedForward ? '#f00' : '#0f0', marginLeft: '12px', fontSize: '10px' }}>
            ⬇️ Forward: <strong>{state.lockedForward ? 'LOCKED' : 'free'}</strong>
          </div>
          <div style={{ color: state.lockedBackward ? '#f00' : '#0f0', marginLeft: '12px', fontSize: '10px' }}>
            ⬆️ Backward: <strong>{state.lockedBackward ? 'LOCKED' : 'free'}</strong>
          </div>
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

      {/* Input Scene State Test */}
      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #f0f' }}>
        <div style={{ color: '#f0f', marginBottom: '8px', fontWeight: 'bold' }}>🎙️ Input Scene State Test</div>

        {/* Current State Display */}
        <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #444' }}>
          <div style={{ color: '#0ff', fontSize: '10px', marginBottom: '4px' }}>Current State:</div>
          <div style={{
            marginLeft: '8px',
            padding: '8px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '4px',
            border: '2px solid #0f0'
          }}>
            <div style={{ color: '#0f0', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>
              {inputState.toUpperCase()}
            </div>
          </div>
        </div>

        {/* State Change Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            onClick={handleSetIdle}
            style={{
              padding: '8px',
              background: inputState === 'idle' ? '#0a0' : '#333',
              border: inputState === 'idle' ? '2px solid #0f0' : '1px solid #666',
              borderRadius: '4px',
              color: inputState === 'idle' ? '#fff' : '#999',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            ⏸️ IDLE
          </button>

          <button
            onClick={handleSetRecording}
            style={{
              padding: '8px',
              background: inputState === 'recording' ? '#a00' : '#333',
              border: inputState === 'recording' ? '2px solid #f00' : '1px solid #666',
              borderRadius: '4px',
              color: inputState === 'recording' ? '#fff' : '#999',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            🔴 RECORDING
          </button>

          <button
            onClick={handleSetWaiting}
            style={{
              padding: '8px',
              background: inputState === 'waiting' ? '#aa0' : '#333',
              border: inputState === 'waiting' ? '2px solid #ff0' : '1px solid #666',
              borderRadius: '4px',
              color: inputState === 'waiting' ? '#fff' : '#999',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            ⏳ WAITING
          </button>

          <button
            onClick={handleSetConverting}
            style={{
              padding: '8px',
              background: inputState === 'converting' ? '#00a' : '#333',
              border: inputState === 'converting' ? '2px solid #0ff' : '1px solid #666',
              borderRadius: '4px',
              color: inputState === 'converting' ? '#fff' : '#999',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            🔄 CONVERTING
          </button>
        </div>

        {/* State descriptions */}
        <div style={{ marginTop: '8px', fontSize: '8px', color: '#888', lineHeight: '1.4' }}>
          <div><strong>IDLE:</strong> No speech bubble shown</div>
          <div><strong>RECORDING:</strong> Bubble showing with live text</div>
          <div><strong>WAITING:</strong> Bubble + waiting indicator</div>
          <div><strong>CONVERTING:</strong> Creating permanent scenes</div>
        </div>
      </div>

      {/* Stats Footer */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #0f0', fontSize: '9px', color: '#666' }}>
        Total Scenes: {sceneManager.allScenes.length} | Visible: {sceneManager.visibleScenes.length}
      </div>
    </div>
  );
}
