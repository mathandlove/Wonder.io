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

  // Get scene manager and orchestrator for additional context
  const sceneManager = useSceneManager();
  const orchestrator = useSceneOrchestratorContext();

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
  const captionState = orchestrator?.getCaptionState(sceneId);
  const hasCaption = sceneType === 'image' && ((currentScene?.caption || currentScene?.text)?.trim() || false);

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
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
      }}
    >
      <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', color: '#0ff' }}>
        📊 Scroll & Scene Debug
      </div>

      <div style={{ display: 'grid', gap: '5px' }}>
        {/* Scene Info Section */}
        <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #0f0' }}>
          <div style={{ color: '#0ff', marginBottom: '4px', fontWeight: 'bold' }}>🎬 Current Scene</div>
          <div>
            📍 Index: <strong>{state.currentIndex}</strong> / {sceneManager.visibleScenes.length - 1}
          </div>
          <div style={{ color: '#ff0' }}>
            🎭 Type: <strong>{sceneType}</strong>
          </div>
          <div style={{ fontSize: '10px', color: '#888', wordBreak: 'break-all' }}>
            ID: {sceneId}
          </div>
          {sceneType === 'image' && hasCaption && (
            <div style={{
              marginTop: '6px',
              paddingTop: '6px',
              borderTop: '1px dashed #444'
            }}>
              <div style={{ color: '#f0f', fontSize: '10px', marginBottom: '3px' }}>
                📝 Caption Component
              </div>
              <div style={{ marginLeft: '12px', fontSize: '10px' }}>
                <div style={{ color: captionState ? '#0f0' : '#f00' }}>
                  State: <strong>{captionState ? captionState.toUpperCase() : 'UNDEFINED'}</strong>
                </div>
                <div style={{ color: '#0ff' }}>
                  CSS: <strong>
                    caption--{captionState === 'showing' ? 'animate-in' : captionState === 'dismissed' ? 'animate-out' : 'hidden'}
                  </strong>
                </div>
                <div style={{ color: '#888' }}>
                  Text: {currentScene?.caption || currentScene?.text ? '✓' : '✗'}
                </div>
              </div>
            </div>
          )}
        </div>

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

        {/* Timers Section */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ color: '#0ff', marginBottom: '4px', fontWeight: 'bold' }}>⏱️ Timers</div>
          <div style={{ color: state.blockDismissActive ? '#ff0' : '#666', fontSize: '10px' }}>
            Block Dismiss: <strong>{state.blockDismissActive ? 'ACTIVE' : 'idle'}</strong>
          </div>
          <div style={{ color: state.settleTimerActive ? '#ff0' : '#666', fontSize: '10px' }}>
            Settle: <strong>{state.settleTimerActive ? 'ACTIVE' : 'idle'}</strong>
          </div>
        </div>

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
        Total Scenes: {sceneManager.allScenes.length} | Visible: {sceneManager.visibleScenes.length}
      </div>
    </div>
  );
}
