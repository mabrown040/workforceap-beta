'use client';

import type { ReactNode } from 'react';
import { Theme } from '@astryxdesign/core';
import { neutralTheme } from '@astryxdesign/theme-neutral';

/**
 * Client boundary for the Astryx <Theme> provider (neutral theme, runtime
 * injection). Kept out of the layout file so the layout itself can stay a
 * server component that owns the CSS imports.
 */
export default function AstryxThemeProvider({ children }: { children: ReactNode }) {
  return <Theme theme={neutralTheme}>{children}</Theme>;
}
