import React from 'react";
import { useEntranceGateContext } from '@features/characters/EntranceGateContext";
import { useScrollManager } from '@shared/hooks/useScrollManager";
import { useEntranceGate } from '@shared/hooks/useEntranceGate";
import type { Scene } from '@core/types/scene";

interface EntranceGateDebuggerProps {
  scenes: Scene[];
}

export const EntranceGateDebugger: React.FC<EntranceGateDebuggerProps> = ({ scenes }) => {
  const { getDebugInfo } = useEntranceGateContext();
  const { index: scrollOffset } = useScrollManager({ setCurrentIndex: () => {} });

  // Get current scene
  const currentSceneIndex = Math.max(0, Math.min(scenes.length - 1, Math.round(scrollOffset)));
  const currentScene = scenes[currentSceneIndex];
  const currentSceneToken = `${currentScene?.id || 'scene'}-${currentSceneIndex}-stable`;

  // Calculate sides needed for current scene
  const sidesNeeded = React.useMemo(() => {
    const sides: ('left' | 'right')[] = [];
    if (currentScene?.meta?.panelLeft?.newCharacter) {
      sides.push('left');
    }
    if (currentScene?.meta?.panelRight?.newCharacter) {
      sides.push('right');
    }
    return sides;
  }, [currentScene]);

  // Get entrance gate state for current scene
  const { ready: bubbleReady } = useEntranceGate(currentSceneToken, sidesNeeded);

  const debugInfo = getDebugInfo ? getDebugInfo() : null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px 12px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      borderBottom: '1px solid #333',
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap'
    }}>
      <div>
        <strong>Scene:</strong> {currentSceneIndex} ({currentScene?.type})
        <br />
        <strong>Token:</strong> {currentSceneToken}
      </div>

      <div>
        <strong>Left Panel:</strong>
        <br />
        Character: {currentScene?.meta?.panelLeft?.character || 'none'}
        <br />
        NewCharacter: {currentScene?.meta?.panelLeft?.newCharacter ? 'yes' : 'no'}
        <br />
        AboutToSwap: {currentScene?.meta?.panelLeft?.aboutToSwap ? 'yes' : 'no'}
        <br />
        <span style={{ color: 'yellow' }}>
          Visible: {(!!(currentScene?.meta?.panelLeft?.character && currentScene?.meta?.panelLeft?.character !== 'NOCHARACTER') || currentScene?.meta?.panelLeft?.newCharacter) ? 'YES' : 'NO'}
        </span>
      </div>

      <div>
        <strong>Right Panel:</strong>
        <br />
        Character: {currentScene?.meta?.panelRight?.character || 'none'}
        <br />
        NewCharacter: {currentScene?.meta?.panelRight?.newCharacter ? 'yes' : 'no'}
        <br />
        AboutToSwap: {currentScene?.meta?.panelRight?.aboutToSwap ? 'yes' : 'no'}
        <br />
        <span style={{ color: 'yellow' }}>
          Visible: {(!!(currentScene?.meta?.panelRight?.character && currentScene?.meta?.panelRight?.character !== 'NOCHARACTER') || currentScene?.meta?.panelRight?.newCharacter) ? 'YES' : 'NO'}
        </span>
      </div>

      <div>
        <strong>Entrance Gate:</strong>
        <br />
        Sides Needed: [{sidesNeeded.join(', ') || 'none'}]
        <br />
        Bubble Ready: <span style={{ color: bubbleReady ? 'lime' : 'red' }}>{bubbleReady ? 'YES' : 'NO'}</span>
        <br />
        Current Token: {currentSceneToken}
      </div>

      {debugInfo && (
        <div>
          <strong>Context Status:</strong>
          <br />
          Handlers: {debugInfo.handlerCount}
          <br />
          Active Tokens: {debugInfo.activeTokens.join(', ') || 'none'}
          <br />
          Scene States: {Object.keys((debugInfo as any).sceneStates || {}).length}
        </div>
      )}

      <div>
        <strong>Speech Bubble:</strong>
        <br />
        Type: {currentScene?.type}
        <br />
        Speaker: {(currentScene as any)?.speaker || 'none'}
        <br />
        Will Show: <span style={{ color: (currentScene?.type === 'character' && bubbleReady) ? 'lime' : 'orange' }}>
          {currentScene?.type === 'character' ? (bubbleReady ? 'YES' : 'WAITING') : 'N/A'}
        </span>
      </div>
    </div>
  );
};