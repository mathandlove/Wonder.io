import React, { useState, useRef, useCallback, useEffect } from 'react';
import './StoryModeScroll.css';
import TitleScene from './components/TitleScene';
import CharacterPanel from './components/CharacterPanel';
import QuestDialog from './components/QuestDialog';
import InputPrompt from './components/InputPrompt';
import SpeechBubble from './components/SpeechBubble';
import BackgroundLayer from './components/BackgroundLayer';
import ImageLayer from './components/ImageLayer';
import FullContent from './components/FullContent';

const StoryModeScroll: React.FC = () => {
  const [currentItem, setCurrentItem] = useState(0); // 0-6 for items (7 total)
  const [isScrolling, setIsScrolling] = useState(false);
  const [leftCharacterPanelState, setLeftCharacterPanelState] = useState<'hidden' | 'visible' | 'exiting'>('hidden');
  const [rightCharacterPanelState, setRightCharacterPanelState] = useState<'hidden' | 'visible' | 'exiting'>('hidden');
  const [leftCharacterAnimating, setLeftCharacterAnimating] = useState(false);
  const [rightCharacterAnimating, setRightCharacterAnimating] = useState(false);
  const [leftCharacterProgress, setLeftCharacterProgress] = useState(0); // Animation progress 0-100
  const [rightCharacterProgress, setRightCharacterProgress] = useState(0); // Animation progress 0-100
  const [hasStartedLeftAnimation, setHasStartedLeftAnimation] = useState(false); // Prevent multiple starts
  const [hasStartedRightAnimation, setHasStartedRightAnimation] = useState(false); // Prevent multiple starts
  const [leftCharacterFullyExited, setLeftCharacterFullyExited] = useState(false); // Track if exit animation completed
  const [rightCharacterFullyExited, setRightCharacterFullyExited] = useState(false); // Track if exit animation completed
  const [leftBounceComplete, setLeftBounceComplete] = useState(false);
  const [rightBounceComplete, setRightBounceComplete] = useState(false);
  const [currentLeftCharacter, setCurrentLeftCharacter] = useState<string | null>(null); // Track current left character
  const [currentRightCharacter, setCurrentRightCharacter] = useState<string | null>(null); // Track current right character
  const [previousItem, setPreviousItem] = useState(0); // Track previous panel for direction
  const [version] = useState(`v${Date.now()}`); // Version for cache busting
  const [storyContent, setStoryContent] = useState<any[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0); // New state to drive all transforms
  const [imageSceneScrollProgress, setImageSceneScrollProgress] = useState<{[key: number]: number}>({}); // Track scroll progress for each image scene
  const [activeQuest, setActiveQuest] = useState<{text: string, type: string, state: 'center' | 'top' | 'center-from-top' | 'exit-bottom'} | null>(null); // Track active quest
  const [activeInput, setActiveInput] = useState<{prompt: string, userInput: string} | null>(null); // Track active input prompt
  const [userInput, setUserInput] = useState(''); // Track user's typed input
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);


  // Update character panel states based on current item - completely driven by JSON content
  useEffect(() => {
    if (!storyContent || storyContent.length === 0) return;
    
    const isScrollingUp = currentItem < previousItem;
    const currentContent = storyContent[currentItem];
    const previousContent = storyContent[previousItem];
    
    // Determine if current item needs character panels based on scene type
    // Include quest and input scenes to keep character panels visible
    const needsLeftCharacterPanel = currentContent && (
      currentContent.type === 'character' || 
      currentContent.type === 'character-flow' ||
      currentContent.type === 'quest' ||
      currentContent.type === 'input'
    ) && currentContent.leftCharacter;
    
    const needsRightCharacterPanel = currentContent && (
      currentContent.type === 'character' || 
      currentContent.type === 'character-flow' ||
      currentContent.type === 'quest' ||
      currentContent.type === 'input'
    ) && currentContent.rightCharacter;
    
    // Handle left character panel
    if (!needsLeftCharacterPanel) {
      if (leftCharacterPanelState === 'visible') {
        if (isScrollingUp) {
          // Immediately exit when scrolling up, no animation
          setLeftCharacterPanelState('hidden');
          setLeftCharacterFullyExited(true);
          setHasStartedLeftAnimation(false);
          setLeftCharacterProgress(0);
          setLeftBounceComplete(false);
        } else {
          // Normal animated exit when scrolling down
          setLeftCharacterPanelState('exiting');
          setHasStartedLeftAnimation(false);
          setTimeout(() => {
            setLeftCharacterFullyExited(true);
            setLeftCharacterPanelState('hidden');
            setLeftBounceComplete(false);
          }, 800);
        }
      } else if (leftCharacterPanelState !== 'exiting') {
        setLeftCharacterPanelState('hidden');
        setHasStartedLeftAnimation(false);
        setLeftCharacterFullyExited(true);
        setLeftCharacterProgress(0);
        setLeftBounceComplete(false);
      }
    } else {
      setLeftCharacterPanelState('visible');
      setLeftCharacterFullyExited(false);
      setCurrentLeftCharacter(currentContent.leftCharacter); // Store current character
      
      const wasNonCharacterScene = !previousContent || (
        previousContent.type !== 'character' && 
        previousContent.type !== 'character-flow' &&
        previousContent.type !== 'quest'
      );
      
      if (isScrollingUp && wasNonCharacterScene) {
        setLeftCharacterProgress(100);
        setLeftCharacterAnimating(false);
        setHasStartedLeftAnimation(true);
        // Set bounce complete immediately when scrolling up
        setLeftBounceComplete(true);
      } else if (!hasStartedLeftAnimation && wasNonCharacterScene) {
        setHasStartedLeftAnimation(true);
        setLeftCharacterAnimating(true);
        
        let progress = 0;
        const animationInterval = setInterval(() => {
          progress += 10; // Double the speed
          setLeftCharacterProgress(progress);
          if (progress >= 95) {
            clearInterval(animationInterval);
            setLeftCharacterProgress(100);
            setLeftCharacterAnimating(false);
            // Set bounce complete after bounce animation (1.2s)
            setTimeout(() => {
              setLeftBounceComplete(true);
            }, 1200);
          }
        }, 25); // Smooth animation over ~250ms
      }
    }
    
    // Handle right character panel (similar logic)
    if (!needsRightCharacterPanel) {
      if (rightCharacterPanelState === 'visible') {
        if (isScrollingUp) {
          // Immediately exit when scrolling up, no animation
          setRightCharacterPanelState('hidden');
          setRightCharacterFullyExited(true);
          setHasStartedRightAnimation(false);
          setRightCharacterProgress(0);
          setRightBounceComplete(false);
        } else {
          // Normal animated exit when scrolling down
          setRightCharacterPanelState('exiting');
          setHasStartedRightAnimation(false);
          setTimeout(() => {
            setRightCharacterFullyExited(true);
            setRightCharacterPanelState('hidden');
            setRightBounceComplete(false);
          }, 800);
        }
      } else if (rightCharacterPanelState !== 'exiting') {
        setRightCharacterPanelState('hidden');
        setHasStartedRightAnimation(false);
        setRightCharacterFullyExited(true);
        setRightCharacterProgress(0);
        setRightBounceComplete(false);
      }
    } else {
      setRightCharacterPanelState('visible');
      setRightCharacterFullyExited(false);
      setCurrentRightCharacter(currentContent.rightCharacter); // Store current character
      
      const wasNonCharacterScene = !previousContent || (
        previousContent.type !== 'character' && 
        previousContent.type !== 'character-flow' &&
        previousContent.type !== 'quest'
      );
      
      if (isScrollingUp && wasNonCharacterScene) {
        setRightCharacterProgress(100);
        setRightCharacterAnimating(false);
        setHasStartedRightAnimation(true);
        // Set bounce complete immediately when scrolling up
        setRightBounceComplete(true);
      } else if (!hasStartedRightAnimation && wasNonCharacterScene) {
        setHasStartedRightAnimation(true);
        setRightCharacterAnimating(true);
        
        let progress = 0;
        const animationInterval = setInterval(() => {
          progress += 10; // Double the speed
          setRightCharacterProgress(progress);
          if (progress >= 95) {
            clearInterval(animationInterval);
            setRightCharacterProgress(100);
            setRightCharacterAnimating(false);
            // Set bounce complete after bounce animation (1.2s)
            setTimeout(() => {
              setRightBounceComplete(true);
            }, 1200);
          }
        }, 25); // Smooth animation over ~250ms
      }
    }
    
    setPreviousItem(currentItem);
  }, [currentItem, hasStartedLeftAnimation, hasStartedRightAnimation, leftCharacterPanelState, rightCharacterPanelState, previousItem, storyContent]);

  // Simple function to go to a specific item using native scrollIntoView
  const goToItem = useCallback((itemIndex: number) => {
    if (isScrolling) return;
    if (itemIndex < 0 || itemIndex >= storyContent.length) return;
    
    const targetElement = itemRefs.current[itemIndex];
    if (!targetElement) return;
    
    setIsScrolling(true);
    setCurrentItem(itemIndex);
    
    console.log(`Scrolling to item ${itemIndex}`);
    
    // Use native scroll with CSS scroll-snap
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    
    // Clear scrolling state after animation
    setTimeout(() => {
      setIsScrolling(false);
    }, 600); // Slightly longer for smooth scroll
  }, [isScrolling]);

  // Navigation functions
  const goNext = useCallback(() => {
    if (currentItem < storyContent.length - 1) {
      goToItem(currentItem + 1);
    }
  }, [currentItem, goToItem, storyContent.length]);

  const goPrev = useCallback(() => {
    if (currentItem > 0) {
      goToItem(currentItem - 1);
    }
  }, [currentItem, goToItem]);

  // Handle quest state when current item changes
  useEffect(() => {
    const currentContent = storyContent[currentItem];
    const isScrollingUp = currentItem < previousItem;
    
    // Quest lifecycle management
    if (currentContent && currentContent.type === 'quest' && !activeQuest) {
      // Initialize quest in center state - CSS animation will handle the appear effect
      console.log('🎯 QUEST DEBUG: Initializing quest in CENTER state', {currentItem, previousItem, currentContent});
      setActiveQuest({
        text: currentContent.text,
        type: currentContent.questType,
        state: 'center'
      });
    } else if (activeQuest && activeQuest.state === 'center' && currentItem > previousItem) {
      // Move to top when scrolling forward past quest
      const prevContent = storyContent[currentItem - 1];
      if (prevContent && prevContent.type === 'quest') {
        console.log('🎯 QUEST DEBUG: Moving quest from CENTER to TOP');
        setActiveQuest(prev => prev ? {...prev, state: 'top'} : null);
      }
    } else if (activeQuest && activeQuest.state === 'top' && isScrollingUp) {
      // Return to center when scrolling back up
      const questItemIndex = storyContent.findIndex(item => item.type === 'quest');
      if (questItemIndex >= 0 && currentItem <= questItemIndex) {
        console.log('🎯 QUEST DEBUG: Moving quest from TOP back to CENTER (scroll up)');
        setActiveQuest(prev => prev ? {...prev, state: 'center-from-top'} : null);
      }
    } else if (activeQuest && activeQuest.state === 'center-from-top' && currentItem > previousItem) {
      // Move back to top when scrolling forward again from center-from-top
      const prevContent = storyContent[currentItem - 1];
      if (prevContent && prevContent.type === 'quest') {
        console.log('🎯 QUEST DEBUG: Moving quest from CENTER-FROM-TOP back to TOP');
        setActiveQuest(prev => prev ? {...prev, state: 'top'} : null);
      }
    } else if (activeQuest && (activeQuest.state === 'center-from-top' || activeQuest.state === 'center') && isScrollingUp) {
      // Exit to bottom when scrolling up past quest scene
      const questItemIndex = storyContent.findIndex(item => item.type === 'quest');
      if (questItemIndex >= 0 && currentItem < questItemIndex) {
        console.log('🎯 QUEST DEBUG: Quest exiting to BOTTOM (scroll up past quest)');
        setActiveQuest(prev => prev ? {...prev, state: 'exit-bottom'} : null);
        // Remove quest after exit animation completes
        setTimeout(() => {
          console.log('🎯 QUEST DEBUG: Removing quest after exit animation');
          setActiveQuest(null);
        }, 600); // Match exit animation duration
      }
    }

    // Debug current quest state and detect unexpected changes
    if (activeQuest) {
      console.log(`🎯 QUEST DEBUG: Current state = ${activeQuest.state}, currentItem = ${currentItem}, previousItem = ${previousItem}`);
      
      // Detect if quest state changes unexpectedly
      if (activeQuest.state === 'appearing' && currentItem > 2) {
        console.log('🚨 QUEST ERROR: Quest reset to APPEARING state unexpectedly!');
      }
      
      if (activeQuest.state === 'center' && previousItem === currentItem && currentItem > 2) {
        console.log('🚨 QUEST ERROR: Quest reset to CENTER state unexpectedly!');
      }
    }
  }, [currentItem, storyContent, previousItem, activeQuest]);

  // Detect current item from scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Debug scroll container dimensions
    console.log(`Scroll container: height=${container.clientHeight}, scrollHeight=${container.scrollHeight}, canScroll=${container.scrollHeight > container.clientHeight}`);

    const handleScroll = () => {
      if (isScrolling) return; // Don't update during programmatic scrolling
      
      const containerHeight = container.clientHeight;
      const scrollTop = container.scrollTop;
      const newCurrentItem = Math.round(scrollTop / containerHeight);
      
      // Calculate continuous offset for smooth transforms
      const newOffset = scrollTop / containerHeight;
      setScrollOffset(newOffset);
      
      
      if (newCurrentItem !== currentItem && newCurrentItem >= 0 && newCurrentItem < storyContent.length) {
        setCurrentItem(newCurrentItem);
        console.log(`Scrolled to item ${newCurrentItem}`);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentItem, isScrolling, storyContent.length]);

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
  }, [storyContent.length, leftCharacterPanelState, rightCharacterPanelState]);

  // Load story content from JSON and flatten character-flow items
  useEffect(() => {
    fetch('/stories/gingerbread.bundle/story.json')
      .then(response => response.json())
      .then(data => {
        const scenes = data.scenes || [];
        const flattenedContent: any[] = [];
        
        scenes.forEach((scene: any) => {
          console.log('Processing scene:', scene);
          if (scene.type === 'character-flow' && scene.flow) {
            console.log('Found character-flow with', scene.flow.length, 'items');
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
                console.log('Adding quest item:', questItem);
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
                console.log('Adding input item:', inputItem);
                flattenedContent.push(inputItem);
              } else {
                // Regular character dialog
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
                  side: flowItem.side || 'left'
                };
                console.log('Adding flow item:', newItem);
                flattenedContent.push(newItem);
              }
            });
          } else if (scene.type === 'image' && scene.text) {
            // Split image scenes with text into two scenes
            console.log('Splitting image scene with text into two scenes');
            
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
            console.log('Adding regular scene:', scene);
            flattenedContent.push(scene);
          }
        });
        
        console.log('Flattened story content:', flattenedContent);
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
          panelState={leftCharacterPanelState}
          characterFullyExited={leftCharacterFullyExited}
          characterAnimating={leftCharacterAnimating}
          characterProgress={leftCharacterProgress}
          bounceComplete={leftBounceComplete}
          currentCharacter={currentLeftCharacter}
          currentScene={storyContent[currentItem]}
          currentItem={currentItem}
          version={version}
          onBounceComplete={() => setLeftBounceComplete(true)}
        />

        {/* Right Character panel */}
        <CharacterPanel
          ref={rightPanelRef}
          side="right"
          panelState={rightCharacterPanelState}
          characterFullyExited={rightCharacterFullyExited}
          characterAnimating={rightCharacterAnimating}
          characterProgress={rightCharacterProgress}
          bounceComplete={rightBounceComplete}
          currentCharacter={currentRightCharacter}
          currentScene={storyContent[currentItem]}
          currentItem={currentItem}
          version={version}
          onBounceComplete={() => setRightBounceComplete(true)}
        />

        {/* Layer 1: Invisible scroll targets for CSS scroll-snap */}
        <div className={`story-scroll-targets ${
          (!leftCharacterFullyExited && !rightCharacterFullyExited) ? 'story-container-both-visible' :
          (!leftCharacterFullyExited) ? `story-container-${leftCharacterPanelState}` :
          (!rightCharacterFullyExited) ? 'story-container-right-visible' :
          'story-container-hidden'
        }`} ref={containerRef}>
          {storyContent.map((_, index) => (
            <div key={`scroll-target-${index}`} className="story-scroll-target" />
          ))}
        </div>

        {/* Layer 2: Transform-controlled backgrounds */}
        <BackgroundLayer storyContent={storyContent} scrollOffset={scrollOffset} />

        {/* Layer 2.5: Image layer - stays fixed like backgrounds */}
        <ImageLayer storyContent={storyContent} scrollOffset={scrollOffset} />

        {/* Layer 3: Transform-controlled content (objects) */}
        <div className={`story-content-layer ${
          (!leftCharacterFullyExited && !rightCharacterFullyExited) ? 'story-container-both-visible' :
          (!leftCharacterFullyExited) ? `story-container-${leftCharacterPanelState}` :
          (!rightCharacterFullyExited) ? 'story-container-right-visible' :
          'story-container-hidden'
        }`}>
          {storyContent.length === 0 ? (
            <div style={{color: 'white', fontSize: '24px', textAlign: 'center', padding: '50px'}}>
              Loading story content...
            </div>
            ) : (
              storyContent.map((content, index) => {
                // Calculate transform offset for this content item
                const contentTransform = `translateY(${(index - scrollOffset) * 100}vh)`;
                
                return (
                <div
                  key={index}
                  ref={el => itemRefs.current[index] = el}
                  className={`story-item ${currentItem === index ? 'active' : ''}`}
                  style={{
                    width: '100%', 
                    height: '100vh',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transform: contentTransform,
                    transition: 'transform 0.5s ease-out', // Slightly faster than background for parallax
                    pointerEvents: 'auto' // Allow interactions with content
                  }}
                >
                {/* Show content based on type and animation state */}
                {(content.type === 'title' || content.type === 'title2') && (
                  <TitleScene 
                    text={content.lvl1 && content.lvl2 ? 
                      { lvl1: content.lvl1, lvl2: content.lvl2, ...(content.lvl3 && { lvl3: content.lvl3 }) } :
                      { lvl1: content.title || '', lvl2: content.subtitle || '' }
                    }
                    author={content.author}
                    onComplete={() => {
                      // Auto-advance to next panel when title animation completes
                      if (index < storyContent.length - 1) {
                        goToItem(index + 1);
                      }
                    }}
                  />
                )}
                
                {content.type === 'full' && (
                  <FullContent title={content.title} text={content.text} />
                )}
                
                {/* Images are now rendered in the image layer, not here */}
                {(content.type === 'image' || content.type === 'image-text') && (
                  <div style={{ width: '100%', height: '100vh' }} />
                )}
                
                {content.type === 'character' && (
                  <SpeechBubble 
                    side={content.side}
                    speech={content.speech}
                    character={content.character}
                    isActive={currentItem === index}
                    activeInput={activeInput}
                  />
                )}
                

                {content.type === 'input' && currentItem === index && (
                  <InputPrompt 
                    prompt={content.prompt}
                    onSubmit={(input) => {
                      setActiveInput({prompt: content.prompt, userInput: input});
                      setTimeout(() => {
                        setCurrentItem(currentItem + 1);
                      }, 500);
                    }}
                  />
                )}
                
              </div>
                );
              })
            )}
        </div>

        {/* Layer 4: Quest layer - separate behavior from dialog */}
        <QuestDialog quest={activeQuest} />

        {/* Layer 5: Construction paper overlay layer */}
        <div className="story-overlay-layer">
          {storyContent.map((content, index) => {
            // Only render overlay for image-text scenes
            if (content.type !== 'image-text') return null;
            
            // Calculate transform for overlay
            const overlayTransform = `translateY(${(index - scrollOffset) * 100}vh)`;
            
            return (
              <div
                key={`overlay-${index}`}
                className="story-overlay-item"
                style={{
                  width: '100%',
                  height: '100vh',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: overlayTransform,
                  transition: 'transform 0.6s ease-out', // Same as image layer
                  pointerEvents: 'none'
                }}
              >
                <div className="story-construction-triangle">
                  <div className="story-triangle-text-box">
                    {content.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StoryModeScroll;