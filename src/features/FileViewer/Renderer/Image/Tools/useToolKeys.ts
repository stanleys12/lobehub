import { useEffect, useRef } from 'react';

interface ToolKeyHandlers {
  onEnter?: () => void;
  onEscape?: () => void;
  onUndo?: () => void;
}

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Keyboard shortcuts for an active tool mode: Esc cancels, Enter completes,
 * ⌘/Ctrl+Z undoes. Ignored while the user is typing into a field.
 */
export const useToolKeys = (handlers: ToolKeyHandlers) => {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) return;
      const { onEnter, onEscape, onUndo } = ref.current;

      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
      } else if (event.key === 'Enter' && onEnter && !event.shiftKey) {
        event.preventDefault();
        onEnter();
      } else if (event.key.toLowerCase() === 'z' && (event.metaKey || event.ctrlKey) && onUndo) {
        event.preventDefault();
        onUndo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
};
