/**
 * UIOverlayRoot - Container for all UI overlays (quests, dialogs, etc.)
 */
import { QuestLayer } from '@features/quest/QuestLayer';
import { ChatComposer } from '@features/chat/ChatComposer';
import { useDialogue } from '@features/chat/context/useChatDialogue';
import { useSceneManager } from '@core/scenes/SceneManager';
import { useState } from 'react';

export function UIOverlayRoot() {
  const { isPlayerTurn, waiting, questState } = useDialogue();
  const { goToNext } = useSceneManager();
  const [exitingChat, setExitingChat] = useState(false);

  const handleContinue = () => {
    setExitingChat(true);
    // Animate out, then navigate
    setTimeout(() => {
      goToNext();
      setExitingChat(false);
    }, 600); // Match animation duration
  };

  return (
    <>
      {/* Quest system overlay */}
      <QuestLayer />

      {/* Chat composer - always visible and independent */}
      <div className={`chat-composer-container ${exitingChat ? 'exit-bottom' : ''}`}>
        <ChatComposer
          disabled={!isPlayerTurn || waiting}
          questState={questState}
          onNext={handleContinue}
        />
      </div>

      {/* Future overlays can be added here */}
    </>
  );
}