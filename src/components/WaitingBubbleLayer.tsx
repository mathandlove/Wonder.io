import React, { useMemo } from 'react';
import { WaitingBubble } from './WaitingBubble';
import type { Scene } from '../types/scene';

interface BubbleState {
  shouldShow: boolean;
  anchorIndex: number;
  character: string;
  message: string;
  isWaiting: boolean;
}

interface WaitingBubbleLayerProps {
  currentItem: number;
  scrollOffset: number;
  storyContent: Scene[];
  receivedMessages: { [key: number]: string };
  activeInput: boolean;
  containerClass: string;
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
        character: (current as any).rightCharacter || 'bakerMom',
        message: receivedMessages[currentItem] || "Waiting.",
        isWaiting: !receivedMessages[currentItem] || receivedMessages[currentItem] === ""
      };
    }

    // Case 2: Next scene is waiting and we're close to it
    if (next?.type === 'waiting' && scrollOffset > 0.7) {
      return {
        shouldShow: true,
        anchorIndex: currentItem + 1,
        character: (next as any).rightCharacter || 'bakerMom',
        message: receivedMessages[currentItem + 1] || "Waiting.",
        isWaiting: !receivedMessages[currentItem + 1] || receivedMessages[currentItem + 1] === ""
      };
    }

    // Case 3: Active input - show waiting bubble for AI response
    if (activeInput) {
      return {
        shouldShow: true,
        anchorIndex: currentItem,
        character: 'bakerMom', // Default AI character
        message: "Thinking...",
        isWaiting: true
      };
    }

    return {
      shouldShow: false,
      anchorIndex: 0,
      character: '',
      message: '',
      isWaiting: false
    };
  }, [currentItem, storyContent, receivedMessages, scrollOffset, activeInput]);

  if (!bubbleState.shouldShow) return null;

  // Calculate transform based on anchor scene
  const anchorOffset = (bubbleState.anchorIndex - currentItem) * 100;
  const totalOffset = anchorOffset - scrollOffset * 100;

  return (
    <div
      className={`story-waiting-bubble-container ${containerClass}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 25, // Above content but below panels
        transform: `translateY(${totalOffset}vh)`
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '25vh', // Match speech bubble positioning
          right: '28px', // 10px from right panel + 18px margin
          maxWidth: '500px'
        }}
      >
        <WaitingBubble
          side="right"
          speakerLabel={bubbleState.character}
          isDelayed={false}
          isReady={true}
        />
      </div>
    </div>
  );
};

export default WaitingBubbleLayer;