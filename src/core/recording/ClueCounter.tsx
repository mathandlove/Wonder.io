/**
 * ClueCounter - Visual clue tracking panel
 *
 * Displays a grid of clue thumbnails showing:
 * - Question marks for unfound clues
 * - Pre-made thumbnail images for found clues
 * - Animated reveal when a clue is discovered
 * - Continue button that enables when all clues are found
 */
import { useEffect, useState } from 'react';
import type { Hotspot } from '@core/data/hotspotLoader';
import './ClueCounter.css';

export interface ClueCounterState {
  hotspots: Hotspot[];
  foundClues: string[];
  totalClues: number;
  coloredImageSrc: string;
}

interface ClueCounterProps {
  state: ClueCounterState;
  onContinue: () => void;
  disabled?: boolean;
}

/**
 * Individual clue thumbnail
 */
interface ClueThumbnailProps {
  hotspot: Hotspot;
  isFound: boolean;
  coloredImageSrc: string;
  animateReveal: boolean;
}

function ClueThumbnail({ hotspot, isFound, coloredImageSrc, animateReveal }: ClueThumbnailProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (isFound && animateReveal) {
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        setShouldAnimate(true);
      });
    }
  }, [isFound, animateReveal]);

  // Build thumbnail path from hotspot label
  // coloredImageSrc is like: /stories/gingerbread.bundle/images/cluesColored/insideBakery.png
  // We want: /stories/gingerbread.bundle/images/hotspots/insideBakery/{label}.png
  const imageName = coloredImageSrc.split('/').pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '';
  const thumbnailSrc = coloredImageSrc.replace(
    /cluesColored\/[^/]+\.png$/i,
    `hotspots/${imageName}/${hotspot.label.toLowerCase()}.png`
  );

  return (
    <div
      className={`frame ${isFound ? 'frame--found' : ''} ${shouldAnimate ? 'frame--animate' : ''}`}
    >
      {isFound ? (
        <img
          src={thumbnailSrc}
          alt={hotspot.label}
          className="frame__image"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          onError={(e) => console.error(`[ClueThumbnail] Thumbnail failed to load for ${hotspot.label}:`, thumbnailSrc, e)}
        />
      ) : (
        <img
          src="/VisualAssets/questionMark.png"
          alt="Undiscovered clue"
          className="frame__question-mark"
        />
      )}
    </div>
  );
}

export function ClueCounter({ state, onContinue, disabled = false }: ClueCounterProps) {
  const [lastFoundCount, setLastFoundCount] = useState(state.foundClues.length);
  const isComplete = state.foundClues.length === state.totalClues;
  const continueEnabled = isComplete && !disabled;

  // Track newly found clues for animation
  const [recentlyFound, setRecentlyFound] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (state.foundClues.length > lastFoundCount) {
      // Find the new clues
      const newClues = state.foundClues.filter(
        clue => !recentlyFound.has(clue) && state.foundClues.length > lastFoundCount
      );
      setRecentlyFound(new Set([...recentlyFound, ...newClues]));
      setLastFoundCount(state.foundClues.length);

      // Clear animation flag after animation completes (500ms)
      setTimeout(() => {
        setRecentlyFound(new Set());
      }, 500);
    }
  }, [state.foundClues, lastFoundCount, recentlyFound]);

  return (
    <div className="clues-panel">
      <div className="whiteframe">
        {/* Clues header with count */}
        <div className="clues">
          <span className="clues__title">Clues</span>
          <span className="clues__count">{state.foundClues.length} / {state.totalClues}</span>
        </div>

        {/* Clue image holder - grid of thumbnails */}
        <div className="clue-image-holder">
          {state.hotspots.map((hotspot) => {
            const isFound = state.foundClues.includes(hotspot.label);
            const animateReveal = recentlyFound.has(hotspot.label);

            return (
              <ClueThumbnail
                key={hotspot.id}
                hotspot={hotspot}
                isFound={isFound}
                coloredImageSrc={state.coloredImageSrc}
                animateReveal={animateReveal}
              />
            );
          })}
        </div>

        {/* Continue button */}
        <button
          className={`button ${continueEnabled ? 'button--enabled' : ''}`}
          onClick={onContinue}
          disabled={!continueEnabled}
        >
          <div className="answer">Continue</div>
          {!continueEnabled && (
            <img src="/VisualAssets/lock.png" alt="" className="lock-image-overlay" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
