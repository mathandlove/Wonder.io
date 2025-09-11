import React from 'react';

interface QuestDialogProps {
  quest: {
    text: string;
    type: string;
    state: 'center' | 'top' | 'center-from-top' | 'exit-bottom';
  } | null;
}

const QuestDialog: React.FC<QuestDialogProps> = ({ quest }) => {
  if (!quest) {
    return null;
  }

  const getQuestClass = () => {
    switch (quest.state) {
      case 'top':
        return 'quest-move-to-top';
      case 'center-from-top':
        return 'quest-move-to-center';
      case 'exit-bottom':
        return 'quest-exit-bottom';
      case 'center':
      default:
        return 'quest-appear';
    }
  };

  return (
    <div className="story-quest-layer">
      <div className={`story-quest-container ${quest.type === 'key' ? 'quest-key' : ''} ${getQuestClass()}`}>
        <div className="story-quest-text">
          <div className="quest-label">QUEST</div>
          <div className="quest-description">{quest.text}</div>
        </div>
      </div>
    </div>
  );
};

export default QuestDialog;