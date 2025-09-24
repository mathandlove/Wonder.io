/**
 * Debug component to track scene navigation events and triggers
 */
import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useDialogue } from '../chat/ChatDialogueContext';
import { sceneBus } from '../scenes/registry/sceneBus';

interface SceneEvent {
  timestamp: number;
  type: 'enter' | 'leave' | 'scroll-blocked';
  sceneId?: string;
  direction?: 'forward' | 'backward';
  sceneIndex?: number;
  message: string;
}

export const ScrollLockDebugger: React.FC = () => {
  const { currentIndex, scenes } = useNavigation();
  const { isPlayerTurn, waiting, questState } = useDialogue();
  const [isVisible, setIsVisible] = useState(true);
  const [events, setEvents] = useState<SceneEvent[]>([]);

  // Listen for scene bus events
  useEffect(() => {
    const handleSceneEnter = (sceneId: string, direction: 'forward' | 'backward') => {
      const sceneIndex = scenes.findIndex(s => (s as any).sceneId === sceneId);
      const scene = scenes[sceneIndex];
      const sceneType = scene?.type || 'unknown';

      const event: SceneEvent = {
        timestamp: Date.now(),
        type: 'enter',
        sceneId,
        direction,
        sceneIndex,
        message: `🟢 Enter ${sceneType} scene "${sceneId}" (index ${sceneIndex}) via ${direction}`
      };

      setEvents(prev => [event, ...prev.slice(0, 19)]); // Keep last 20 events
    };

    const handleSceneLeave = (sceneId: string, direction: 'forward' | 'backward') => {
      const sceneIndex = scenes.findIndex(s => (s as any).sceneId === sceneId);
      const scene = scenes[sceneIndex];
      const sceneType = scene?.type || 'unknown';

      const event: SceneEvent = {
        timestamp: Date.now(),
        type: 'leave',
        sceneId,
        direction,
        sceneIndex,
        message: `🔴 Leave ${sceneType} scene "${sceneId}" (index ${sceneIndex}) via ${direction}`
      };

      setEvents(prev => [event, ...prev.slice(0, 19)]); // Keep last 20 events
    };

    sceneBus.on('scene:enter', handleSceneEnter);
    sceneBus.on('scene:leave', handleSceneLeave);

    return () => {
      sceneBus.off('scene:enter', handleSceneEnter);
      sceneBus.off('scene:leave', handleSceneLeave);
    };
  }, [scenes]);

  // Listen for scroll blocking events
  useEffect(() => {
    const handleScrollBlock = (event: CustomEvent) => {
      const { direction, currentIndex: blockedIndex, reason } = event.detail;
      const scene = scenes[blockedIndex];
      const sceneType = scene?.type || 'unknown';

      const blockEvent: SceneEvent = {
        timestamp: Date.now(),
        type: 'scroll-blocked',
        direction,
        sceneIndex: blockedIndex,
        message: `🔒 Blocked ${direction} scroll from ${sceneType} scene (index ${blockedIndex}): ${reason}`
      };

      setEvents(prev => [blockEvent, ...prev.slice(0, 19)]); // Keep last 20 events
    };

    window.addEventListener('scroll-blocked' as any, handleScrollBlock);
    return () => window.removeEventListener('scroll-blocked' as any, handleScrollBlock);
  }, [scenes]);

  const clearEvents = () => {
    setEvents([]);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + '.' + String(date.getMilliseconds()).padStart(3, '0');
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 10000,
          background: '#333',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        Show Event Log
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '450px',
      maxHeight: '80vh',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 10000,
      overflow: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>Scene Event Log</h3>
        <div>
          <button
            onClick={clearEvents}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              cursor: 'pointer',
              marginRight: '8px'
            }}
          >
            Clear Log
          </button>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: '#666',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Hide
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' }}>
        <div><strong>Current Section:</strong> {currentIndex}</div>
        <div><strong>Scene Type:</strong> {scenes[currentIndex]?.type || 'unknown'}</div>
        <div><strong>Last In Flow:</strong> {(scenes[currentIndex] as any)?.lastInFlow ? 'YES' : 'NO'}</div>
        <div><strong>Chat State:</strong> {waiting ? 'waiting' : isPlayerTurn ? 'player-turn' : 'idle'}</div>
        <div><strong>Quest State:</strong> {questState}</div>
        <div><strong>Total Events:</strong> {events.length}</div>
      </div>

      <div style={{ maxHeight: '60vh', overflow: 'auto', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}>
        {events.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>
            No events yet. Navigate between scenes to see events here.
          </div>
        ) : (
          events.map((event, index) => (
            <div
              key={`${event.timestamp}-${index}`}
              style={{
                padding: '8px 12px',
                borderBottom: index < events.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                background: event.type === 'enter' ? 'rgba(34, 139, 34, 0.1)' :
                           event.type === 'leave' ? 'rgba(220, 20, 60, 0.1)' :
                           'rgba(255, 165, 0, 0.1)',
                fontFamily: 'monospace',
                fontSize: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <span style={{
                  color: event.type === 'enter' ? '#90EE90' :
                         event.type === 'leave' ? '#FFB6C1' :
                         '#FFA500',
                  fontWeight: 'bold'
                }}>
                  {event.type.toUpperCase()}
                </span>
                <span style={{ color: '#888', fontSize: '9px' }}>
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
              <div style={{ color: '#fff', lineHeight: '1.3' }}>
                {event.message}
              </div>
              {event.direction && (
                <div style={{ color: '#888', fontSize: '9px', marginTop: '2px' }}>
                  Direction: {event.direction}
                  {event.sceneIndex !== undefined && ` | Index: ${event.sceneIndex}`}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};