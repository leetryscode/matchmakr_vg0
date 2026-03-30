import { useEffect, useRef, MutableRefObject } from 'react';
import { SCROLL_PIN_THRESHOLD_PX } from '@/constants/chat';

/**
 * Keeps the chat scroll position stable through keyboard open/close on mobile.
 *
 * Behaviour on viewport resize (keyboard open or dismiss, or device rotation):
 *   - User is pinned to bottom  → calls scrollToBottomIfPinned() to keep latest message visible.
 *   - User is scrolled up       → restores the same distance-from-bottom so the same messages
 *                                  remain visible after the viewport grows or shrinks.
 *
 * The handler is debounced 120 ms so it fires after iOS Safari's keyboard animation settles,
 * preventing a double-correction during the transition.
 *
 * The listener is active whenever `enabled` is true — it is NOT scoped to input focus.
 * Viewport resize events only fire during keyboard transitions or device rotation, so
 * keeping the listener mounted at all times is negligible overhead and avoids the gap
 * where a focus change happens before the keyboard dismisses.
 *
 * @param enabled              - Whether the listener should be active (pass `open` for modals,
 *                               `true` for pages).
 * @param scrollContainerRef   - Ref to the scrollable message container element.
 * @param scrollToBottomIfPinned - Called when the viewport resizes and the user is pinned to
 *                                 bottom; caller is responsible for the actual scroll logic.
 */
export function useKeyboardScrollFix(
  enabled: boolean,
  scrollContainerRef: MutableRefObject<HTMLElement | null>,
  scrollToBottomIfPinned: () => void,
): void {
  const prevViewportHeightRef = useRef<number>(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.visualViewport) return;

    // Capture the baseline height when the listener activates so the first resize
    // event has a valid "previous" height to diff against.
    prevViewportHeightRef.current = window.visualViewport.height;

    const handler = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const currentHeight = vv.height;
        const heightChange = currentHeight - prevViewportHeightRef.current;
        prevViewportHeightRef.current = currentHeight;

        const container = scrollContainerRef.current;
        if (!container) {
          // No container available — fall back to the original pinned-scroll callback.
          scrollToBottomIfPinned();
          return;
        }

        const distFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight;

        if (distFromBottom < SCROLL_PIN_THRESHOLD_PX) {
          // User is pinned to bottom — keep them anchored there.
          scrollToBottomIfPinned();
        } else if (heightChange !== 0) {
          // User is scrolled up reading history. The viewport height changed (keyboard
          // opened or dismissed), which shifts clientHeight and changes distFromBottom.
          //
          // Derivation: distBefore = distAfter + heightChange
          // To restore distBefore: newScrollTop = scrollTop - heightChange
          //   • heightChange > 0 (keyboard dismissed, viewport taller): scrollTop decreases,
          //     keeping the same messages at the bottom of the visible area.
          //   • heightChange < 0 (keyboard opened, viewport shorter): scrollTop increases,
          //     keeping the same messages at the bottom of the visible area.
          container.scrollTop = Math.max(0, container.scrollTop - heightChange);
        }
      }, 120);
    };

    window.visualViewport.addEventListener('resize', handler);
    return () => {
      window.visualViewport?.removeEventListener('resize', handler);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };

    // `enabled` is the only dep that should re-register the listener.
    // scrollContainerRef and scrollToBottomIfPinned are stable at runtime
    // (refs don't change identity; callback closes over stable refs internally).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
