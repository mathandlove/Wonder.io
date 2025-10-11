/**
 * QuestLayer - Quest offer sheet and minimized HUD
 */
import { useQuestStatus, useQuest } from './QuestManager';
import './QuestLayer.css';

export interface QuestLayerProps {
  // Props can be added later
}

export function QuestLayer() {
  const { phase, currentQuest } = useQuestStatus();
  const { accept, clear } = useQuest();

  // Debug logging
  if (currentQuest && typeof currentQuest.text === 'object') {
    console.error('[QuestLayer] Quest text is malformed object:', currentQuest);
  }

  // Render nothing unless quest is active
  if (phase === 'idle' || !currentQuest) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      pointerEvents: 'none',
    }}>
      {/* Offered: Guild box with quest info */}
      {phase === 'offered' && (
        <div className="guild-box-holder" data-quest-phase="offered">
          <div className="quest-info">
            <h2 className="quest-title">Quest</h2>
            <p className="quest-text">
              {(() => {
                const text = currentQuest?.text || currentQuest?.title || currentQuest?.id || 'Unknown Quest';
                if (typeof text === 'object') {
                  console.error('Quest text is an object:', text);
                  return 'Quest Text Error';
                }
                return String(text);
              })()}
            </p>
            <button className="quest-accept-btn" onClick={accept}>
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Minimized: Pill box at bottom */}
      {phase === 'minimized' && (
        <div className={`quest-pill-box ${phase === 'minimized' ? 'quest-pill-enter' : ''}`}>
          <div className="quest-pill-text">
            {(() => {
              const text = currentQuest?.text || currentQuest?.title || currentQuest?.id || 'Quest Active';
              return typeof text === 'object' ? 'Quest Active' : String(text);
            })()}
          </div>
        </div>
      )}

      {/* Complete: Guild box with completion info */}
      {phase === 'complete' && (
        <>
          <div className="guild-box-holder quest-complete" data-quest-phase="complete">
            <div className="quest-info">
              <h2 className="quest-title">QUEST<br/>COMPLETE</h2>
              <p className="quest-text">
                {(() => {
                  const text = currentQuest?.text || currentQuest?.title || currentQuest?.id || 'Quest Completed';
                  if (typeof text === 'object') {
                    console.error('Quest text is an object:', text);
                    return 'Quest Completed';
                  }
                  return String(text);
                })()}
              </p>
            </div>
            <div className="quest-seal-stamp">
              <img src="/VisualAssets/seal.png" alt="Complete Seal" className="quest-seal-image" />
            </div>
          </div>
          <video
            className="quest-hand-stamp-video"
            src="/VisualAssets/hand-stamp.webm"
            autoPlay
            muted
            playsInline
            onTimeUpdate={(e) => {
              const video = e.target as HTMLVideoElement;
              // Show seal at halfway point
              if (video.currentTime >= video.duration / 2) {
                const seal = document.querySelector('.quest-seal-stamp') as HTMLElement;
                if (seal && !seal.classList.contains('stamp-visible')) {
                  seal.classList.add('stamp-visible');
                }
              }
            }}
            onEnded={(e) => {
              // Hide video and trigger clear state after 2 seconds
              (e.target as HTMLVideoElement).style.display = 'none';
              setTimeout(() => {
                clear();
              }, 2000);
            }}
          />
        </>
      )}

      {/* Clear: Guild box and stamp floating away */}
      {phase === 'clear' && (
        <div className="guild-box-holder quest-clear" data-quest-phase="clear">
          <div className="quest-info">
            <h2 className="quest-title">QUEST<br/>COMPLETE</h2>
            <p className="quest-text">
              {(() => {
                const text = currentQuest?.text || currentQuest?.title || currentQuest?.id || 'Quest Completed';
                if (typeof text === 'object') {
                  console.error('Quest text is an object:', text);
                  return 'Quest Completed';
                }
                return String(text);
              })()}
            </p>
          </div>
          <div className="quest-seal-stamp stamp-visible">
            <img src="/VisualAssets/seal.png" alt="Complete Seal" className="quest-seal-image" />
          </div>
        </div>
      )}
    </div>
  );
}