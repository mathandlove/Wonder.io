/**
 * useStepScroll - One-scene-at-a-time scroll control
 *
 * Intercepts wheel/touch/keyboard events and enforces single-scene transitions.
 * Prevents native scrolling and implements momentum-free, deliberate navigation.
 *
 * Now supports navigation array - scrolls only when sceneId changes,
 * otherwise just updates state without scrolling.
 */
import { useEffect, useRef, useCallback } from 'react';
import type { NavigationItem } from '@core/navigation/types';
import { shouldScroll } from '@core/navigation/types';

declare global {
  interface HTMLElementEventMap {
    scrollend: Event;
  }
}

type Direction = 'forward' | 'backward';

type StepScrollOpts = {
  onIndexChange: (nextIndex: number) => void;
  getIndex: () => number;
  count: () => number;
  durationMs?: number;
  thresholdPx?: number;
  isInputFocused?: () => boolean;
  checkContentLocks?: (direction: Direction, currentIndex: number) => boolean;
  navigationArray?: NavigationItem[]; // Optional: enables smart scrolling
};

export function useStepScroll(
  containerRef: React.RefObject<HTMLElement | HTMLDivElement | null>,
  {
    onIndexChange,
    getIndex,
    count,
    durationMs = 380,
    thresholdPx = 60,
    isInputFocused = () => false,
    checkContentLocks,
    navigationArray
  }: StepScrollOpts
) {
  const cooldownRef = useRef(false); // Prevents rapid-fire scrolling
  const scrollAnimatingRef = useRef(false); // Tracks actual scroll animation state
  const touchStartYRef = useRef(0);
  const wheelAccumRef = useRef(0);
  const settleTimerRef = useRef<number | null>(null);

  // Debug state emitter
  const emitDebug = useCallback((lastEvent: string, lockState?: { isLocked: boolean; reason: string; direction?: 'forward' | 'backward' }) => {
    const currentIndex = getIndex();
    const lockedForward = checkContentLocks?.('forward', currentIndex) ?? false;
    const lockedBackward = checkContentLocks?.('backward', currentIndex) ?? false;

    window.dispatchEvent(new CustomEvent('stepscroll:debug', {
      detail: {
        animating: scrollAnimatingRef.current,
        wheelAccum: wheelAccumRef.current,
        currentIndex,
        isLocked: lockState?.isLocked ?? false,
        lockReason: lockState?.reason ?? '',
        lockedForward,
        lockedBackward,
        blockDismissActive: cooldownRef.current, // Show cooldown state in debug
        settleTimerActive: settleTimerRef.current !== null,
        lastEvent,
        timestamp: Date.now(),
      }
    }));
  }, [getIndex, checkContentLocks]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Ensure container has required CSS properties
    el.style.overscrollBehavior = 'contain';
    el.style.scrollSnapType = 'y mandatory';

    // Emit initial state
    emitDebug('useStepScroll initialized');

    // ============ CORE FUNCTIONS ============

    const scrollToIndex = (idx: number, fromIdx?: number) => {
      const clamped = Math.max(0, Math.min(idx, count() - 1));

      // Check if we should actually scroll using navigation array
      let shouldAnimate = true;
      if (navigationArray && fromIdx !== undefined) {
        const fromItem = navigationArray[fromIdx];
        const toItem = navigationArray[clamped];
        if (fromItem && toItem) {
          shouldAnimate = shouldScroll(fromItem, toItem);
          console.log(`🔍 shouldScroll check:`, {
            fromScene: fromItem.sceneId,
            toScene: toItem.sceneId,
            shouldAnimate,
            reason: shouldAnimate ? 'different scenes' : 'same scene, state change only'
          });
        }
      }

      // If we're staying on the same scene (state change only), don't scroll
      if (!shouldAnimate) {
        console.log('⚡ State change only - no scroll animation');
        emitDebug(`scrollToIndex(${clamped}) - state change only, no scroll`);
        return;
      }

      const section = el.querySelectorAll<HTMLElement>('.scene')[clamped];
      if (!section) return;

      // Check if we're already at the target position
      const currentScroll = el.scrollTop;
      const targetScroll = section.offsetTop;
      const scrollDelta = Math.abs(currentScroll - targetScroll);

      console.log(`📜 scrollToIndex(${clamped}):`, {
        currentScroll,
        targetScroll,
        scrollDelta,
        alreadyAtTarget: scrollDelta < 5
      });

      // If already at target, no need to scroll
      if (scrollDelta < 5) {
        console.log('✅ Already at target position - no scroll needed');
        emitDebug(`scrollToIndex(${clamped}) - already at target`);
        return;
      }

      scrollAnimatingRef.current = true;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      console.log(`📜 Starting smooth scroll to index ${clamped}`);
      emitDebug(`scrollToIndex(${clamped})`);

      // Fallback timer in case scrollend doesn't fire
      if (settleTimerRef.current) {
        console.log('🔄 Clearing existing settle timer before scroll');
        window.clearTimeout(settleTimerRef.current);
      }
      console.log('⏱️ Setting 600ms fallback timer for scrollend');
      settleTimerRef.current = window.setTimeout(() => {
        console.log('⏰ Fallback timer fired (scrollend didn\'t fire) - clearing scroll animating flag');
        scrollAnimatingRef.current = false;
        settleTimerRef.current = null;
        emitDebug('settle timer fired - scroll animation complete');
      }, 600);
    };

    const checkDomLocks = (direction: Direction, currentIndex: number): boolean => {
      const sections = el.querySelectorAll<HTMLElement>('.scene');
      const currentSection = sections[currentIndex];
      if (!currentSection) return false;

      const lockAttribute = direction === 'forward' ? 'data-lock-forward' : 'data-lock-backward';
      return currentSection.hasAttribute(lockAttribute);
    };

    const isLocked = (direction: Direction, currentIndex: number): boolean => {
      const domLocked = checkDomLocks(direction, currentIndex);
      const contentLocked = checkContentLocks?.(direction, currentIndex) ?? false;
      return domLocked || contentLocked;
    };

    const startCooldown = (durationMs: number) => {
      cooldownRef.current = true;
      console.log(`⏳ Starting ${durationMs}ms cooldown`);
      setTimeout(() => {
        cooldownRef.current = false;
        console.log('✅ Cooldown complete - ready for next scroll');
        emitDebug('cooldown complete');
      }, durationMs);
    };

    const attemptTransition = (direction: Direction) => {
      const currentIndex = getIndex();
      const locked = isLocked(direction, currentIndex);

      if (locked) {
        // Emit unified scroll attempt event (blocked)
        const blockedEvent = {
          direction,
          blocked: true,
          fromIndex: currentIndex,
          toIndex: currentIndex, // Stayed on same scene
          timestamp: Date.now(),
        };
        console.log('🚫 scroll:attempt (BLOCKED):', blockedEvent);
        window.dispatchEvent(new CustomEvent('scroll:attempt', { detail: blockedEvent }));
        emitDebug(`BLOCKED: ${direction}`, { isLocked: true, reason: 'content lock' });

        // Start cooldown to prevent rapid-fire blocked attempts
        startCooldown(300);

        return false; // Blocked
      }

      const delta = direction === 'forward' ? 1 : -1;
      const next = currentIndex + delta;
      const clamped = Math.max(0, Math.min(next, count() - 1));

      // Emit unified scroll attempt event (successful)
      const successEvent = {
        direction,
        blocked: false,
        fromIndex: currentIndex,
        toIndex: clamped,
        timestamp: Date.now(),
      };
      console.log('✅ scroll:attempt (SUCCESS):', successEvent);
      window.dispatchEvent(new CustomEvent('scroll:attempt', { detail: successEvent }));

      emitDebug(`TRANSITION: ${direction} to index ${clamped}`, { isLocked: false, reason: '' });
      onIndexChange(clamped);
      scrollToIndex(clamped, currentIndex); // Pass fromIdx to enable smart scrolling

      // Start cooldown to prevent rapid-fire successful scrolls
      startCooldown(300);

      return true; // Success
    };

    // ============ EVENT HANDLERS ============

    const onWheel = (evt: Event) => {
      const e = evt as WheelEvent;

      // Allow normal scrolling for inputs
      if (isInputFocused()) return;

      // Only handle vertical scrolling
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;

      // Block all scrolling during cooldown or scroll animation
      if (cooldownRef.current || scrollAnimatingRef.current) {
        e.preventDefault();
        if (cooldownRef.current) {
          console.log('⏸️ Wheel event blocked: cooldown active');
        } else {
          console.log('⏸️ Wheel event blocked: scroll animation in progress');
        }
        return;
      }

      e.preventDefault(); // Always prevent native scroll

      // Accumulate delta until threshold
      wheelAccumRef.current += e.deltaY;

      if (wheelAccumRef.current > thresholdPx) {
        wheelAccumRef.current = 0;
        emitDebug(`wheel threshold exceeded: forward`);
        attemptTransition('forward');
      } else if (wheelAccumRef.current < -thresholdPx) {
        wheelAccumRef.current = 0;
        emitDebug(`wheel threshold exceeded: backward`);
        attemptTransition('backward');
      } else {
        emitDebug(`wheel accumulating: ${wheelAccumRef.current.toFixed(0)}px`);
      }
    };

    let touching = false;
    const onTouchStart = (evt: Event) => {
      const e = evt as TouchEvent;
      if (isInputFocused()) return;
      touching = true;
      touchStartYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (evt: Event) => {
      const e = evt as TouchEvent;
      if (!touching) return;

      if (cooldownRef.current || scrollAnimatingRef.current) {
        e.preventDefault();
        return;
      }

      const dy = touchStartYRef.current - e.touches[0].clientY;

      if (Math.abs(dy) > thresholdPx) {
        e.preventDefault();
        touching = false;
        attemptTransition(dy > 0 ? 'forward' : 'backward');
      }
    };

    const onTouchEnd = () => {
      touching = false;
    };

    const onKeyDown = (evt: Event) => {
      const e = evt as KeyboardEvent;
      if (isInputFocused()) return;
      if (cooldownRef.current || scrollAnimatingRef.current) return;

      let direction: Direction | null = null;

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        direction = 'forward';
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        direction = 'backward';
      }

      if (direction) {
        e.preventDefault();
        attemptTransition(direction);
      }
    };

    const onScrollEnd = () => {
      console.log('🏁 scrollend event fired - clearing scroll animation flag');
      scrollAnimatingRef.current = false;
      if (settleTimerRef.current) {
        console.log('🔄 Clearing settle timer (scrollend fired)');
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      emitDebug('scrollend fired');
    };

    // ============ EVENT LISTENERS ============

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('keydown', onKeyDown, { passive: false });
    el.addEventListener('scrollend', onScrollEnd);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('keydown', onKeyDown);
      el.removeEventListener('scrollend', onScrollEnd);
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };
  }, [containerRef, onIndexChange, getIndex, count, durationMs, thresholdPx, isInputFocused, checkContentLocks, navigationArray, emitDebug]);
}