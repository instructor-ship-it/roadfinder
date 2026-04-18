/**
 * Focus Trap Component
 *
 * Traps focus within a container element, useful for modals, dialogs,
 * and other overlay components.
 *
 * @see https://www.w3.org/WAI/WCAG21/Techniques/client-side-script/SCR52
 */

'use client';

import { useEffect, useRef, useCallback, ReactNode, RefObject } from 'react';

interface FocusTrapProps {
  children: ReactNode;
  /** Whether the trap is active */
  active?: boolean;
  /** Element to focus when trap activates */
  initialFocusRef?: RefObject<HTMLElement>;
  /** Element to focus when trap deactivates */
  finalFocusRef?: RefObject<HTMLElement>;
  /** Called when Escape is pressed */
  onEscape?: () => void;
  /** Whether to restore focus on unmount */
  restoreFocus?: boolean;
}

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), ' +
      'a[href], ' +
      'input:not([disabled]), ' +
      'select:not([disabled]), ' +
      'textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"]):not([disabled])'
  );

  return Array.from(elements).filter((el) => {
    // Check visibility
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
  });
}

/**
 * Focus Trap component for accessibility
 *
 * @example
 * <FocusTrap active={isOpen} onEscape={() => setIsOpen(false)}>
 *   <dialog>
 *     <button>Close</button>
 *   </dialog>
 * </FocusTrap>
 */
export function FocusTrap({
  children,
  active = true,
  initialFocusRef,
  finalFocusRef,
  onEscape,
  restoreFocus = true,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element when trap activates
  useEffect(() => {
    if (active && typeof document !== 'undefined') {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [active]);

  // Focus the initial element when trap activates
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const focusElement = initialFocusRef?.current;
    if (focusElement) {
      focusElement.focus();
    } else {
      // Focus the first focusable element
      const focusable = getFocusableElements(containerRef.current);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }, [active, initialFocusRef]);

  // Restore focus when trap deactivates
  useEffect(() => {
    if (!active && restoreFocus) {
      const finalFocus = finalFocusRef?.current || previousFocusRef.current;
      if (finalFocus && typeof finalFocus.focus === 'function') {
        finalFocus.focus();
      }
    }
  }, [active, restoreFocus, finalFocusRef]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!active) return;

      // Handle Escape key
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      // Handle Tab key for focus trapping
      if (event.key === 'Tab' && containerRef.current) {
        const focusable = getFocusableElements(containerRef.current);
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (event.shiftKey) {
          // Shift+Tab - focus previous element
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab - focus next element
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [active, onEscape]
  );

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} style={{ outline: 'none' }}>
      {children}
    </div>
  );
}

/**
 * Hook to manage focus trap programmatically
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement>, active: boolean = true) {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first element
    const focusable = getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, active]);
}

export default FocusTrap;
