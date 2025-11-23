/**
 * ClueSelectionPanel - Panel for selecting clues to ask about
 *
 * Displays:
 * - "Select a Clue to Ask About" header text at the top
 * - Grid of 4 clickable clue thumbnails at the bottom
 * - Same base styling as ClueCounter (cardboard panel with white frame)
 */
import type { ClueData } from '@core/data/ClueStore';
import { resolveStoryImage } from '@core/data/imageResolver';
import './ClueSelectionPanel.css';

interface ClueSelectionPanelProps {
  clues: ClueData[];
  onClueSelect: (label: string) => void;
}

/**
 * Individual clue thumbnail - clickable
 */
interface ClueThumbnailProps {
  clue: ClueData;
  onClick: () => void;
}

function ClueThumbnail({ clue, onClick }: ClueThumbnailProps) {
  // Build thumbnail path from clue data
  // clue.image is like "hair", "potion", etc.
  // clue.mapName is like "insideBakery"
  // We want: /stories/{story}.bundle/images/hotspots/{mapName}/{image}.png
  const thumbnailSrc = clue.mapName
    ? resolveStoryImage(`hotspots/${clue.mapName}/${clue.image}.png`)
    : resolveStoryImage(`clues/${clue.image}.png`); // fallback

  return (
    <div className="selection-frame" onClick={onClick}>
      <img
        src={thumbnailSrc}
        alt={clue.hotspotName}
        className="selection-frame__image"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        onError={(e) => console.error(`[ClueSelectionPanel] Thumbnail failed to load for ${clue.hotspotName}:`, thumbnailSrc, e)}
      />
    </div>
  );
}

export function ClueSelectionPanel({ clues, onClueSelect }: ClueSelectionPanelProps) {
  return (
    <div className="clue-selection-content">
      {/* Clue thumbnail grid */}
      <div className="selection-clue-holder">
        {clues.map((clue) => (
          <ClueThumbnail
            key={clue.hotspotName}
            clue={clue}
            onClick={() => onClueSelect(clue.hotspotName)}
          />
        ))}
      </div>
    </div>
  );
}
