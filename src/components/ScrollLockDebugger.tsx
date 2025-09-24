/**
 * Debug component to visualize and manually control scroll locks
 */
import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useDialogue } from '../chat/ChatDialogueContext';

interface LockDebugInfo {
  sectionIndex: number;
  sceneType: string;
  contentLocks: {
    waiting?: boolean;
    lockForward?: boolean;
    lockBackward?: boolean;
    isPlayerTurn?: boolean;
    questState?: string;
  };
  domLocks: {
    lockForward?: boolean;
    lockBackward?: boolean;
  };
}

export const ScrollLockDebugger: React.FC = () => {
  const { currentIndex, scenes } = useNavigation();
  const { isPlayerTurn, waiting, questState } = useDialogue();
  const [isVisible, setIsVisible] = useState(true);
  const [lockInfo, setLockInfo] = useState<LockDebugInfo[]>([]);
  const [manualLocks, setManualLocks] = useState<{[key: number]: {forward?: boolean, backward?: boolean}}>({});
  const [blockNotifications, setBlockNotifications] = useState<{message: string, timestamp: number}[]>([]);

  // Collect lock information from DOM and content
  useEffect(() => {
    const sections = document.querySelectorAll('[data-section-index]');
    const info: LockDebugInfo[] = [];

    sections.forEach((section, idx) => {
      const sectionIndex = parseInt(section.getAttribute('data-section-index') || '0');
      const scene = scenes[sectionIndex];
      const sceneType = scene?.type || 'unknown';

      // Check DOM locks
      const domLockForward = section.hasAttribute('data-lock-forward');
      const domLockBackward = section.hasAttribute('data-lock-backward');

      // Content locks (from chat dialogue context for input scenes)
      const contentLocks: any = {};
      if (sceneType === 'input') {
        contentLocks.waiting = waiting;
        contentLocks.isPlayerTurn = isPlayerTurn;
        contentLocks.questState = questState;
        contentLocks.lockForward = isPlayerTurn || waiting || questState === 'active';
      }

      info.push({
        sectionIndex,
        sceneType,
        contentLocks,
        domLocks: {
          lockForward: domLockForward,
          lockBackward: domLockBackward
        }
      });
    });

    setLockInfo(info);
  }, [scenes, currentIndex, isPlayerTurn, waiting, questState]);

  // Apply manual locks to DOM
  useEffect(() => {
    Object.entries(manualLocks).forEach(([sectionIndexStr, locks]) => {
      const sectionIndex = parseInt(sectionIndexStr);
      const section = document.querySelector(`[data-section-index="${sectionIndex}"]`);
      if (section) {
        if (locks.forward) {
          section.setAttribute('data-lock-forward', 'true');
        } else {
          section.removeAttribute('data-lock-forward');
        }
        if (locks.backward) {
          section.setAttribute('data-lock-backward', 'true');
        } else {
          section.removeAttribute('data-lock-backward');
        }
      }
    });
  }, [manualLocks]);

  // Listen for scroll blocking events
  useEffect(() => {
    const handleScrollBlock = (event: CustomEvent) => {
      const { direction, currentIndex: blockedIndex, reason } = event.detail;
      const message = `🔒 ${direction} scroll blocked from section ${blockedIndex}: ${reason}`;
      setBlockNotifications(prev => [
        { message, timestamp: Date.now() },
        ...prev.slice(0, 4) // Keep only last 5 notifications
      ]);

      // Auto-remove notification after 3 seconds
      setTimeout(() => {
        setBlockNotifications(prev => prev.filter(n => n.timestamp !== Date.now()));
      }, 3000);
    };

    window.addEventListener('scroll-blocked' as any, handleScrollBlock);
    return () => window.removeEventListener('scroll-blocked' as any, handleScrollBlock);
  }, []);

  // Auto-expire old notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setBlockNotifications(prev => prev.filter(n => now - n.timestamp < 3000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleManualLock = (sectionIndex: number, direction: 'forward' | 'backward') => {
    setManualLocks(prev => ({
      ...prev,
      [sectionIndex]: {
        ...prev[sectionIndex],
        [direction]: !prev[sectionIndex]?.[direction]
      }
    }));
  };

  const clearAllManualLocks = () => {
    setManualLocks({});
    // Remove all manual lock attributes from DOM
    document.querySelectorAll('[data-lock-forward], [data-lock-backward]').forEach(section => {
      section.removeAttribute('data-lock-forward');
      section.removeAttribute('data-lock-backward');
    });
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
        Show Lock Debugger
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '400px',
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
        <h3 style={{ margin: 0, fontSize: '14px' }}>Scroll Lock Debugger</h3>
        <div>
          <button
            onClick={clearAllManualLocks}
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
            Clear Locks
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
        <div><strong>Chat State:</strong> {waiting ? 'waiting' : isPlayerTurn ? 'player-turn' : 'idle'}</div>
        <div><strong>Quest State:</strong> {questState}</div>
      </div>

      {/* Block Notifications */}
      {blockNotifications.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#f39c12', marginBottom: '4px' }}>Recent Blocks:</div>
          {blockNotifications.map((notification, idx) => (
            <div
              key={notification.timestamp}
              style={{
                fontSize: '10px',
                padding: '4px',
                background: 'rgba(231, 76, 60, 0.3)',
                borderRadius: '3px',
                marginBottom: '2px',
                opacity: Math.max(0.3, 1 - (Date.now() - notification.timestamp) / 3000)
              }}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
        {lockInfo.map((info) => (
          <div
            key={info.sectionIndex}
            style={{
              marginBottom: '12px',
              padding: '8px',
              background: info.sectionIndex === currentIndex ? 'rgba(52, 152, 219, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              border: info.sectionIndex === currentIndex ? '2px solid #3498db' : '1px solid transparent'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong>Section {info.sectionIndex} ({info.sceneType})</strong>
              {info.sectionIndex === currentIndex && <span style={{ fontSize: '10px', color: '#3498db' }}>CURRENT</span>}
            </div>

            {/* Content Locks */}
            {Object.keys(info.contentLocks).length > 0 && (
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '10px', color: '#95a5a6', marginBottom: '4px' }}>Content Locks:</div>
                {Object.entries(info.contentLocks).map(([key, value]) => (
                  <div key={key} style={{ fontSize: '10px', marginLeft: '8px' }}>
                    <span style={{ color: value ? '#e74c3c' : '#27ae60' }}>
                      {key}: {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* DOM Locks */}
            <div style={{ marginBottom: '6px' }}>
              <div style={{ fontSize: '10px', color: '#95a5a6', marginBottom: '4px' }}>DOM Locks:</div>
              <div style={{ fontSize: '10px', marginLeft: '8px' }}>
                <span style={{ color: info.domLocks.lockForward ? '#e74c3c' : '#27ae60' }}>
                  Forward: {info.domLocks.lockForward ? 'LOCKED' : 'open'}
                </span>
                {' | '}
                <span style={{ color: info.domLocks.lockBackward ? '#e74c3c' : '#27ae60' }}>
                  Backward: {info.domLocks.lockBackward ? 'LOCKED' : 'open'}
                </span>
              </div>
            </div>

            {/* Manual Controls */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              <button
                onClick={() => toggleManualLock(info.sectionIndex, 'forward')}
                style={{
                  background: manualLocks[info.sectionIndex]?.forward ? '#e74c3c' : '#27ae60',
                  color: 'white',
                  border: 'none',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  cursor: 'pointer'
                }}
              >
                {manualLocks[info.sectionIndex]?.forward ? 'Unlock →' : 'Lock →'}
              </button>
              <button
                onClick={() => toggleManualLock(info.sectionIndex, 'backward')}
                style={{
                  background: manualLocks[info.sectionIndex]?.backward ? '#e74c3c' : '#27ae60',
                  color: 'white',
                  border: 'none',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  cursor: 'pointer'
                }}
              >
                {manualLocks[info.sectionIndex]?.backward ? 'Unlock ←' : 'Lock ←'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};