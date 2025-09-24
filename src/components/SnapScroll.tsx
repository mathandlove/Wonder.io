import React, { useRef, useEffect, useState, useCallback } from 'react';
import './SnapScroll.css';

interface FlowItem {
  side?: 'left' | 'right';
  text?: string;
  waiting?: boolean;
  lockForward?: boolean;
  lockBackward?: boolean;
}

interface StoryContentItem {
  type: string;
  text?: string;
  speaker?: string;
  background?: string;
  'left-character'?: string;
  'right-character'?: string;
  leftCharacter?: string;
  rightCharacter?: string;
  showWaitingBubble?: boolean;
  image?: string;
  flow?: FlowItem[];
  lvl1?: string;
  lvl2?: string;
  author?: string;
  lockForward?: boolean;
  lockBackward?: boolean;
}

interface SnapScrollProps {
  storyContent: StoryContentItem[];
}

interface LockState {
  forward: boolean;
  backward: boolean;
  reason: string;
}

const SnapScroll: React.FC<SnapScrollProps> = ({ storyContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [locks, setLocks] = useState<LockState>({ forward: false, backward: false, reason: '' });
  const animatingRef = useRef(false);
  const touchStartYRef = useRef(0);
  const wheelAccumRef = useRef(0);

  // Flatten flow items into individual scenes
  const flattenedScenes: Array<{
    sceneIndex: number;
    flowIndex?: number;
    scene: StoryContentItem;
    flowItem?: FlowItem;
    isFlowItem: boolean;
  }> = [];

  storyContent.forEach((scene, sceneIndex) => {
    if (scene.flow && scene.flow.length > 0) {
      // Add each flow item as a separate scene
      scene.flow.forEach((flowItem, flowIndex) => {
        flattenedScenes.push({
          sceneIndex,
          flowIndex,
          scene,
          flowItem,
          isFlowItem: true
        });
      });
    } else {
      // Regular scene without flow
      flattenedScenes.push({
        sceneIndex,
        scene,
        isFlowItem: false
      });
    }
  });

  // Determine current section based on visibility
  const determineCurrentSection = useCallback(() => {
    if (!containerRef.current) return 0;

    const container = containerRef.current;
    const sections = sectionsRef.current;

    if (!sections.length) return 0;

    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;
    const containerHeight = containerRect.height;

    let bestIndex = 0;
    let bestVisibleProportion = 0;

    sections.forEach((section, index) => {
      if (!section) return;

      const sectionRect = section.getBoundingClientRect();
      const sectionTop = sectionRect.top;
      const sectionHeight = sectionRect.height;

      // Calculate visible portion
      const visibleTop = Math.max(containerTop, sectionTop);
      const visibleBottom = Math.min(containerTop + containerHeight, sectionTop + sectionHeight);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      const visibleProportion = visibleHeight / sectionHeight;

      // Must be a simple majority (>0.5) to be considered current
      if (visibleProportion > 0.5 && visibleProportion > bestVisibleProportion) {
        bestIndex = index;
        bestVisibleProportion = visibleProportion;
      }
    });

    return bestIndex;
  }, []);

  // Check DOM level locks for a section
  const checkDOMLocks = useCallback((sectionIndex: number) => {
    const section = sectionsRef.current[sectionIndex];
    if (!section) return { forward: false, backward: false };

    // Check the section itself
    const sectionForward = section.getAttribute('data-lock-forward') === 'true';
    const sectionBackward = section.getAttribute('data-lock-backward') === 'true';

    // Check all descendants
    const forwardElements = section.querySelectorAll('[data-lock-forward="true"]');
    const backwardElements = section.querySelectorAll('[data-lock-backward="true"]');

    return {
      forward: sectionForward || forwardElements.length > 0,
      backward: sectionBackward || backwardElements.length > 0
    };
  }, []);

  // Check content level locks for a section
  const checkContentLocks = useCallback((sectionIndex: number) => {
    const item = flattenedScenes[sectionIndex];
    if (!item) return { forward: false, backward: false };

    let forward = false;
    let backward = false;

    if (item.isFlowItem && item.flowItem) {
      // Flow item locks
      forward = item.flowItem.waiting || item.flowItem.lockForward || false;
      backward = item.flowItem.lockBackward || false;
    } else {
      // Scene locks
      forward = item.scene.lockForward || false;
      backward = item.scene.lockBackward || false;
    }

    return { forward, backward };
  }, [flattenedScenes]);

  // Compute combined locks for current section
  const computeLocks = useCallback(() => {
    const contentLocks = checkContentLocks(currentSectionIndex);
    const domLocks = checkDOMLocks(currentSectionIndex);

    const forward = contentLocks.forward || domLocks.forward;
    const backward = contentLocks.backward || domLocks.backward;

    let reason = '';
    if (forward || backward) {
      const reasons = [];
      if (contentLocks.forward) reasons.push('content-forward');
      if (contentLocks.backward) reasons.push('content-backward');
      if (domLocks.forward) reasons.push('dom-forward');
      if (domLocks.backward) reasons.push('dom-backward');
      reason = reasons.join(', ');
    }

    return { forward, backward, reason };
  }, [currentSectionIndex, checkContentLocks, checkDOMLocks]);

  // Update current section and locks
  const updateCurrentSection = useCallback(() => {
    const newIndex = determineCurrentSection();
    if (newIndex !== currentSectionIndex) {
      setCurrentSectionIndex(newIndex);
    }
  }, [currentSectionIndex, determineCurrentSection]);

  // Snap to a specific section
  const snapToSection = useCallback((index: number) => {
    const section = sectionsRef.current[index];
    if (!section || !containerRef.current) return;

    animatingRef.current = true;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Clear animation flag after scroll completes
    setTimeout(() => {
      animatingRef.current = false;
    }, 500);
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (animatingRef.current) return;
    updateCurrentSection();
  }, [updateCurrentSection]);

  // Handle wheel events
  const handleWheel = useCallback((e: WheelEvent) => {
    if (animatingRef.current) {
      e.preventDefault();
      return;
    }

    const isForward = e.deltaY > 0;
    const isBackward = e.deltaY < 0;

    if ((isForward && locks.forward) || (isBackward && locks.backward)) {
      e.preventDefault();
      e.stopPropagation();
      wheelAccumRef.current = 0;


      // Snap back to current section
      snapToSection(currentSectionIndex);
      return;
    }

    // Accumulate wheel delta
    wheelAccumRef.current += e.deltaY;
    const threshold = 60;

    if (wheelAccumRef.current > threshold) {
      e.preventDefault();
      wheelAccumRef.current = 0;
      const nextIndex = Math.min(currentSectionIndex + 1, flattenedScenes.length - 1);
      if (nextIndex !== currentSectionIndex) {
        snapToSection(nextIndex);
      }
    } else if (wheelAccumRef.current < -threshold) {
      e.preventDefault();
      wheelAccumRef.current = 0;
      const prevIndex = Math.max(currentSectionIndex - 1, 0);
      if (prevIndex !== currentSectionIndex) {
        snapToSection(prevIndex);
      }
    }
  }, [locks, currentSectionIndex, flattenedScenes.length, snapToSection]);

  // Handle touch events
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (animatingRef.current) {
      e.preventDefault();
      return;
    }

    const deltaY = touchStartYRef.current - e.touches[0].clientY;
    const threshold = 50;

    if (Math.abs(deltaY) > threshold) {
      const isForward = deltaY > 0;
      const isBackward = deltaY < 0;

      if ((isForward && locks.forward) || (isBackward && locks.backward)) {
        e.preventDefault();
        e.stopPropagation();


        // Snap back to current section
        snapToSection(currentSectionIndex);
        return;
      }

      e.preventDefault();
      const nextIndex = isForward
        ? Math.min(currentSectionIndex + 1, flattenedScenes.length - 1)
        : Math.max(currentSectionIndex - 1, 0);

      if (nextIndex !== currentSectionIndex) {
        snapToSection(nextIndex);
      }
    }
  }, [locks, currentSectionIndex, flattenedScenes.length, snapToSection]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (animatingRef.current) return;

    const forwardKeys = ['ArrowDown', 'PageDown', ' '];
    const backwardKeys = ['ArrowUp', 'PageUp'];

    const isForward = forwardKeys.includes(e.key) && !e.shiftKey;
    const isBackward = backwardKeys.includes(e.key) || (e.key === ' ' && e.shiftKey);

    if (!isForward && !isBackward) return;

    if ((isForward && locks.forward) || (isBackward && locks.backward)) {
      e.preventDefault();
      e.stopPropagation();


      // Snap back to current section
      snapToSection(currentSectionIndex);
      return;
    }

    e.preventDefault();
    const nextIndex = isForward
      ? Math.min(currentSectionIndex + 1, flattenedScenes.length - 1)
      : Math.max(currentSectionIndex - 1, 0);

    if (nextIndex !== currentSectionIndex) {
      snapToSection(nextIndex);
    }
  }, [locks, currentSectionIndex, flattenedScenes.length, snapToSection]);

  // Update locks when current section or content changes
  useEffect(() => {
    const newLocks = computeLocks();
    if (newLocks.forward !== locks.forward || newLocks.backward !== locks.backward) {
      setLocks(newLocks);
    }
  }, [currentSectionIndex, computeLocks, locks.forward, locks.backward]);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Make container focusable for keyboard events
    container.setAttribute('tabindex', '0');

    // Add event listeners
    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('keydown', handleKeyDown, { passive: false });

    // Focus container for keyboard events
    container.focus();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleScroll, handleWheel, handleTouchStart, handleTouchMove, handleKeyDown]);

  // Set up DOM mutation observer to detect lock attribute changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      // Recompute locks when DOM attributes change
      const newLocks = computeLocks();
      if (newLocks.forward !== locks.forward || newLocks.backward !== locks.backward) {
        setLocks(newLocks);
      }
    });

    observer.observe(container, {
      attributes: true,
      attributeFilter: ['data-lock-forward', 'data-lock-backward'],
      subtree: true
    });

    return () => observer.disconnect();
  }, [currentSectionIndex, computeLocks, locks.forward, locks.backward]);

  // Helper function to get section attributes based on content
  const getSectionAttributes = (item: typeof flattenedScenes[0], index: number) => {
    const attrs: Record<string, string> = {};

    // Add content-level locks as DOM attributes for consistency
    if (item.isFlowItem && item.flowItem) {
      if (item.flowItem.waiting || item.flowItem.lockForward) {
        attrs['data-lock-forward'] = 'true';
      }
      if (item.flowItem.lockBackward) {
        attrs['data-lock-backward'] = 'true';
      }
    } else {
      if (item.scene.lockForward) {
        attrs['data-lock-forward'] = 'true';
      }
      if (item.scene.lockBackward) {
        attrs['data-lock-backward'] = 'true';
      }
    }

    return attrs;
  };

  return (
    <div
      ref={containerRef}
      className="snap-scroll-container"
      style={{
        height: '100vh',
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        overscrollBehavior: 'contain',
        outline: 'none'
      }}
    >
      {flattenedScenes.map((item, index) => (
        <div
          key={index}
          ref={(el) => { if (el) sectionsRef.current[index] = el; }}
          className={`snap-scroll-section ${index === currentSectionIndex ? 'current' : ''}`}
          style={{
            scrollSnapAlign: 'start',
            scrollSnapStop: 'always'
          }}
          {...getSectionAttributes(item, index)}
        >
          <div className="snap-scroll-content">
            <h2>
              Scene {item.sceneIndex + 1}
              {item.isFlowItem && ` - Flow ${(item.flowIndex || 0) + 1}`}
              {index === currentSectionIndex && ' (CURRENT)'}
            </h2>

            <p><strong>Type:</strong> {item.scene.type}</p>

            {/* Lock status indicators */}
            {(locks.forward || locks.backward) && index === currentSectionIndex && (
              <div className="lock-status">
                <p><strong>🔒 LOCKS ACTIVE:</strong></p>
                {locks.forward && <p>Forward: BLOCKED</p>}
                {locks.backward && <p>Backward: BLOCKED</p>}
                <p><em>Reason: {locks.reason}</em></p>
              </div>
            )}

            {item.scene.background && (
              <p><strong>Background:</strong> {item.scene.background}</p>
            )}

            {item.scene.image && (
              <p><strong>Image:</strong> {item.scene.image}</p>
            )}

            {(item.scene['left-character'] || item.scene.leftCharacter) && (
              <p><strong>Left Character:</strong> {item.scene['left-character'] || item.scene.leftCharacter}</p>
            )}

            {(item.scene['right-character'] || item.scene.rightCharacter) && (
              <p><strong>Right Character:</strong> {item.scene['right-character'] || item.scene.rightCharacter}</p>
            )}

            {item.isFlowItem && item.flowItem && (
              <>
                {item.flowItem.waiting ? (
                  <div className="waiting-state">
                    <p><strong>⏳ WAITING STATE</strong></p>
                    <p>User interaction required</p>
                    <p><em>Forward scrolling locked</em></p>
                  </div>
                ) : (
                  <>
                    {item.flowItem.side && (
                      <p><strong>Speaker Side:</strong> {item.flowItem.side}</p>
                    )}
                    {item.flowItem.text && (
                      <p><strong>Text:</strong> {item.flowItem.text}</p>
                    )}
                  </>
                )}
              </>
            )}

            {!item.isFlowItem && (
              <>
                {item.scene.speaker && <p><strong>Speaker:</strong> {item.scene.speaker}</p>}
                {item.scene.text && <p><strong>Text:</strong> {item.scene.text}</p>}
                {item.scene.lvl1 && <p><strong>Title Level 1:</strong> {item.scene.lvl1}</p>}
                {item.scene.lvl2 && <p><strong>Title Level 2:</strong> {item.scene.lvl2}</p>}
                {item.scene.author && <p><strong>Author:</strong> {item.scene.author}</p>}
              </>
            )}

            {/* Test controls for DOM-level locks */}
            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              <p><strong>Test Controls:</strong></p>
              <button onClick={() => {
                const section = sectionsRef.current[index];
                if (section) {
                  section.setAttribute('data-lock-forward', 'true');
                }
              }}>
                Add DOM Forward Lock
              </button>
              <button onClick={() => {
                const section = sectionsRef.current[index];
                if (section) {
                  section.setAttribute('data-lock-backward', 'true');
                }
              }} style={{ marginLeft: '10px' }}>
                Add DOM Backward Lock
              </button>
              <button onClick={() => {
                const section = sectionsRef.current[index];
                if (section) {
                  section.removeAttribute('data-lock-forward');
                  section.removeAttribute('data-lock-backward');
                }
              }} style={{ marginLeft: '10px' }}>
                Clear DOM Locks
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SnapScroll;