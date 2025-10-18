/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react-hooks/exhaustive-deps */
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
import { useSceneFlowMetadata } from '@core/data/FlowMetadataStore';
import type { Scene } from '@core/types/scene';
import type { ImageState } from '@core/dialogue/types';

interface DebugState {
  wheelAccum: number;
  debounceActive: boolean;
  lastEvent: string;
  timestamp: number;
}

export function StepScrollDebug() {
  // Unused state - kept for future debugging features
  const [, _setState] = useState<DebugState>({
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

  // Load visibility state from localStorage, default to true if not set
  const getInitialVisibility = () => {
    const saved = localStorage.getItem('debugPanel:visible');
    if (saved !== null) {
      return saved === 'true';
    }
    return true; // Default to visible
  };

  const [isVisible, setIsVisible] = useState(getInitialVisibility);

  // Get scene manager for additional context (single source of truth)
  const sceneManager = useSceneManager();

  // Get current navigation state directly from SceneManager
  const { navigationIndex, navigationArray } = sceneManager;

  // Get flow metadata for current scene
  const currentNavItem = navigationArray[navigationIndex];
  const currentScene = currentNavItem?.scene as (Scene & { sceneId?: string, flowId?: string }) | undefined;
  // @ts-expect-error - Used in future debugging features
  const _flowMetadata = useSceneFlowMetadata(currentScene); // Unused - kept for future debugging

  // Try to get dialogue context, may be undefined if not in provider tree
  // Unused but kept for future debugging features
  // @ts-expect-error - Used in future debugging features
  let _dialogue;
  try {
    _dialogue = useDialogue();
  } catch (e) {
    // DialogueProvider not available
    _dialogue = null;
  }

  useEffect(() => {
    // Listen for custom debug events from useStepScroll
    const handleDebug = (e: CustomEvent) => {
      _setState(e.detail);
    };

    window.addEventListener('stepscroll:debug' as any, handleDebug);

    return () => {
      window.removeEventListener('stepscroll:debug' as any, handleDebug);
    };
  }, []);

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

  // Extract scene info (currentNavItem and currentScene already defined above for flowMetadata hook)
  const sceneType = currentScene?.type || 'unknown';
  const sceneId = currentNavItem?.sceneId || 'no-id';

  // Get caption state from navigation array (single source of truth)
  const captionState: ImageState =
    currentNavItem?.sceneState.type === 'image'
      ? currentNavItem.sceneState.state
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
    if (!currentNavItem) return 'No state';
    const { sceneState } = currentNavItem;

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

  // RecordPanel state control handlers
  const setRecordPanelHidden = () => {
    sceneManager.updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'basic' });
  };

  const setRecordPanelShowQuest = () => {
    sceneManager.updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'quest-showing' });
  };

  const setRecordPanelShowInput = () => {
    sceneManager.updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'input-showInput' });
  };

  const setRecordPanelRecording = () => {
    sceneManager.updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'input-recording' });
  };

  const setRecordPanelShowHint = () => {
    // Using a new state for showing hint - will need to be added to DialogueState type
    sceneManager.updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'show-hint' as any });
  };

  const setRecordPanelRecordAnswer = () => {
    sceneManager.updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'record-answer' });
  };

  const setRecordPanelAnswerWaiting = () => {
    sceneManager.updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'answer-waiting' });
  };

  const setRecordPanelAnswerRight = () => {
    sceneManager.updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'answer-right' });
  };

  const setRecordPanelAnswerWrong = () => {
    sceneManager.updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'answer-wrong' });
  };

  const setRecordPanelAiWaiting = () => {
    sceneManager.updateNavigationItemState(navigationIndex, { type: 'dialogue', state: 'ai-waiting' });
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

      {/* RecordPanel Controls Section */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f90' }}>
        <div style={{ color: '#f90', marginBottom: '8px', fontWeight: 'bold' }}>🎙️ RecordPanel Visual States</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            onClick={setRecordPanelHidden}
            style={{
              padding: '8px',
              background: currentNavItem?.sceneState.type === 'dialogue' && currentNavItem?.sceneState.state === 'basic' ? '#666' : '#333',
              color: '#fff',
              border: '2px solid #666',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            ❌ Hidden
          </button>
          <button
            onClick={setRecordPanelShowQuest}
            style={{
              padding: '8px',
              background: currentNavItem?.sceneState.type === 'dialogue' && currentNavItem?.sceneState.state === 'quest-showing' ? '#FFD700' : '#333',
              color: currentNavItem?.sceneState.type === 'dialogue' && currentNavItem?.sceneState.state === 'quest-showing' ? '#000' : '#fff',
              border: '2px solid #FFD700',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            🎯 Quest
          </button>
          <button
            onClick={setRecordPanelShowInput}
            style={{
              padding: '8px',
              background: currentNavItem?.sceneState.type === 'dialogue' && currentNavItem?.sceneState.state === 'input-showInput' ? '#0f0' : '#333',
              color: '#fff',
              border: '2px solid #0f0',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            ✅ Ready
          </button>
          <button
            onClick={setRecordPanelRecording}
            style={{
              padding: '8px',
              background: currentNavItem?.sceneState.type === 'dialogue' && currentNavItem?.sceneState.state === 'input-recording' ? '#d81919' : '#333',
              color: '#fff',
              border: '2px solid #d81919',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            🔴 Ask Rec
          </button>
          <button
            onClick={setRecordPanelShowHint}
            style={{
              padding: '8px',
              background: currentNavItem?.sceneState.type === 'dialogue' && currentNavItem?.sceneState.state === 'show-hint' ? '#FFA500' : '#333',
              color: '#fff',
              border: '2px solid #FFA500',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            💡 Hint
          </button>
          <button
            onClick={setRecordPanelRecordAnswer}
            style={{
              padding: '8px',
              background: currentNavItem?.sceneState.type === 'dialogue' && currentNavItem?.sceneState.state === 'record-answer' ? '#9370DB' : '#333',
              color: '#fff',
              border: '2px solid #9370DB',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            🟣 Answer Rec
          </button>
          <button
            onClick={setRecordPanelAnswerWaiting}
            style={{
              padding: '8px',
              background: currentNavItem?.sceneState.type === 'dialogue' && currentNavItem?.sceneState.state === 'answer-waiting' ? '#FFB84D' : '#333',
              color: '#fff',
              border: '2px solid #FFB84D',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            ⏳ Ans Wait
          </button>
          <button
            onClick={setRecordPanelAnswerRight}
            style={{
              padding: '8px',
              background: currentNavItem?.sceneState.type === 'dialogue' && currentNavItem?.sceneState.state === 'answer-right' ? '#0f0' : '#333',
              color: '#fff',
              border: '2px solid #0f0',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            ✅ Right
          </button>
          <button
            onClick={setRecordPanelAnswerWrong}
            style={{
              padding: '8px',
              background: currentNavItem?.sceneState.type === 'dialogue' && currentNavItem?.sceneState.state === 'answer-wrong' ? '#f00' : '#333',
              color: '#fff',
              border: '2px solid #f00',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            ❌ Wrong
          </button>
          <button
            onClick={setRecordPanelAiWaiting}
            style={{
              padding: '8px',
              background: currentNavItem?.sceneState.type === 'dialogue' && currentNavItem?.sceneState.state === 'ai-waiting' ? '#666' : '#333',
              color: '#fff',
              border: '2px solid #999',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold',
              gridColumn: 'span 2'
            }}
          >
            ⏳ AI Waiting
          </button>
        </div>
        <div style={{ marginTop: '8px', fontSize: '9px', color: '#888', fontStyle: 'italic' }}>
          Ten visual states for RecordPanel testing
        </div>
      </div>

      {/* Stats Footer */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #0f0', fontSize: '9px', color: '#666' }}>
        Total Scenes: {sceneManager.allScenes.length} | Visible: {sceneManager.scenes.length} | Nav Items: {navigationArray.length}
      </div>
    </div>
  );
}
