/**
 * StepScrollDebug - Visual display of useStepScroll internal state
 *
 * Shows real-time state of:
 * - Animation flag
 * - Wheel accumulator
 * - Current index
 * - Lock states
 * - Timers
 */
import { useEffect, useState } from 'react';

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

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#0f0',
        padding: '15px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 999999,
        minWidth: '300px',
        border: '2px solid #0f0',
      }}
    >
      <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', color: '#0ff' }}>
        📊 useStepScroll Debug
      </div>

      <div style={{ display: 'grid', gap: '5px' }}>
        <div style={{ color: state.animating ? '#ff0' : '#0f0' }}>
          🎬 Animating: <strong>{state.animating ? 'TRUE' : 'FALSE'}</strong>
        </div>

        <div style={{ color: Math.abs(state.wheelAccum) > 0 ? '#ff0' : '#0f0' }}>
          🖱️ Wheel Accum: <strong>{state.wheelAccum.toFixed(0)}px</strong>
        </div>

        <div>
          📍 Current Index: <strong>{state.currentIndex}</strong>
        </div>

        <div style={{ color: (state.lockedForward || state.lockedBackward) ? '#f00' : '#0f0' }}>
          🔒 Locked: <strong>{state.isLocked ? 'TRUE' : 'FALSE'}</strong>
          {state.lockReason && <span style={{ color: '#f80' }}> ({state.lockReason})</span>}
        </div>

        <div style={{ color: state.lockedForward ? '#f00' : '#0f0', marginLeft: '20px' }}>
          ⬇️ Forward (Down): <strong>{state.lockedForward ? 'LOCKED' : 'free'}</strong>
        </div>

        <div style={{ color: state.lockedBackward ? '#f00' : '#0f0', marginLeft: '20px' }}>
          ⬆️ Backward (Up): <strong>{state.lockedBackward ? 'LOCKED' : 'free'}</strong>
        </div>

        <div style={{ color: state.blockDismissActive ? '#ff0' : '#666' }}>
          ⏱️ Block Dismiss Timer: <strong>{state.blockDismissActive ? 'ACTIVE' : 'idle'}</strong>
        </div>

        <div style={{ color: state.settleTimerActive ? '#ff0' : '#666' }}>
          ⏲️ Settle Timer: <strong>{state.settleTimerActive ? 'ACTIVE' : 'idle'}</strong>
        </div>

        {state.lastEvent && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #0f0' }}>
            <div style={{ color: '#0ff' }}>Last Event:</div>
            <div style={{ color: '#ff0' }}>{state.lastEvent}</div>
            <div style={{ color: '#666', fontSize: '10px' }}>
              {new Date(state.timestamp).toLocaleTimeString()}.{state.timestamp % 1000}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
