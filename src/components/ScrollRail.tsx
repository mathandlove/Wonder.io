/**
 * ScrollRail - Invisible scroll capture layer with native CSS snap behavior
 *
 * Renders a transparent, absolute-positioned scroll container that owns native scrolling
 * and creates one 100vh target per scene. This is the single source of scroll events.
 */
import React, { forwardRef } from 'react';
import './SnapScroll.css';

type ScrollRailProps = {
  sceneCount: number;
  targetsClassName?: string;    // default 'story-scroll-target'
  containerClassName?: string;  // default 'story-scroll-targets'
};

export const ScrollRail = forwardRef<HTMLDivElement, ScrollRailProps>(
  ({ sceneCount, targetsClassName = 'story-scroll-target', containerClassName = 'story-scroll-targets' }, ref) => {
    return (
      <div ref={ref} className={containerClassName} aria-label="Invisible scroll rail">
        {Array.from({ length: sceneCount }).map((_, i) => (
          <div key={i} className={targetsClassName} data-rail-index={i} />
        ))}
      </div>
    );
  }
);

ScrollRail.displayName = 'ScrollRail';