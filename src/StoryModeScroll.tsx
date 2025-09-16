import React, { useState, useRef, useCallback, useEffect } from 'react';
import './StoryModeScroll.css';
import CharacterPanel from './components/CharacterPanel';
import QuestDialog from './components/QuestDialog';
import InputPrompt from './components/InputPrompt';
import BackgroundLayer from './components/BackgroundLayer';
import ImageLayer from './components/ImageLayer';
import WaitingBubbleLayer from './components/WaitingBubbleLayer';
import StoryContentLayer from './components/StoryContentLayer';
import OverlayLayer from './components/OverlayLayer';
import { useKeyboardHandler } from './hooks/useKeyboardHandler';
import { useScrollHandler } from './hooks/useScrollHandler';
import { useBubbleHeightTracker } from './hooks/useBubbleHeightTracker';

interface CharacterState {
  panelState: 'hidden' | 'visible' | 'exiting';
  animating: boolean;
  progress: number;
  hasStartedAnimation: boolean;
  fullyExited: boolean;
  bounceComplete: boolean;
  currentCharacter: string | null;
}

const StoryModeScroll: React.FC = () => {
  const [currentItem, setCurrentItem] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [leftCharacter, setLeftCharacter] = useState<CharacterState>({
    panelState: 'hidden',
    animating: false,
    progress: 0,
    hasStartedAnimation: false,
    fullyExited: false,
    bounceComplete: false,
    currentCharacter: null
  });
  const [rightCharacter, setRightCharacter] = useState<CharacterState>({
    panelState: 'hidden',
    animating: false,
    progress: 0,
    hasStartedAnimation: false,
    fullyExited: false,
    bounceComplete: false,
    currentCharacter: null
  });
  const [previousItem, setPreviousItem] = useState(0);
  const [version] = useState(`v${Date.now()}`);
  interface StoryContentItem {
    type: string;
    showWaitingBubble?: boolean;
    side?: 'left' | 'right';
    speech?: string;
    rightCharacter?: string;
    leftCharacter?: string;
    title?: string;
    subtitle?: string;
    author?: string;
    text?: string;
    prompt?: string;
    background?: string;
    image?: string;
    isWaiting?: boolean;
    lvl1?: string;
    lvl2?: string;
    lvl3?: string;
    character?: string;
    questType?: string;
  }
  const [storyContent, setStoryContent] = useState<StoryContentItem[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0); // New state to drive all transforms
  const [activeQuest, setActiveQuest] = useState<{text: string, type: string, state: 'center' | 'top' | 'center-from-top' | 'exit-bottom'} | null>(null); // Track active quest
  const [activeInput, setActiveInput] = useState<{prompt: string, userInput: string} | null>(null); // Track active input prompt
  const [activeInputPrompt, setActiveInputPrompt] = useState<{prompt: string, state: 'center' | 'top' | 'exit-bottom'} | null>(null); // Track active input prompt dialog
  const [waitingBubbleAnchored, setWaitingBubbleAnchored] = useState(false); // Track if waiting bubble has been anchored to waiting scene
  const [receivedMessages, setReceivedMessages] = useState<{[key: number]: string}>({}); // Track received messages by scene index
  const [allowScrollDown, setAllowScrollDown] = useState(true); // Track if scrolling down is allowed
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const sceneBubbleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Helper function to update character state
  const updateCharacterState = useCallback((
    side: 'left' | 'right',
    updates: Partial<CharacterState>
  ) => {
    if (side === 'left') {
      setLeftCharacter(prev => ({ ...prev, ...updates }));
    } else {
      setRightCharacter(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // Helper function to animate character entrance
  const animateCharacterEntrance = useCallback((side: 'left' | 'right') => {
    updateCharacterState(side, { hasStartedAnimation: true, animating: true });

    let progress = 0;
    const animationInterval = setInterval(() => {
      progress += 10;
      updateCharacterState(side, { progress });
      if (progress >= 95) {
        clearInterval(animationInterval);
        updateCharacterState(side, { progress: 100, animating: false });
        setTimeout(() => {
          updateCharacterState(side, { bounceComplete: true });
        }, 1200);
      }
    }, 25);
  }, [updateCharacterState]);


  // Update character panel states based on current item
  useEffect(() => {
    if (!storyContent || storyContent.length === 0) return;

    const isScrollingUp = currentItem < previousItem;
    const currentContent = storyContent[currentItem];
    const previousContent = storyContent[previousItem];

    // Helper function to handle character state based on scene requirements
    const handleCharacterForSide = (
      side: 'left' | 'right',
      needsCharacter: boolean,
      characterName: string | null,
      wasNonCharacterScene: boolean
    ) => {
      // Get the current character state at the time of execution
      const character = side === 'left' ? leftCharacter : rightCharacter;

      if (!needsCharacter) {
        if (character.panelState === 'visible') {
          if (isScrollingUp) {
            updateCharacterState(side, {
              panelState: 'hidden',
              fullyExited: true,
              hasStartedAnimation: false,
              progress: 0,
              bounceComplete: false
            });
          } else {
            updateCharacterState(side, {
              panelState: 'exiting',
              hasStartedAnimation: false
            });
            setTimeout(() => {
              updateCharacterState(side, {
                fullyExited: true,
                panelState: 'hidden',
                bounceComplete: false
              });
            }, 800);
          }
        } else if (character.panelState !== 'exiting') {
          updateCharacterState(side, {
            panelState: 'hidden',
            hasStartedAnimation: false,
            fullyExited: true,
            progress: 0,
            bounceComplete: false
          });
        }
      } else {
        updateCharacterState(side, {
          panelState: 'visible',
          fullyExited: false,
          currentCharacter: characterName
        });

        if (isScrollingUp && wasNonCharacterScene) {
          updateCharacterState(side, {
            progress: 100,
            animating: false,
            hasStartedAnimation: true,
            bounceComplete: true
          });
        } else if (!character.hasStartedAnimation && wasNonCharacterScene) {
          animateCharacterEntrance(side);
        }
      }
    };

    // Determine if scenes need character panels
    const needsLeftCharacterPanel = currentContent && (
      currentContent.type === 'character' ||
      currentContent.type === 'character-flow' ||
      currentContent.type === 'quest' ||
      currentContent.type === 'input' ||
      currentContent.type === 'waiting'
    ) && currentContent.leftCharacter;

    const needsRightCharacterPanel = currentContent && (
      currentContent.type === 'character' ||
      currentContent.type === 'character-flow' ||
      currentContent.type === 'quest' ||
      currentContent.type === 'input' ||
      currentContent.type === 'waiting'
    ) && currentContent.rightCharacter;

    const wasNonCharacterScene = !previousContent || (
      previousContent.type !== 'character' &&
      previousContent.type !== 'character-flow' &&
      previousContent.type !== 'quest'
    );

    // Handle both sides using the shared function
    handleCharacterForSide('left', !!needsLeftCharacterPanel, currentContent?.leftCharacter || null, wasNonCharacterScene);
    handleCharacterForSide('right', !!needsRightCharacterPanel, currentContent?.rightCharacter || null, wasNonCharacterScene);

    setPreviousItem(currentItem);

    // Check if next scene is waiting and hasn't received a message yet
    const nextItem = currentItem + 1;
    if (nextItem < storyContent.length &&
        storyContent[nextItem]?.type === 'waiting' &&
        !receivedMessages[nextItem]) {
      setAllowScrollDown(false);
    } else {
      setAllowScrollDown(true);
    }
  }, [currentItem, previousItem, storyContent, receivedMessages]);

  const goToItem = useCallback((itemIndex: number) => {
    if (isScrolling || itemIndex < 0 || itemIndex >= storyContent.length) return;

    const targetElement = itemRefs.current[itemIndex];
    if (!targetElement) return;

    setIsScrolling(true);
    setCurrentItem(itemIndex);

    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => setIsScrolling(false), 600);
  }, [isScrolling, storyContent.length]);


  // Handle quest state when current item changes
  useEffect(() => {
    const currentContent = storyContent[currentItem];
    const isScrollingUp = currentItem < previousItem;
    
    // Quest lifecycle management
    if (currentContent && currentContent.type === 'quest' && !activeQuest) {
      // Initialize quest in center state - CSS animation will handle the appear effect
      setActiveQuest({
        text: currentContent.text || '',
        type: currentContent.questType || '',
        state: 'center'
      });
    } else if (activeQuest && activeQuest.state === 'center' && currentItem > previousItem) {
      // Move to top when scrolling forward past quest
      const prevContent = storyContent[currentItem - 1];
      if (prevContent && prevContent.type === 'quest') {
        setActiveQuest(prev => prev ? {...prev, state: 'top'} : null);
      }
    } else if (activeQuest && activeQuest.state === 'top' && isScrollingUp) {
      // Return to center when scrolling back up
      const questItemIndex = storyContent.findIndex(item => item.type === 'quest');
      if (questItemIndex >= 0 && currentItem <= questItemIndex) {
        setActiveQuest(prev => prev ? {...prev, state: 'center-from-top'} : null);
      }
    } else if (activeQuest && activeQuest.state === 'center-from-top' && currentItem > previousItem) {
      // Move back to top when scrolling forward again from center-from-top
      const prevContent = storyContent[currentItem - 1];
      if (prevContent && prevContent.type === 'quest') {
        setActiveQuest(prev => prev ? {...prev, state: 'top'} : null);
      }
    } else if (activeQuest && (activeQuest.state === 'center-from-top' || activeQuest.state === 'center') && isScrollingUp) {
      // Exit to bottom when scrolling up past quest scene
      const questItemIndex = storyContent.findIndex(item => item.type === 'quest');
      if (questItemIndex >= 0 && currentItem < questItemIndex) {
        setActiveQuest(prev => prev ? {...prev, state: 'exit-bottom'} : null);
        // Remove quest after exit animation completes
        setTimeout(() => {
          setActiveQuest(null);
        }, 600); // Match exit animation duration
      }
    }

    // Input prompt lifecycle management
    if (currentContent && currentContent.type === 'input' && !activeInputPrompt) {
      // Initialize input prompt in center state
      setActiveInputPrompt({
        prompt: currentContent.prompt || '',
        state: 'center'
      });
    } else if (activeInputPrompt && activeInputPrompt.state === 'center' && currentItem > previousItem) {
      // Move to top when scrolling forward past input
      const prevContent = storyContent[currentItem - 1];
      if (prevContent && prevContent.type === 'input') {
        setActiveInputPrompt(prev => prev ? {...prev, state: 'top'} : null);
      }
    } else if (activeInputPrompt && activeInputPrompt.state === 'top' && isScrollingUp) {
      // Return to center when scrolling back up
      const inputItemIndex = storyContent.findIndex(item => item.type === 'input');
      if (inputItemIndex >= 0 && currentItem <= inputItemIndex) {
        setActiveInputPrompt(prev => prev ? {...prev, state: 'center'} : null);
      }
    } else if (activeInputPrompt && activeInputPrompt.state === 'center' && isScrollingUp) {
      // Exit to bottom when scrolling up past input scene
      const inputItemIndex = storyContent.findIndex(item => item.type === 'input');
      if (inputItemIndex >= 0 && currentItem < inputItemIndex) {
        setActiveInputPrompt(prev => prev ? {...prev, state: 'exit-bottom'} : null);
        // Remove input prompt after exit animation completes
        setTimeout(() => {
          setActiveInputPrompt(null);
        }, 600); // Match exit animation duration
      }
    }
  }, [currentItem, storyContent, previousItem, activeQuest, activeInputPrompt]);

  // Simple scroll to snap function
  const scrollToSnap = (index: number, behavior: ScrollBehavior = "smooth") => {
    const snaps = document.querySelectorAll(".story-scroll-target");
    if (snaps[index]) snaps[index].scrollIntoView({ behavior });
  };

  useKeyboardHandler({
    currentItem,
    storyContent,
    isScrolling,
    goToItem,
    waitingBubbleAnchored,
    receivedMessages,
    setReceivedMessages,
    setWaitingBubbleAnchored,
    setAllowScrollDown,
    scrollToSnap
  });

  const handleLeftBubblePosition = () => {};

  // Compute container class for character panel visibility
  const getContainerClass = useCallback(() => {
    return (!leftCharacter.fullyExited && !rightCharacter.fullyExited) ? 'story-container-both-visible' :
           (!leftCharacter.fullyExited) ? `story-container-${leftCharacter.panelState}` :
           (!rightCharacter.fullyExited) ? 'story-container-right-visible' :
           'story-container-hidden';
  }, [leftCharacter.fullyExited, leftCharacter.panelState, rightCharacter.fullyExited]);

  useScrollHandler({
    containerRef,
    isScrolling,
    currentItem,
    storyContent,
    allowScrollDown,
    setScrollOffset,
    setCurrentItem
  });


  // Forward scroll events from character panels to main container
  useEffect(() => {
    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;
    const container = containerRef.current;
    
    if (!container) return;

    const forwardScroll = (e: WheelEvent) => {
      console.log('🎯 Character panel scroll detected, forwarding to center');
      e.preventDefault();
      e.stopPropagation();
      
      // Forward the scroll to the main container
      container.scrollBy({
        top: e.deltaY,
        behavior: 'auto'
      });
    };

    if (leftPanel) {
      console.log('✅ Adding scroll listener to left panel');
      leftPanel.addEventListener('wheel', forwardScroll, { passive: false });
    }
    if (rightPanel) {
      console.log('✅ Adding scroll listener to right panel');
      rightPanel.addEventListener('wheel', forwardScroll, { passive: false });
    }

    return () => {
      if (leftPanel) leftPanel.removeEventListener('wheel', forwardScroll);
      if (rightPanel) rightPanel.removeEventListener('wheel', forwardScroll);
    };
  }, [storyContent.length, leftCharacter.panelState, rightCharacter.panelState]);

  useBubbleHeightTracker({
    currentItem,
    storyContent,
    sceneBubbleRefs
  });

  // Load story content from JSON and flatten character-flow items
  useEffect(() => {
    fetch('/stories/gingerbread.bundle/story.json')
      .then(response => response.json())
      .then(data => {
        const scenes = data.scenes || [];
        const flattenedContent: any[] = [];
        
        scenes.forEach((scene: any) => {
          if (scene.type === 'character-flow' && scene.flow) {
            // Flatten character-flow into individual scenes
            scene.flow.forEach((flowItem: any, flowIndex: number) => {
              const isLastInFlow = flowIndex === scene.flow.length - 1;
              
              // Check if this is a quest item
              if (flowItem.quest) {
                const questItem = {
                  type: 'quest',
                  questType: flowItem.quest, // 'key' or other quest types
                  text: flowItem.text,
                  background: scene.background,
                  flowSequence: true,
                  isFirstInFlow: flowIndex === 0,
                  isLastInFlow: isLastInFlow,
                  leftCharacter: scene['left-character'],
                  rightCharacter: scene['right-character']
                };
                flattenedContent.push(questItem);
              } else if (flowItem.input) {
                // Handle input prompt
                const inputItem = {
                  type: 'input',
                  prompt: flowItem.input,
                  background: scene.background,
                  flowSequence: true,
                  isFirstInFlow: flowIndex === 0,
                  isLastInFlow: isLastInFlow,
                  leftCharacter: scene['left-character'],
                  rightCharacter: scene['right-character']
                };
                flattenedContent.push(inputItem);
              } else {
                if (flowItem.waiting) {
                  const waitingScene = {
                    type: 'waiting',
                    background: scene.background,
                    backgroundFixed: !isLastInFlow,
                    flowSequence: true,
                    isFirstInFlow: false,
                    isLastInFlow: isLastInFlow,
                    leftCharacter: scene['left-character'],
                    rightCharacter: scene['right-character'],
                    isWaitingScene: true
                  };
                  flattenedContent.push(waitingScene);
                } else {
                  // Regular character dialog
                  // Check if next flow item is waiting to show waiting bubble
                  const nextFlowItem = scene.flow[flowIndex + 1];
                  const hasWaitingNext = nextFlowItem && nextFlowItem.waiting;

                  const newItem = {
                    type: 'character',
                    background: scene.background, // All flow items get the same background
                    backgroundFixed: !isLastInFlow, // Only fix background for non-last items
                    flowSequence: true, // Mark as part of flow sequence
                    isFirstInFlow: flowIndex === 0, // Mark first item in flow
                    isLastInFlow: isLastInFlow, // Mark last item in flow
                    speech: flowItem.text,
                    character: scene['left-character'] || scene.character, // Support both property names
                    leftCharacter: scene['left-character'],
                    rightCharacter: scene['right-character'],
                    side: flowItem.side || 'left',
                    showWaitingBubble: hasWaitingNext // Show waiting bubble if next item is waiting
                  };
                  flattenedContent.push(newItem);
                }
              }
            });
          } else if (scene.type === 'image' && scene.text) {
            // Split image scenes with text into two scenes
            
            // First scene: just the image
            flattenedContent.push({
              ...scene,
              type: 'image',
              text: undefined, // Remove text from first scene
              originalText: scene.text // Store for reference
            });
            
            // Second scene: image with triangle overlay
            flattenedContent.push({
              type: 'image-text',
              image: scene.image,
              text: scene.text,
              isOverlay: true
            });
          } else {
            // Keep other scene types as-is
            flattenedContent.push(scene);
          }
        });

        setStoryContent(flattenedContent);
      })
      .catch(error => {
        console.error('Error loading story:', error);
        // Fallback content
        setStoryContent([
          {
            title: "The Cookie Thief",
            subtitle: "A Leo the Monster Hunter Adventure",
            author: "Elliott Hedman",
            type: "title"
          }
        ]);
      });
  }, []);

  // Add safety check
  if (!storyContent || storyContent.length === 0) {
    return (
      <div className="story-main-container">
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'white'}}>
          Loading story...
        </div>
      </div>
    );
  }


  return (
    <div className="story-main-container">

      {/* Central Dialog Area - Always 600px wide */}
      <div className="story-central-dialog">
        {/* This creates the fixed 600px central space */}
      </div>

      {/* Dynamic layout container */}
      <div className="story-dynamic-layout">
        {/* Left Character panel */}
        <CharacterPanel
          ref={leftPanelRef}
          side="left"
          panelState={leftCharacter.panelState}
          characterFullyExited={leftCharacter.fullyExited}
          characterAnimating={leftCharacter.animating}
          characterProgress={leftCharacter.progress}
          bounceComplete={leftCharacter.bounceComplete}
          currentCharacter={leftCharacter.currentCharacter}
          isSpeaking={storyContent[currentItem]?.type === 'character' && storyContent[currentItem]?.side === 'left'}
          version={version}
          onBounceComplete={() => updateCharacterState('left', { bounceComplete: true })}
        />

        {/* Right Character panel */}
        <CharacterPanel
          ref={rightPanelRef}
          side="right"
          panelState={rightCharacter.panelState}
          characterFullyExited={rightCharacter.fullyExited}
          characterAnimating={rightCharacter.animating}
          characterProgress={rightCharacter.progress}
          bounceComplete={rightCharacter.bounceComplete}
          currentCharacter={rightCharacter.currentCharacter}
          isSpeaking={storyContent[currentItem]?.type === 'character' && storyContent[currentItem]?.side === 'right'}
          version={version}
          onBounceComplete={() => updateCharacterState('right', { bounceComplete: true })}
        />

        {/* Layer 1: Invisible scroll targets for CSS scroll-snap */}
        <div className={`story-scroll-targets ${getContainerClass()}`} ref={containerRef}>
          {storyContent.map((_, index) => (
            <div key={`scroll-target-${index}`} className="story-scroll-target" />
          ))}
        </div>

        {/* Layer 2: Transform-controlled backgrounds */}
        <BackgroundLayer storyContent={storyContent} scrollOffset={scrollOffset} />

        {/* Layer 2.5: Image layer - stays fixed like backgrounds */}
        <ImageLayer storyContent={storyContent} scrollOffset={scrollOffset} />

        {/* Layer 3: Transform-controlled content (objects) */}
        <StoryContentLayer
          storyContent={storyContent}
          scrollOffset={scrollOffset}
          currentItem={currentItem}
          activeInput={activeInput}
          onLeftBubblePosition={handleLeftBubblePosition}
          sceneBubbleRefs={sceneBubbleRefs}
          itemRefs={itemRefs}
          goToItem={goToItem}
          containerClass={getContainerClass()}
        />

        {/* Layer 4: Quest layer - separate behavior from dialog */}
        <QuestDialog quest={activeQuest} />


        {/* Layer 5: Input Prompt layer - separate from scroll targets */}
        {activeInputPrompt && (
          <InputPrompt 
            key={`input-prompt`}
            prompt={activeInputPrompt.prompt}
            state={activeInputPrompt.state}
            onSubmit={(input) => {
              setActiveInput({prompt: activeInputPrompt.prompt, userInput: input});
              goToItem(currentItem + 1);
            }}
          />
        )}

        {/* Layer 5: Construction paper overlay layer */}
        <OverlayLayer storyContent={storyContent} scrollOffset={scrollOffset} />

        {/* Layer 6: Dedicated Waiting Bubble Layer */}
        <WaitingBubbleLayer
          storyContent={storyContent}
          currentItem={currentItem}
          scrollOffset={scrollOffset}
          receivedMessages={receivedMessages}
          activeInput={activeInput}
          containerClass={getContainerClass()}
        />
      </div>
    </div>
  );
};

export default StoryModeScroll;