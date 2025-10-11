/**
 * UIOverlayRoot - Container for all UI overlays (quests, dialogs, etc.)
 */
import { QuestLayer } from '@core/quest/QuestLayer";

export function UIOverlayRoot() {
  return (
    <>
      {/* Quest system overlay */}
      <QuestLayer />

      {/* Future overlays can be added here */}
    </>
  );
}