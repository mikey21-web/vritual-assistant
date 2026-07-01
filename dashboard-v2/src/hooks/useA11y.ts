import { useEffect, useRef } from 'react';

/**
 * Trap keyboard focus within a container — useful for modals and dialogs.
 * Tab cycles through focusable elements; Escape calls onEscape.
 */
export function useFocusTrap(active = true, onEscape?: () => void) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const focusable = () => Array.from(
      container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const elements = focusable();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handler);
    const elements = focusable();
    if (elements.length > 0) elements[0].focus();

    return () => container.removeEventListener('keydown', handler);
  }, [active, onEscape]);

  return containerRef;
}

/**
 * Announce a message to screen readers via aria-live region.
 */
export function useAnnouncer() {
  const announce = (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const region = document.getElementById('a11y-announcer') || (() => {
      const el = document.createElement('div');
      el.id = 'a11y-announcer';
      el.setAttribute('aria-live', politeness);
      el.setAttribute('aria-atomic', 'true');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      return el;
    })();
    region.textContent = '';
    setTimeout(() => { region.textContent = message; }, 100);
  };
  return announce;
}

/**
 * Keyboard shortcut handler.
 */
export function useKeyboardShortcut(key: string, callback: () => void, modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (modifiers.ctrl && !(e.ctrlKey || e.metaKey)) return;
      if (modifiers.shift && !e.shiftKey) return;
      if (modifiers.alt && !e.altKey) return;
      e.preventDefault();
      callback();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback]);
}
