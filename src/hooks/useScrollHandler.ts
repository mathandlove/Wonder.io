import { useEffect } from 'react';

interface StoryContentItem {
  type: string;
}

interface UseScrollHandlerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isScrolling: boolean;
  currentItem: number;
  storyContent: StoryContentItem[];
  allowScrollDown: boolean;
  setScrollOffset: React.Dispatch<React.SetStateAction<number>>;
  setCurrentItem: React.Dispatch<React.SetStateAction<number>>;
}

export const useScrollHandler = ({
  containerRef,
  isScrolling,
  currentItem,
  storyContent,
  allowScrollDown,
  setScrollOffset,
  setCurrentItem
}: UseScrollHandlerProps) => {
  // Detect current item from scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
      }
    };

    // Prevent scrolling down when next scene is waiting
    const handleWheel = (e: WheelEvent) => {
      if (!allowScrollDown && e.deltaY > 0) {
        e.preventDefault();
        // Scroll blocked - next scene is waiting
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [currentItem, isScrolling, storyContent.length, allowScrollDown, setScrollOffset, setCurrentItem, containerRef]);
};