'use client';

import { Moon, Sun } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { useTheme, type Theme } from '@/lib/hooks/useTheme';

const CYCLE: Theme[] = ['light', 'dark', 'system'];

function nextTheme(current: Theme): Theme {
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length];
}

function themeLabel(t: Theme): string {
  switch (t) {
    case 'light':
      return 'Light';
    case 'dark':
      return 'Dark';
    case 'system':
      return 'System';
  }
}

export default function ThemeToggle({
  className,
  variant = 'marketing',
}: {
  className?: string;
  variant?: 'marketing' | 'portal';
}) {
  const { theme, resolved, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setTheme(nextTheme(theme));
  }, [theme, setTheme]);

  const portalClasses = 'portal-icon-btn wa-theme-toggle wa-kit-focus';
  const marketingClasses =
    'wa-inline-flex wa-h-10 wa-w-10 wa-items-center wa-justify-center wa-rounded-full wa-border wa-border-slate-300 wa-bg-white/95 wa-p-1.5 wa-text-slate-900 wa-transition-colors hover:wa-bg-white focus-visible:wa-outline-none focus-visible:wa-ring-2 focus-visible:wa-ring-white focus-visible:wa-ring-offset-2 focus-visible:wa-ring-offset-[#111] dark:wa-border-white/20 dark:wa-bg-white/10 dark:wa-text-white dark:hover:wa-bg-white/20';

  const modeLabel = themeLabel(theme);
  const next = themeLabel(nextTheme(theme));

  return (
    <button
      type="button"
      onClick={toggle}
      className={className ?? (variant === 'portal' ? portalClasses : marketingClasses)}
      aria-label={`Theme: ${modeLabel}. Click to switch to ${next}`}
      title={`Theme: ${modeLabel} — click for ${next}`}
      suppressHydrationWarning
    >
      {!mounted ? (
        // Render invisible placeholder until mounted to avoid SSR/CSR icon mismatch.
        <span aria-hidden style={{ width: 20, height: 20, display: 'inline-block' }} />
      ) : resolved === 'dark' ? (
        <Sun size={20} strokeWidth={2} className="wa-shrink-0" aria-hidden />
      ) : (
        <Moon size={20} strokeWidth={2} className="wa-shrink-0" aria-hidden />
      )}
    </button>
  );
}
