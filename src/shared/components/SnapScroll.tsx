import React, { useCallback, useEffect, useRef, useState } from 'react";
import './SnapScroll.css";

interface FlowItem {
  side?: 'left' | 'right";
  text?: string;
  waiting?: boolean;
  /** Guards: lock navigation until unlocked by app logic */
  lockForward?: boolean;   // prevent scrolling to next section
  lockBackward?: boolean;  // prevent scrolling to previous section
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
  /** Guards at the scene level (non-flow scenes) */
  lockForward?: boolean;
  lockBackward?: boolean;
}

interface SnapScrollProps {
  storyContent: StoryContentItem[];
}

const SnapScroll: React.FC<SnapScrollProps> = ({ storyContent }) => {
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

  // Track the current snapped section
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Helper to read lock flags for a flattened scene index
  const getLocksFor = useCallback((idx: number) => {
    const item = flattenedScenes[idx];
    if (!item) return { lockFwd: false, lockBack: false };

    // Flow items take precedence if present
    if (item.isFlowItem && item.flowItem) {
      const fi = item.flowItem;
      // "waiting" implies forward lock by default
      const lockFwd = fi.lockForward ?? fi.waiting ?? false;
      const lockBack = fi.lockBackward ?? false;
      return { lockFwd, lockBack };
    }

    // Regular scene-level locks
    const sc = item.scene;
    const lockFwd = sc.lockForward ?? false;
    const lockBack = sc.lockBackward ?? false;
    return { lockFwd, lockBack };
  }, [flattenedScenes]);

  const { lockFwd, lockBack } = getLocksFor(currentIndex);

  // Keep sectionRefs length in sync
  sectionRefs.current = sectionRefs.current.slice(0, flattenedScenes.length);

  // Observe which section is currently in view (snapped)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible section
        let bestIdx = currentIndex;
        let bestRatio = 0;
        for (const entry of entries) {
          const idxAttr = (entry.target as HTMLElement).dataset.index;
          const idx = idxAttr ? parseInt(idxAttr, 10) : NaN;
          if (!Number.isNaN(idx) && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIdx = idx;
          }
        }
        if (bestIdx !== currentIndex) setCurrentIndex(bestIdx);
      },
      {
        root: container,
        threshold: [0.51] // majority visible counts as current
      }
    );

    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [flattenedScenes.length, currentIndex]);

  // Utility to snap back to the current section if a move is blocked
  const snapToCurrent = useCallback(() => {
    const el = sectionRefs.current[currentIndex];
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [currentIndex]);

  // Wheel/touch/key guards (block forward/back based on delta/signals)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Wheel
    const onWheel = (e: WheelEvent) => {
      // If passive, preventDefault won't work; ensure we add listener as non-passive below
      const dy = e.deltaY;
      if ((dy > 0 && lockFwd) || (dy < 0 && lockBack)) {
        e.preventDefault();
        snapToCurrent();
      }
    };

    // Keyboard (space/pg/arrow)
    const onKeyDown = (e: KeyboardEvent) => {
      const forwardKeys = new Set([' ', 'PageDown', 'ArrowDown']);
      const backwardKeys = new Set(['PageUp', 'ArrowUp']);
      if ((forwardKeys.has(e.key) && lockFwd) || (backwardKeys.has(e.key) && lockBack)) {
        e.preventDefault();
        snapToCurrent();
      }
    };

    // Touch (simple swipe guard)
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dy = (e.touches[0]?.clientY ?? 0) - touchStartY;
      // dy < 0 means swipe up (attempt forward); dy > 0 swipe down (attempt back)
      if ((dy < -8 && lockFwd) || (dy > 8 && lockBack)) {
        e.preventDefault();
        snapToCurrent();
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('keydown', onKeyDown);
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('touchstart', onTouchStart as any);
      container.removeEventListener('touchmove', onTouchMove as any);
    };
  }, [lockFwd, lockBack, snapToCurrent, currentIndex]);

  // Public helpers (example): programmatic unlock could be exposed later
  // e.g., call setCurrentIndex(i) and scrollIntoView when a guard is cleared.

  return (
    <div
      className="snap-scroll-container"
      ref={containerRef}
      tabIndex={0}              // enable keyboard events
      style={{ outline: 'none' }} // avoid default focus ring
    >
      {flattenedScenes.map((item, index) => (
        <div
          key={index}
          className="snap-scroll-section"
          ref={(el) => (sectionRefs.current[index] = el)}
          data-index={index}
          style={{ scrollSnapStop: 'always' }}
        >
          <div className="snap-scroll-content">
            <h2>
              Scene {item.sceneIndex + 1}
              {item.isFlowItem && ` - Flow ${(item.flowIndex || 0) + 1}`}
            </h2>

            <p><strong>Type:</strong> {item.scene.type}</p>

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
          </div>
        </div>
      ))}
    </div>
  );
};

export default SnapScroll;