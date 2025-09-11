import React from 'react';

interface SpeechBubbleProps {
  side: 'left' | 'right';
  speech: string;
  character: string;
  isActive: boolean;
  activeInput?: { userInput: string } | null;
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({ 
  side, 
  speech, 
  character, 
  isActive,
  activeInput 
}) => {
  // Use saved user input if this is Leo speaking and we have input
  const displayText = (side === 'left' && character === 'leo' && activeInput) 
    ? activeInput.userInput 
    : speech;

  const bubbleClass = `story-speech-bubble${side === 'right' ? '-right' : '-left'} ${
    isActive ? 'story-bubble-snap-in' : 'story-bubble-hidden'
  }`;

  const tailClass = `story-speech-tail${side === 'right' ? '-right' : '-left'}`;

  return (
    <div className={bubbleClass}>
      <div className={tailClass}></div>
      <p>{displayText}</p>
    </div>
  );
};

export default SpeechBubble;