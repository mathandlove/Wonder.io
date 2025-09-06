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
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

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
        setLeftCharacterPanelState('exiting');
        setHasStartedLeftAnimation(false);
        setTimeout(() => {
          setLeftCharacterFullyExited(true);
          setLeftCharacterPanelState('hidden');
        }, 800);
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
        setRightCharacterPanelState('exiting');
        setHasStartedRightAnimation(false);
        setTimeout(() => {
          setRightCharacterFullyExited(true);
          setRightCharacterPanelState('hidden');
        }, 800);
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
      
      console.log(`Scroll detection: scrollTop=${scrollTop}, containerHeight=${containerHeight}, newCurrentItem=${newCurrentItem}, currentItem=${currentItem}`);
      
      if (newCurrentItem !== currentItem && newCurrentItem >= 0 && newCurrentItem < storyContent.length) {
        setCurrentItem(newCurrentItem);
        console.log(`Scrolled to item ${newCurrentItem}`);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentItem, isScrolling, storyContent.length]);

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
        <div className={`story-character-panel story-character-left story-character-${leftCharacterPanelState} ${leftCharacterAnimating ? 'animating' : ''}`}>
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
        <div className={`story-character-panel story-character-right story-character-${rightCharacterPanelState} ${rightCharacterAnimating ? 'animating' : ''}`}>
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

        {/* Scrolling content - adapts width based on character panels */}
        <div className={`story-container ${
          (!leftCharacterFullyExited && !rightCharacterFullyExited) ? 'story-container-both-visible' :
          (!leftCharacterFullyExited) ? `story-container-${leftCharacterPanelState}` :
          (!rightCharacterFullyExited) ? 'story-container-right-visible' :
          'story-container-hidden'
        }`} ref={containerRef}>
          <div className="story-items">
            {storyContent && storyContent.map((content, index) => {
              console.log(`Rendering item ${index}:`, content);
              return (
              <div
                key={index}
                ref={el => itemRefs.current[index] = el}
                className={`story-item ${currentItem === index ? 'active' : ''}`}
              >
                {/* Show content based on type and animation state */}
                {(content.type === 'title' || content.type === 'title2') && (
                  <>
                    {content.background && (!content.flowSequence || content.isFirstInFlow) && (
                      <div 
                        className="story-background-image"
                        style={{
                          backgroundImage: `url('/stories/gingerbread.bundle/images/backgrounds/${content.background}'), url('/assets.core/images/backgrounds/${content.background}')`,
                          transform: content.backgroundFixed && currentItem > index ? 
                            'translateY(0)' : 
                            `translateY(${(index - currentItem) * 100}vh)`,
                          transition: content.backgroundFixed && currentItem > index ? 'none' : 'transform 0.6s ease-out'
                        }}
                        data-debug={`bg-${index}-${content.background}-fixed-${content.backgroundFixed}`}
                        onLoad={() => console.log(`Background loaded for ${content.type} scene: ${content.background}`)}
                        onError={() => console.log(`Background failed to load for ${content.type} scene: ${content.background}`)}
                      ></div>
                    )}
                    {/* Keep previous background visible if no background specified */}
                    {!content.background && index > 0 && (
                      (() => {
                        // Find the most recent scene with a background
                        for (let i = index - 1; i >= 0; i--) {
                          if (storyContent[i] && storyContent[i].background) {
                            return (
                              <div 
                                className="story-background-image"
                                style={{
                                  backgroundImage: `url('/stories/gingerbread.bundle/images/backgrounds/${storyContent[i].background}'), url('/assets.core/images/backgrounds/${storyContent[i].background}')`,
                                  transform: 'translateY(0)', // Keep it fixed
                                  transition: 'none'
                                }}
                                data-debug={`bg-${index}-inherited-${storyContent[i].background}`}
                              ></div>
                            );
                          }
                        }
                        return null;
                      })()
                    )}
                    {console.log(`Background for index ${index}: ${content.background}, fixed: ${content.backgroundFixed}, isFirstInFlow: ${content.isFirstInFlow}`)}
                    {content.background && console.log(`Rendering background ${content.background} for ${content.type} scene at index ${index}`)}
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
                  </>
                )}
                
                {content.type === 'full' && (
                  <>
                    {content.background && (!content.flowSequence || content.isFirstInFlow) && (
                      <div 
                        className="story-background-image"
                        style={{
                          backgroundImage: `url('/stories/gingerbread.bundle/images/backgrounds/${content.background}'), url('/assets.core/images/backgrounds/${content.background}')`,
                          transform: content.backgroundFixed && currentItem > index ? 
                            'translateY(0)' : 
                            `translateY(${(index - currentItem) * 100}vh)`,
                          transition: content.backgroundFixed && currentItem > index ? 'none' : 'transform 0.6s ease-out'
                        }}
                        data-debug={`bg-${index}-${content.background}-fixed-${content.backgroundFixed}`}
                        onLoad={() => console.log(`Background loaded for ${content.type} scene: ${content.background}`)}
                        onError={() => console.log(`Background failed to load for ${content.type} scene: ${content.background}`)}
                      ></div>
                    )}
                    {/* Keep previous background visible if no background specified */}
                    {!content.background && index > 0 && (
                      (() => {
                        // Find the most recent scene with a background
                        for (let i = index - 1; i >= 0; i--) {
                          if (storyContent[i] && storyContent[i].background) {
                            return (
                              <div 
                                className="story-background-image"
                                style={{
                                  backgroundImage: `url('/stories/gingerbread.bundle/images/backgrounds/${storyContent[i].background}'), url('/assets.core/images/backgrounds/${storyContent[i].background}')`,
                                  transform: 'translateY(0)', // Keep it fixed
                                  transition: 'none'
                                }}
                                data-debug={`bg-${index}-inherited-${storyContent[i].background}`}
                              ></div>
                            );
                          }
                        }
                        return null;
                      })()
                    )}
                    {console.log(`Background for index ${index}: ${content.background}, fixed: ${content.backgroundFixed}, isFirstInFlow: ${content.isFirstInFlow}`)}
                    {content.background && console.log(`Rendering background ${content.background} for ${content.type} scene at index ${index}`)}
                    <div className="story-full-content">
                      <h2>{content.title}</h2>
                      <p>{content.text}</p>
                    </div>
                  </>
                )}
                
                {content.type === 'character' && (
                  <>
                    {content.background && (!content.flowSequence || content.isFirstInFlow) && (
                      <div 
                        className="story-background-image"
                        style={{
                          backgroundImage: `url('/stories/gingerbread.bundle/images/backgrounds/${content.background}'), url('/assets.core/images/backgrounds/${content.background}')`,
                          transform: content.backgroundFixed && currentItem > index ? 
                            'translateY(0)' : 
                            `translateY(${(index - currentItem) * 100}vh)`,
                          transition: content.backgroundFixed && currentItem > index ? 'none' : 'transform 0.6s ease-out'
                        }}
                        data-debug={`bg-${index}-${content.background}-fixed-${content.backgroundFixed}`}
                        onLoad={() => console.log(`Background loaded for ${content.type} scene: ${content.background}`)}
                        onError={() => console.log(`Background failed to load for ${content.type} scene: ${content.background}`)}
                      ></div>
                    )}
                    {/* Keep previous background visible if no background specified */}
                    {!content.background && index > 0 && (
                      (() => {
                        // Find the most recent scene with a background
                        for (let i = index - 1; i >= 0; i--) {
                          if (storyContent[i] && storyContent[i].background) {
                            return (
                              <div 
                                className="story-background-image"
                                style={{
                                  backgroundImage: `url('/stories/gingerbread.bundle/images/backgrounds/${storyContent[i].background}'), url('/assets.core/images/backgrounds/${storyContent[i].background}')`,
                                  transform: 'translateY(0)', // Keep it fixed
                                  transition: 'none'
                                }}
                                data-debug={`bg-${index}-inherited-${storyContent[i].background}`}
                              ></div>
                            );
                          }
                        }
                        return null;
                      })()
                    )}
                    {console.log(`Background for index ${index}: ${content.background}, fixed: ${content.backgroundFixed}, isFirstInFlow: ${content.isFirstInFlow}`)}
                    {content.background && console.log(`Rendering background ${content.background} for ${content.type} scene at index ${index}`)}
                    <div className={`story-speech-bubble${content.side === 'right' ? '-right' : '-left'} ${currentItem === index ? 'story-bubble-snap-in' : 'story-bubble-hidden'}`}>
                      <div className={`story-speech-tail${content.side === 'right' ? '-right' : '-left'}`}></div>
                      <p>{content.speech}</p>
                    </div>
                  </>
                )}
                
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryModeScroll;