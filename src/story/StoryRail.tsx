// src/story/StoryRail.tsx
import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { useStepScroll } from '../hooks/useStepScroll';

type Scene = { id: string; /* plus your fields */ };

export function StoryRail({ scenes }: { scenes: Scene[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // Ensure focus lands on the active scene for accessibility
  useLayoutEffect(() => {
    const el = containerRef.current;
    const node = el?.querySelectorAll<HTMLElement>('.scene')[index];
    node?.setAttribute('tabindex', '-1');
    node?.focus({ preventScroll: true });
  }, [index]);

  const getIndex = () => {
    const el = containerRef.current;
    if (!el) return 0;
    const y = el.scrollTop;
    let best = 0, bestDist = Infinity;
    const sections = el.querySelectorAll<HTMLElement>('.scene');
    sections.forEach((s, i) => {
      const dist = Math.abs(s.offsetTop - y);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return best;
  };

  const isInputFocused = () => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return false;
    const tag = a.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || a.isContentEditable;
  };

  useStepScroll(containerRef, {
    onIndexChange: (next) => setIndex(next),
    getIndex,
    count: () => scenes.length,
    durationMs: 380,
    thresholdPx: 60,
    isInputFocused,
  });

  return (
    <div
      ref={containerRef}
      className="story-scroll"
      tabIndex={0} // for key handlers on container
      style={{
        height: '100vh',
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
      }}
    >
      {scenes.map((s, i) => (
        <section
          key={s.id}
          className="scene"
          style={{
            minHeight: '100vh',
            scrollSnapAlign: 'start',
            scrollSnapStop: 'always', // the lock
            outline: 'none',
          }}
          aria-label={`Sentence ${i + 1} of ${scenes.length}`}
        >
          {/* your scene content */}
        </section>
      ))}
    </div>
  );
}