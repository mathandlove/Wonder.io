import React, { useState, useRef, useCallback, useEffect } from 'react';
import './StoryModeScroll.css';
import TitleScene from './components/TitleScene';

const StoryModeScroll: React.FC = () => {
  const [currentItem, setCurrentItem] = useState(0); // 0-6 for items (7 total)
  const [isScrolling, setIsScrolling] = useState(false);
  const [characterPanelState, setCharacterPanelState] = useState<'hidden' | 'visible' | 'exiting'>('hidden');
  const [characterAnimating, setCharacterAnimating] = useState(false);
  const [characterProgress, setCharacterProgress] = useState(0); // Animation progress 0-100
  const [hasStartedAnimation, setHasStartedAnimation] = useState(false); // Prevent multiple starts
  const [characterFullyExited, setCharacterFullyExited] = useState(false); // Track if exit animation completed
  const [previousItem, setPreviousItem] = useState(0); // Track previous panel for direction
  const [version] = useState(`v${Date.now()}`); // Version for cache busting
  const [storyContent, setStoryContent] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Update character panel state based on current item - completely driven by JSON content
  useEffect(() => {
    if (!storyContent || storyContent.length === 0) return;
    
    const isScrollingUp = currentItem < previousItem;
    const currentContent = storyContent[currentItem];
    const previousContent = storyContent[previousItem];
    
    // Determine if current item needs character panel based on scene type
    const needsCharacterPanel = currentContent && (
      currentContent.type === 'character' || 
      currentContent.type === 'character-flow'
    );
    
    if (!needsCharacterPanel) {
      // Scene doesn't need character panel
      if (characterPanelState === 'visible') {
        // Exit character if currently visible
        setCharacterPanelState('exiting');
        setHasStartedAnimation(false); // Reset for next time
        
        // After exit animation completes, fully hide the character
        setTimeout(() => {
          setCharacterFullyExited(true);
        }, 800); // Match the exit animation duration
      } else if (characterPanelState !== 'exiting') {
        // Already hidden
        setCharacterPanelState('hidden');
        setHasStartedAnimation(false);
        setCharacterFullyExited(false);
        setCharacterProgress(0);
      }
    } else {
      // Scene needs character panel
      setCharacterPanelState('visible');
      setCharacterFullyExited(false);
      
      // Check if we're transitioning from non-character scene
      const wasNonCharacterScene = !previousContent || (
        previousContent.type !== 'character' && 
        previousContent.type !== 'character-flow'
      );
      
      // When scrolling up from non-character to character, Leo should just appear (no animation)
      if (isScrollingUp && wasNonCharacterScene) {
        setCharacterProgress(100); // Set Leo to final position immediately
        setCharacterAnimating(false);
        setHasStartedAnimation(true); // Mark as already animated
      }
      // When entering first character scene from non-character scene, start character animation
      else if (!hasStartedAnimation && wasNonCharacterScene) {
        setHasStartedAnimation(true);
        setCharacterAnimating(true);
        
        // Animate character entrance progress
        let progress = 0;
        const animationInterval = setInterval(() => {
          progress += 5;
          setCharacterProgress(progress);
          if (progress >= 95) {  // Start bounce slightly before entrance ends
            clearInterval(animationInterval);
            setCharacterProgress(100);
            // Immediately trigger bounce (no pause)
            setCharacterAnimating(false);
          }
        }, 25); // Smooth animation over ~500ms
      }
    }
    
    setPreviousItem(currentItem); // Update previous item after processing
  }, [currentItem, hasStartedAnimation, characterPanelState, previousItem, storyContent]);

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
                character: scene.character,
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
        {/* Character panel with cardboard Leo */}
        {!characterFullyExited && (
        <div className={`story-character-panel story-character-${characterPanelState} ${characterAnimating ? 'animating' : ''}`}>
          <div className="story-character-content">
            <div 
              className="story-character-cardboard"
              style={{
                transform: characterPanelState === 'visible' ? 
                  (characterProgress < 100 ? 
                    `translate(${-100 + characterProgress}%, 0%) rotate(${-45 + (characterProgress * 0.45)}deg)` : 
                    'translate(0%, 0%) rotate(0deg)') : 
                  undefined,
                transition: characterProgress >= 100 ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <div className={`story-character-inner ${!characterAnimating && characterProgress >= 100 ? 'story-bounce-arrival' : ''}`}>
                <div className="story-wooden-dowel"></div>
                <img 
                  src={`/assets.core/images/characters/leo.sticker-cardboard-3d.webp?${version}`}
                  alt="Leo the Guide"
                  className="story-character-image"
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Scrolling content - adapts width based on character panel */}
        <div className={`story-container story-container-${characterFullyExited ? 'hidden' : characterPanelState}`} ref={containerRef}>
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
                    {console.log(`Background for index ${index}: ${content.background}, fixed: ${content.backgroundFixed}, isFirstInFlow: ${content.isFirstInFlow}`)}
                    {content.background && console.log(`Rendering background ${content.background} for ${content.type} scene at index ${index}`)}
                    <div className={`story-speech-bubble ${currentItem === index ? 'story-bubble-snap-in' : 'story-bubble-hidden'}`}>
                      <div className="story-speech-tail"></div>
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