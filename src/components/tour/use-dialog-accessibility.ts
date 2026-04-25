'use client';

import { RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

type UseDialogAccessibilityOptions = {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onEscape?: () => void;
};

export function useDialogAccessibility({ active, containerRef, onEscape }: UseDialogAccessibilityOptions) {
  useEffect(() => {
    if (!active) return;

    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const container = containerRef.current;

    if (!container) return;

    const focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const currentFocusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      );

      if (currentFocusableElements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const firstElement = currentFocusableElements[0];
      const lastElement = currentFocusableElements[currentFocusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || activeElement === container) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [active, containerRef, onEscape]);
}
