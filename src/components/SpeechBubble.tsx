import React from 'react';

interface SpeechBubbleProps {
  side: 'left' | 'right';
  speech: string;
  character: string;
  isActive: boolean;
  activeInput?: { userInput: string } | null;
  isWaiting?: boolean;
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({ 
  side, 
  speech, 
  character, 
  isActive,
  activeInput,
  isWaiting = false
}) => {
  // Use saved user input if this is Leo speaking and we have input
  const displayText = (side === 'left' && character === 'leo' && activeInput) 
    ? activeInput.userInput 
    : speech;

  const bubbleClass = `story-speech-bubble${side === 'right' ? '-right' : '-left'} ${
    isActive ? 'story-bubble-snap-in' : 'story-bubble-hidden'
  } ${isWaiting ? 'story-bubble-waiting' : ''}`;

  const tailClass = `story-speech-tail${side === 'right' ? '-right' : '-left'}`;

  return (
    <div className={bubbleClass}>
      <div className={tailClass}></div>
      <p>
        {isWaiting ? (
          <span className="story-thinking-dots">
            <span className="dot">.</span>
            <span className="dot">.</span>
            <span className="dot">.</span>
          </span>
        ) : (
          displayText
        )}
      </p>
    </div>
  );
};

export default SpeechBubble;