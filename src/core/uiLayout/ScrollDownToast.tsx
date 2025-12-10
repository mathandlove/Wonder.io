/**
 * ScrollDownToast - A toast notification prompting users to scroll down
 *
 * Displays at the bottom of the screen with an animated scrolling finger icon.
 * Only shows on pages where scrolling down is allowed (basic, complete, image_only, caption phases).
 */
import React from 'react';
import { useNavigationStore, selectCanScrollDown } from '@core/navigation/navigationStore';
import './css/ScrollDownToast.css';

// iOS devices scroll "up" to go forward (natural scrolling inverted from desktop)
// Modern iPads report as MacIntel, so also check for touch support
const isIOSDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const ScrollDownToast: React.FC = () => {
  const canScrollDown = useNavigationStore(selectCanScrollDown);
  const isIOS = React.useMemo(() => isIOSDevice(), []);
  const currentPageIndex = useNavigationStore((state) => {
    if (!state.currentId) return -1;
    return state.graph.order.indexOf(state.currentId);
  });
  const currentPhase = useNavigationStore((state) => {
    if (!state.currentId) return null;
    return state.graph.byId[state.currentId]?.phase;
  });
  const currentSceneType = useNavigationStore((state) => {
    if (!state.currentId) return null;
    return state.graph.byId[state.currentId]?.scene?.type;
  });

  // Don't show scroll-down toast on clue-image scenes
  const isClueImageScene = currentSceneType === 'clue-image';
  const [showAfterDelay, setShowAfterDelay] = React.useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const prevPhaseRef = React.useRef(currentPhase);

  // Determine delay based on page index: 1s for first 3 pages, 5s for the rest
  const delayMs = currentPageIndex >= 0 && currentPageIndex < 3 ? 1000 : 5000;

  // Check if we're on a caption phase (need to position higher)
  const isCaptionPhase = currentPhase === 'caption';

  // Function to start the delay timer
  const startTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setShowAfterDelay(false);
    setIsAnimatingOut(false);
    timerRef.current = setTimeout(() => {
      setShowAfterDelay(true);
    }, delayMs);
  }, [delayMs]);

  // Immediately hide when phase changes (to prevent flicker at new position)
  React.useEffect(() => {
    if (prevPhaseRef.current !== currentPhase) {
      // Phase changed - immediately hide without animation
      setShowAfterDelay(false);
      setIsAnimatingOut(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      prevPhaseRef.current = currentPhase;
    }
  }, [currentPhase]);

  // Show toast after delay (varies by page/phase)
  React.useEffect(() => {
    if (canScrollDown) {
      startTimer();
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setShowAfterDelay(false);
      setIsAnimatingOut(false);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [canScrollDown, currentPageIndex, currentPhase, startTimer]);

  // Listen for stepscroll:debug events (same detection as page turn)
  React.useEffect(() => {
    const handleStepScroll = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      // Hide toast when navigation happens (forward scroll)
      if (detail.lastEvent?.includes('navigation forward') && showAfterDelay && canScrollDown && !isAnimatingOut) {
        setIsAnimatingOut(true);
        setTimeout(() => {
          startTimer();
        }, 300); // Match the CSS animation duration
      }
    };

    window.addEventListener('stepscroll:debug', handleStepScroll);

    return () => {
      window.removeEventListener('stepscroll:debug', handleStepScroll);
    };
  }, [showAfterDelay, canScrollDown, isAnimatingOut, startTimer]);

  if (!canScrollDown || !showAfterDelay || isClueImageScene || isCaptionPhase) {
    return null;
  }

  return (
    <div className={`scroll-down-toast ${isAnimatingOut ? 'scroll-down-toast--animate-out' : ''}`}>
      <div className="scroll-down-content">
        <div className="scroll-finger-container">
          <svg
            className="scroll-finger-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Hand pointing down */}
            <path
              d="M12 2C10.9 2 10 2.9 10 4V12.5L8.35 10.85C7.76 10.26 6.81 10.26 6.22 10.85C5.63 11.44 5.63 12.39 6.22 12.98L10.58 17.34C11.36 18.12 12.64 18.12 13.42 17.34L17.78 12.98C18.37 12.39 18.37 11.44 17.78 10.85C17.19 10.26 16.24 10.26 15.65 10.85L14 12.5V4C14 2.9 13.1 2 12 2Z"
              fill="currentColor"
            />
            <path
              d="M12 20C12 20.55 12.45 21 13 21H11C11.55 21 12 20.55 12 20Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <span className="scroll-down-text">{isIOS ? 'Scroll Up' : 'Scroll Down'} to Continue</span>
      </div>
    </div>
  );
};
