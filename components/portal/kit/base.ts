import type { CSSProperties, Ref } from 'react';

/**
 * Portal Design Kit — shared escape-hatch contract for kit primitives.
 *
 * Every kit primitive accepts these so a page can add a margin tweak, a test
 * id, or an imperative ref WITHOUT wrapping the component in a div. Rules:
 *
 *  - Merge order is deterministic and identical everywhere: internal styles
 *    first, consumer `className` / `style` LAST — consumer overrides always
 *    win predictably.
 *  - `ref` is a plain prop (React 19 style; no forwardRef indirection).
 *  - `data-*` attributes pass straight through to the root element.
 *
 * This is deliberately the whole surface: no `asChild`, no style-slot props.
 * See docs/KIT_GUIDE.md §5.
 */
export interface KitBaseProps<E extends HTMLElement = HTMLElement> {
  className?: string;
  style?: CSSProperties;
  ref?: Ref<E>;
}

/** Open `data-*` passthrough (typed separately so it can be `...rest`-spread). */
export type KitDataAttrs = { [key: `data-${string}`]: string | number | boolean | undefined };

/** Joins class names, skipping falsy values. Consumer classes go last. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
