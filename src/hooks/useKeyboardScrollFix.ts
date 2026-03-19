import { useEffect, MutableRefObject } from 'react';

/**
 * Scrolls to bottom when the mobile keyboard opens/closes, keeping the last
 * message visible. Required because iOS Safari shrinks the visual viewport
 * without resizing the layout viewport — the composer stays in place but the
 * content scrolls under it.
 *
 * @param enabled       - Whether the listener should be active (pass `open` for modals, `true` for pages).
 * @param isInputFocusedRef - Ref that is true when the composer input has focus.
 * @param scrollToBottomIfPinned - Called when the viewport resizes; caller is responsible for
 *                                 checking near-bottom state and performing the scroll.
 */
export function useKeyboardScrollFix(
  enabled: boolean,
  isInputFocusedRef: MutableRefObject<boolean>,
  scrollToBottomIfPinned: () => void,
): void {
  useEffect(() => {
    if (!enabled || !window.visualViewport) return;

    const handler = () => {
      if (isInputFocusedRef.current) scrollToBottomIfPinned();
    };

    window.visualViewport.addEventListener('resize', handler);
    return () => window.visualViewport?.removeEventListener('resize', handler);

    // `enabled` is the only dep that should re-register the listener.
    // `isInputFocusedRef` is a stable ref object; `scrollToBottomIfPinned`
    // closes over refs internally and is always current at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
