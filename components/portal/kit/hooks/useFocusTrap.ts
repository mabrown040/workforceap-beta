'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Portal Design Kit — focus trap with a shared Escape stack.
 *
 * Port of the Astryx `useFocusTrap` pattern (docs/ASTRYX_LESSONS.md, Lesson 4)
 * for kit overlays (dialogs, drawers, menus). Differences from the legacy
 * `hooks/useFocusTrap.ts`:
 *
 *  - **Escape stack:** traps register on a module-level stack, so nested
 *    layers (e.g. a menu inside a dialog, or drawer + tour) each consume ONE
 *    Escape, top-most first, instead of all closing at once.
 *  - **Visibility-aware filtering:** hidden/collapsed elements
 *    (`display:none`, zero-size, `[hidden]`) are excluded from the tab ring.
 *  - **IME guard:** an Escape that cancels IME composition never closes the
 *    layer.
 *  - **Focus restore:** focus returns to the element focused when the trap
 *    activated (typically the trigger), matching native `<dialog>` behavior.
 *
 * Prefer native `<dialog>.showModal()` when building a kit Dialog — this hook
 * is for the drawer/popover cases where that isn't available.
 */

type TrapEntry = { root: HTMLElement; onEscape?: () => void };

/** Top-most trap consumes Escape; one keydown listener for the whole stack. */
const escapeStack: TrapEntry[] = [];
let stackListenerAttached = false;

function isImeKeyEvent(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229;
}

function onStackKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || isImeKeyEvent(e)) return;
  const top = escapeStack[escapeStack.length - 1];
  if (!top) return;
  e.preventDefault();
  e.stopPropagation();
  top.onEscape?.();
}

function pushTrap(entry: TrapEntry) {
  escapeStack.push(entry);
  if (!stackListenerAttached) {
    // Capture phase so a layer's own Escape handlers can't double-fire.
    document.addEventListener('keydown', onStackKeyDown, true);
    stackListenerAttached = true;
  }
}

function popTrap(entry: TrapEntry) {
  const i = escapeStack.indexOf(entry);
  if (i !== -1) escapeStack.splice(i, 1);
  if (escapeStack.length === 0 && stackListenerAttached) {
    document.removeEventListener('keydown', onStackKeyDown, true);
    stackListenerAttached = false;
  }
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function isVisible(el: HTMLElement): boolean {
  if (el.closest('[hidden]')) return false;
  // `display` is not inherited, so an ancestor with display:none does NOT
  // show up on the element's own computed style — walk the chain. (Style-based
  // rather than offsetParent/getBoundingClientRect so it also behaves in
  // layout-less environments like jsdom.) `visibility` IS inherited, so the
  // first iteration covers it.
  let node: HTMLElement | null = el;
  while (node) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    node = node.parentElement;
  }
  return true;
}

export function getFocusable(root: HTMLElement): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(nodes).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.closest('[inert]')) return false;
    return isVisible(el);
  });
}

export interface FocusTrapOptions {
  /** Called when this trap is the top of the Escape stack and Escape fires. */
  onEscape?: () => void;
  /** Skip moving focus into the container on activate (default false). */
  skipInitialFocus?: boolean;
}

/**
 * While `active`, keeps Tab focus inside the returned ref's subtree and
 * registers on the shared Escape stack. Restores focus on deactivate.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  active: boolean,
  options: FocusTrapOptions | (() => void) = {}
): RefObject<T | null> {
  // Back-compat with the legacy `(active, onEscape)` call shape.
  const opts: FocusTrapOptions = typeof options === 'function' ? { onEscape: options } : options;
  const ref = useRef<T | null>(null);
  const onEscapeRef = useRef(opts.onEscape);
  onEscapeRef.current = opts.onEscape;
  const skipInitialFocus = opts.skipInitialFocus ?? false;

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const entry: TrapEntry = { root, onEscape: () => onEscapeRef.current?.() };
    pushTrap(entry);

    const initialFocusTimer = skipInitialFocus
      ? null
      : window.setTimeout(() => getFocusable(root)[0]?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      // Only the top-most trap manages the tab ring.
      if (escapeStack[escapeStack.length - 1] !== entry) return;
      const list = getFocusable(root);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      const contained = activeEl ? root.contains(activeEl) : false;
      if (!contained) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey) {
        if (activeEl === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      if (initialFocusTimer !== null) window.clearTimeout(initialFocusTimer);
      document.removeEventListener('keydown', onKeyDown);
      popTrap(entry);
      previouslyFocused?.focus?.();
    };
  }, [active, skipInitialFocus]);

  return ref;
}
