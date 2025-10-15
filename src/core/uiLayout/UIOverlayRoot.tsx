/**
 * UIOverlayRoot - Container for all UI overlays (quests, dialogs, etc.)
 */
import { QuestLayer } from '@features/quest/QuestLayer';
import { RecordingOrchestrator } from '@core/recording/RecordPanelOrchestrator';
import { useSceneManager } from '@core/scenes/SceneManager';

export function UIOverlayRoot() {
  const { navigationArray, navigationIndex } = useSceneManager();

  // Check if current scene should show recording panel
  // Show for: show-quest (quest offer), input-showInput (ready to record), input-recording (actively recording), show-hint (hint display), record-answer (answer recording), ai-waiting (waiting for response)
  const currentNavItem = navigationArray[navigationIndex];
  const dialogueState = currentNavItem?.sceneState.type === 'dialogue' ? currentNavItem.sceneState.state : null;
  const shouldShowRecordPanel =
    dialogueState === 'show-quest' ||
    dialogueState === 'input-showInput' ||
    dialogueState === 'input-recording' ||
    dialogueState === 'show-hint' ||
    dialogueState === 'record-answer' ||
    dialogueState === 'ai-waiting';

  // Debug logging
  console.log('🎭 UIOverlayRoot render:', {
    navigationIndex,
    currentNavItem: currentNavItem ? {
      sceneType: currentNavItem.scene.type,
      stateType: currentNavItem.sceneState.type,
      state: (currentNavItem.sceneState as any).state
    } : null,
    shouldShowRecordPanel
  });

  return (
    <>
      {/* Quest system overlay */}
      <QuestLayer />

      {/* Recording panel - shows entire chat rail on input-showInput scenes */}
      {shouldShowRecordPanel && <RecordingOrchestrator />}

      {/* Future overlays can be added here */}
    </>
  );
}