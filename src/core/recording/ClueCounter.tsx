/**
 * ClueCounter - Visual clue tracking panel
 *
 * Displays a grid of clue thumbnails showing:
 * - Question marks for unfound clues
 * - Miniature colored images for found clues
 * - Animated reveal when a clue is discovered
 * - Continue button that enables when all clues are found
 */
import { useEffect, useState, useRef } from 'react';
import type { Hotspot } from '@core/data/hotspotLoader';
import { calculateImageBounds } from '@shared/utils/coordinateUtils';
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
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const [cropPosition, setCropPosition] = useState({ x: 50, y: 50 }); // objectPosition values
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isFound && animateReveal) {
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        setShouldAnimate(true);
      });
    }
  }, [isFound, animateReveal]);

  // Strategy: Crop image to show only the hotspot region, fitted in 200×200px
  // Use variable thumbnail size for future flexibility

  const THUMBNAIL_SIZE = 200; // Variable for easy adjustment

  // Calculate hotspot bounding box from polygon points
  // hotspot.x, hotspot.y, hotspot.width, hotspot.height are already the bounding box!
  const hotspotBounds = {
    x: hotspot.x,           // Left edge (percentage)
    y: hotspot.y,           // Top edge (percentage)
    width: hotspot.width,   // Width (percentage)
    height: hotspot.height  // Height (percentage)
  };

  const handleImageLoad = () => {
    if (imgRef.current) {
      const natural = {
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight
      };

      // Step 1: Calculate hotspot dimensions in pixels
      const hotspotPixelWidth = (hotspotBounds.width / 100) * natural.width;
      const hotspotPixelHeight = (hotspotBounds.height / 100) * natural.height;

      // Step 2: Calculate scale to make hotspot fill the 200×200 frame
      // Use Math.max so hotspot fills the space (one dimension will fill, other may exceed)
      const scaleToFitWidth = THUMBNAIL_SIZE / hotspotPixelWidth;
      const scaleToFitHeight = THUMBNAIL_SIZE / hotspotPixelHeight;
      const scale = Math.max(scaleToFitWidth, scaleToFitHeight);

      // Step 3: Calculate full image dimensions at this scale
      const scaledImageWidth = natural.width * scale;
      const scaledImageHeight = natural.height * scale;

      // Step 4: Calculate where the hotspot is positioned in the scaled image
      const hotspotLeftPx = (hotspotBounds.x / 100) * scaledImageWidth;
      const hotspotTopPx = (hotspotBounds.y / 100) * scaledImageHeight;
      const scaledHotspotWidth = hotspotPixelWidth * scale;
      const scaledHotspotHeight = hotspotPixelHeight * scale;

      // Step 5: Calculate offset to center the hotspot in the 200×200 frame
      // We want the hotspot center to align with the frame center
      const hotspotCenterX = hotspotLeftPx + (scaledHotspotWidth / 2);
      const hotspotCenterY = hotspotTopPx + (scaledHotspotHeight / 2);
      const frameCenterX = THUMBNAIL_SIZE / 2;
      const frameCenterY = THUMBNAIL_SIZE / 2;

      const offsetLeft = frameCenterX - hotspotCenterX;
      const offsetTop = frameCenterY - hotspotCenterY;

      const bounds = {
        width: scaledImageWidth,
        height: scaledImageHeight,
        left: offsetLeft,
        top: offsetTop
      };

      setImageBounds(bounds);

      console.log(`[ClueThumbnail] ${hotspot.label}:`, {
        natural,
        hotspotBounds,
        hotspotPixelDimensions: { width: hotspotPixelWidth.toFixed(1), height: hotspotPixelHeight.toFixed(1) },
        scale: scale.toFixed(3),
        scaledImageSize: { width: scaledImageWidth.toFixed(1), height: scaledImageHeight.toFixed(1) },
        hotspotInScaledImage: { left: hotspotLeftPx.toFixed(1), top: hotspotTopPx.toFixed(1), width: scaledHotspotWidth.toFixed(1), height: scaledHotspotHeight.toFixed(1) },
        offset: { left: offsetLeft.toFixed(1), top: offsetTop.toFixed(1) }
      });
    }
  };

  // Build clip-path from hotspot polygon points
  // For the IMAGE: use original coordinates (0-100% of full image)
  const imageClipPathPoints = hotspot.points
    .map(p => `${p.x}% ${p.y}%`)
    .join(', ');
  const imageClipPath = `polygon(${imageClipPathPoints})`;

  // For the OVERLAY: remap coordinates from full-image space to hotspot-region space
  // Formula: x_new = (x_old - hotspotBounds.x) / hotspotBounds.width * 100
  const remappedPoints = hotspot.points.map(p => ({
    x: ((p.x - hotspotBounds.x) / hotspotBounds.width) * 100,
    y: ((p.y - hotspotBounds.y) / hotspotBounds.height) * 100
  }));

  const overlayClipPathPoints = remappedPoints
    .map(p => `${p.x}% ${p.y}%`)
    .join(', ');
  const overlayClipPath = `polygon(${overlayClipPathPoints})`;

  return (
    <div
      className={`frame ${isFound ? 'frame--found' : ''} ${shouldAnimate ? 'frame--animate' : ''}`}
    >
      {isFound ? (
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Hotspot region of colored image - scaled, positioned, and cropped */}
          <img
            ref={imgRef}
            src={coloredImageSrc}
            alt={hotspot.label}
            className="frame__image"
            style={{
              position: 'absolute',
              width: `${imageBounds.width}px`,
              height: `${imageBounds.height}px`,
              left: `${imageBounds.left}px`,
              top: `${imageBounds.top}px`,
              clipPath: imageClipPath, // Crop image to hotspot polygon
              objectFit: 'fill', // Fill the calculated dimensions
            }}
            onLoad={handleImageLoad}
            onError={(e) => console.error(`[ClueThumbnail] Image failed to load for ${hotspot.label}:`, e)}
          />
          {/* Hotspot overlay at 50% opacity - positioned to match image bounds */}
          {imageBounds.width > 0 && (
            <div
              style={{
                position: 'absolute',
                width: `${imageBounds.width}px`,
                height: `${imageBounds.height}px`,
                left: `${imageBounds.left}px`,
                top: `${imageBounds.top}px`,
                backgroundColor: 'rgba(255, 193, 7, 0.5)', // Amber/gold highlight at 50% alpha
                clipPath: imageClipPath, // Use same clip-path as image
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
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
          Clues
          <br />
          {state.foundClues.length} / {state.totalClues}
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
          {continueEnabled ? (
            <div className="answer">Continue</div>
          ) : (
            <>
              <span className="answer-locked">CONTINUE</span>
              <img src="/VisualAssets/lock.png" alt="" className="lock-image-overlay" aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
