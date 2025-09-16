import React, { useMemo } from 'react';
import SpeechBubble from './SpeechBubble';

interface StoryContentItem {
  type: string;
  showWaitingBubble?: boolean;
  rightCharacter?: string;
}

interface WaitingBubbleLayerProps {
  currentItem: number;
  scrollOffset: number;
  storyContent: StoryContentItem[];
  receivedMessages: { [key: number]: string };
  activeInput: { prompt: string; userInput: string } | null;
  containerClass: string;
}

interface BubbleState {
  shouldShow: boolean;
  anchorIndex: number;
  character: string;
  message: string;
  isWaiting: boolean;
}

const WaitingBubbleLayer: React.FC<WaitingBubbleLayerProps> = ({
  currentItem,
  scrollOffset,
  storyContent,
  receivedMessages,
  activeInput,
  containerClass,
}) => {
  // Determine bubble state in a single calculation
  const bubbleState = useMemo((): BubbleState => {
    const current = storyContent[currentItem];
    const next = storyContent[currentItem + 1];

    // Case 1: Current scene is waiting
    if (current?.type === 'waiting') {
      return {
        shouldShow: true,
        anchorIndex: currentItem,
        character: current.rightCharacter || 'bakerMom',
        message: receivedMessages[currentItem] || "Waiting.",
        isWaiting: !receivedMessages[currentItem] || receivedMessages[currentItem] === ""
      };
    }

    // Case 2: Current scene shows waiting bubble and next is waiting
    if (current?.showWaitingBubble && next?.type === 'waiting') {
      const nextIndex = currentItem + 1;
      return {
        shouldShow: true,
        anchorIndex: nextIndex,
        character: next.rightCharacter || 'bakerMom',
        message: receivedMessages[nextIndex] || "Waiting.",
        isWaiting: !receivedMessages[nextIndex] || receivedMessages[nextIndex] === ""
      };
    }

    return { shouldShow: false, anchorIndex: -1, character: '', message: '', isWaiting: false };
  }, [currentItem, storyContent, receivedMessages]);

  // Calculate transform positioning - always called regardless of shouldShow
  const transform = useMemo(() => {
    const sceneTransform = (currentItem - scrollOffset) * 100;
    const constrainedTransform = Math.min(sceneTransform, 0);
    return `translateY(calc(${constrainedTransform}vh))`;
  }, [currentItem, scrollOffset]);

  // Early return after all hooks
  if (!bubbleState.shouldShow) {
    return null;
  }

  return (
    <div className={`story-waiting-bubble-layer ${containerClass}`}>
      <div
        className="story-waiting-bubble-item"
        style={{
          width: '100%',
          height: '100vh',
          position: 'absolute',
          top: 0,
          left: 0,
          transform,
          transition: 'transform 0.3s linear',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '20px',
            transform: 'translateY(calc(-50% + var(--anchor-offset-y, -30px) + var(--scene-bubble-height, 0px) / 2 + 20px))'
          }}
        >
          <SpeechBubble
            side="right"
            speech={bubbleState.message}
            character={bubbleState.character}
            isActive={true}
            activeInput={activeInput}
            isWaiting={bubbleState.isWaiting}
          />
        </div>
      </div>
    </div>
  );
};

export default WaitingBubbleLayer;