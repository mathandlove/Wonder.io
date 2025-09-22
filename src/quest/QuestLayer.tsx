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
  const { accept } = useQuest();

  // Debug logging
  if (currentQuest && typeof currentQuest.text === 'object') {
    console.error('[QuestLayer] Quest text is malformed object:', currentQuest);
  }

  // Render nothing unless quest is offered or minimized
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
        <div className="guild-box-holder">
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

      {/* Minimized: Top right badge */}
      {phase === 'minimized' && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(76, 175, 80, 0.9)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          backdropFilter: 'blur(5px)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          pointerEvents: 'auto',
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title={(() => {
          const text = currentQuest?.text || 'Active quest';
          return typeof text === 'object' ? 'Active quest' : String(text);
        })()}
        >
          🎯 {(() => {
            const text = currentQuest?.title || currentQuest?.id || 'Quest';
            return typeof text === 'object' ? 'Quest' : String(text);
          })()}
        </div>
      )}
    </div>
  );
}