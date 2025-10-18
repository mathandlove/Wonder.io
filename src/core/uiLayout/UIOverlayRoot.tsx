/**
 * UIOverlayRoot - Container for all UI overlays (quests, dialogs, etc.)
 *
 * This is a simple presentational component that just renders orchestrators.
 * All visibility and state logic is handled by the orchestrators themselves.
 */
import { RecordingOrchestrator } from '@core/recording/RecordPanelOrchestrator';

export function UIOverlayRoot() {
  return (
    <>
      {/* Recording panel orchestrator - handles its own visibility logic */}
      <RecordingOrchestrator />

      {/* Future overlays can be added here */}
    </>
  );
}