import React, { useState, useRef, useCallback, useEffect } from 'react';
import './StoryModeScroll.css';
import TitleScene from './components/TitleScene';

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
  const [currentLeftCharacter, setCurrentLeftCharacter] = useState<string | null>(null); // Track current left character
  const [currentRightCharacter, setCurrentRightCharacter] = useState<string | null>(null); // Track current right character
  const [previousItem, setPreviousItem] = useState(0); // Track previous panel for direction
  const [version] = useState(`v${Date.now()}`); // Version for cache busting
  const [storyContent, setStoryContent] = useState<any[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0); // New state to drive all transforms
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
    const needsLeftCharacterPanel = currentContent && (
      currentContent.type === 'character' || 
      currentContent.type === 'character-flow'
    ) && currentContent.leftCharacter;
    
    const needsRightCharacterPanel = currentContent && (
      currentContent.type === 'character' || 
      currentContent.type === 'character-flow'
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
        } else {
          // Normal animated exit when scrolling down
          setLeftCharacterPanelState('exiting');
          setHasStartedLeftAnimation(false);
          setTimeout(() => {
            setLeftCharacterFullyExited(true);
            setLeftCharacterPanelState('hidden');
          }, 800);
        }
      } else if (leftCharacterPanelState !== 'exiting') {
        setLeftCharacterPanelState('hidden');
        setHasStartedLeftAnimation(false);
        setLeftCharacterFullyExited(true);
        setLeftCharacterProgress(0);
      }
    } else {
      setLeftCharacterPanelState('visible');
      setLeftCharacterFullyExited(false);
      setCurrentLeftCharacter(currentContent.leftCharacter); // Store current character
      
      const wasNonCharacterScene = !previousContent || (
        previousContent.type !== 'character' && 
        previousContent.type !== 'character-flow'
      );
      
      if (isScrollingUp && wasNonCharacterScene) {
        setLeftCharacterProgress(100);
        setLeftCharacterAnimating(false);
        setHasStartedLeftAnimation(true);
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
        } else {
          // Normal animated exit when scrolling down
          setRightCharacterPanelState('exiting');
          setHasStartedRightAnimation(false);
          setTimeout(() => {
            setRightCharacterFullyExited(true);
            setRightCharacterPanelState('hidden');
          }, 800);
        }
      } else if (rightCharacterPanelState !== 'exiting') {
        setRightCharacterPanelState('hidden');
        setHasStartedRightAnimation(false);
        setRightCharacterFullyExited(true);
        setRightCharacterProgress(0);
      }
    } else {
      setRightCharacterPanelState('visible');
      setRightCharacterFullyExited(false);
      setCurrentRightCharacter(currentContent.rightCharacter); // Store current character
      
      const wasNonCharacterScene = !previousContent || (
        previousContent.type !== 'character' && 
        previousContent.type !== 'character-flow'
      );
      
      if (isScrollingUp && wasNonCharacterScene) {
        setRightCharacterProgress(100);
        setRightCharacterAnimating(false);
        setHasStartedRightAnimation(true);
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
      
      console.log(`Scroll detection: scrollTop=${scrollTop}, offset=${newOffset}, newCurrentItem=${newCurrentItem}`);
      
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

  console.log(`Total story items: ${storyContent.length}, Current item: ${currentItem}`);

  return (
    <div className="story-main-container">

      {/* Dynamic layout container */}
      <div className="story-dynamic-layout">
        {/* Left Character panel with dynamic character */}
        {leftCharacterPanelState !== 'hidden' && !leftCharacterFullyExited && (
        <div ref={leftPanelRef} className={`story-character-panel story-character-left story-character-${leftCharacterPanelState} ${leftCharacterAnimating ? 'animating' : ''}`}>
          <div className="story-character-content">
            <div 
              className="story-character-cardboard"
              style={{
                transform: leftCharacterPanelState === 'visible' ? 
                  (leftCharacterProgress < 100 ? 
                    `translateY(${100 - leftCharacterProgress}vh) translateX(${-100 + leftCharacterProgress}%) rotate(${-45 + (leftCharacterProgress * 0.45)}deg)` : 
                    'translateY(0vh) translateX(0%) rotate(0deg)') : 
                  undefined,
                transition: leftCharacterProgress >= 100 ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <div className={`story-character-inner ${!leftCharacterAnimating && leftCharacterProgress >= 100 ? 'story-bounce-arrival' : ''}`}>
                <div className="story-wooden-dowel"></div>
                <img 
                  src={`/stories/gingerbread.bundle/images/characters/${currentLeftCharacter}.sticker-cardboard-3d.webp?${version}`}
                  alt={`${currentLeftCharacter} Character`}
                  className="story-character-image"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.includes('gingerbread.bundle')) {
                      target.src = `/assets.core/images/characters/${currentLeftCharacter}.sticker-cardboard-3d.webp?${version}`;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Right Character panel with dynamic character */}
        {rightCharacterPanelState !== 'hidden' && !rightCharacterFullyExited && (
        <div ref={rightPanelRef} className={`story-character-panel story-character-right story-character-${rightCharacterPanelState} ${rightCharacterAnimating ? 'animating' : ''}`}>
          <div className="story-character-content">
            <div 
              className="story-character-cardboard"
              style={{
                transform: rightCharacterPanelState === 'visible' ? 
                  (rightCharacterProgress < 100 ? 
                    `translateY(${100 - rightCharacterProgress}vh) translateX(${100 - rightCharacterProgress}%) rotate(${45 - (rightCharacterProgress * 0.45)}deg)` : 
                    'translateY(0vh) translateX(0%) rotate(0deg)') : 
                  undefined,
                transition: rightCharacterProgress >= 100 ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <div className={`story-character-inner ${!rightCharacterAnimating && rightCharacterProgress >= 100 ? 'story-bounce-arrival-right' : ''}`}>
                <div className="story-wooden-dowel"></div>
                <img 
                  src={`/stories/gingerbread.bundle/images/characters/${currentRightCharacter}.sticker-cardboard-3d.webp?${version}`}
                  alt={`${currentRightCharacter} Character`}
                  className="story-character-image"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.includes('gingerbread.bundle')) {
                      target.src = `/assets.core/images/characters/${currentRightCharacter}.sticker-cardboard-3d.webp?${version}`;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        )}

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
        <div className="story-background-layer">
          {(() => {
            // Build a list of background changes
            const backgroundRanges: Array<{startIndex: number, endIndex: number, background: string, isImage?: boolean}> = [];
            let currentBg: string | null = null;
            let rangeStart = 0;
            
            storyContent.forEach((content, index) => {
              // Check if this scene introduces a new background
              let newBg: string | null = null;
              
              if (content.type === 'image') {
                newBg = 'comicBackground';
              } else if ((content.type === 'title' || content.type === 'title2' || content.type === 'full' || content.type === 'character') && 
                         content.background && 
                         (!content.flowSequence || content.isFirstInFlow)) {
                newBg = content.background;
              }
              
              // If background changes, save the previous range and start a new one
              if (newBg && newBg !== currentBg) {
                if (currentBg) {
                  backgroundRanges.push({
                    startIndex: rangeStart,
                    endIndex: index - 1,
                    background: currentBg,
                    isImage: currentBg === 'comicBackground'
                  });
                }
                currentBg = newBg;
                rangeStart = index;
              }
            });
            
            // Add the final range
            if (currentBg) {
              backgroundRanges.push({
                startIndex: rangeStart,
                endIndex: storyContent.length - 1,
                background: currentBg,
                isImage: currentBg === 'comicBackground'
              });
            }
            
            // Render backgrounds based on ranges
            return backgroundRanges.map((range, rangeIndex) => {
              // Calculate the background position based on scroll
              // When we're within the range, background stays at 0
              // When we scroll past, background scrolls up
              // When we haven't reached it yet, background waits below
              
              let transform = 'translateY(0)';
              
              if (scrollOffset < range.startIndex) {
                // Background is waiting below (not reached yet)
                transform = `translateY(${(range.startIndex - scrollOffset) * 100}vh)`;
              } else if (scrollOffset > range.endIndex + 1) {
                // Background has scrolled up and away
                transform = `translateY(${(range.endIndex + 1 - scrollOffset) * 100}vh)`;
              } else {
                // Background is visible and fixed in place
                transform = 'translateY(0)';
              }
              
              return (
                <div 
                  key={`bg-range-${rangeIndex}`}
                  className="story-background-image"
                  style={{
                    backgroundImage: range.isImage ? 
                      `url('/VisualAssets/comicBackground.png')` :
                      `url('/stories/gingerbread.bundle/images/backgrounds/${range.background}'), url('/assets.core/images/backgrounds/${range.background}')`,
                    transform,
                    transition: 'transform 0.6s ease-out',
                    width: '100%',
                    height: '100vh',
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
                  data-debug={`bg-range-${range.startIndex}-${range.endIndex}-${range.background}`}
                ></div>
              );
            });
          })()}
        </div>

        {/* Layer 3: Transform-controlled content */}
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
                console.log(`Rendering item ${index} with transform: ${contentTransform}`);
                
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
                    transition: 'none', // Pure transform-driven
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
                  <div className="story-full-content">
                    <h2>{content.title}</h2>
                    <p>{content.text}</p>
                  </div>
                )}
                
                {content.type === 'image' && (
                  <div className="story-comic-image">
                    <img 
                      src={`/stories/gingerbread.bundle/images/story/${content.image}`}
                      alt="Story Image"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src.includes('gingerbread.bundle')) {
                          target.src = `/assets.core/images/story/${content.image}`;
                        }
                      }}
                    />
                  </div>
                )}
                
                {content.type === 'character' && (
                  <div className={`story-speech-bubble${content.side === 'right' ? '-right' : '-left'} ${currentItem === index ? 'story-bubble-snap-in' : 'story-bubble-hidden'}`}>
                    <div className={`story-speech-tail${content.side === 'right' ? '-right' : '-left'}`}></div>
                    <p>{content.speech}</p>
                  </div>
                )}
                
              </div>
                );
              })
            )}
        </div>
      </div>
    </div>
  );
};

export default StoryModeScroll;