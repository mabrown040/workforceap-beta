'use client';

import type { RefObject } from 'react';
import { useFocusTrap as useKitFocusTrap } from '@/components/portal/kit/hooks/useFocusTrap';

/**
 * DEPRECATED shim — delegates to the kit focus trap
 * (`components/portal/kit/hooks/useFocusTrap.ts`), which adds the shared
 * Escape stack (nested layers each consume one Escape), visibility-aware
 * focusable filtering, and an IME composition guard. Same call shape and
 * behavior otherwise (initial focus, Tab wrap, focus restore).
 *
 * New code should import from '@/components/portal/kit' directly.
 */
export function useFocusTrap(active: boolean, onEscape?: () => void): RefObject<HTMLElement | null> {
  return useKitFocusTrap<HTMLElement>(active, { onEscape });
}
