'use client';

import { Moon, Sun } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'wa_color_mode';
const SYNC_EVENT = 'wa-color-mode';

function applyMode(dark: boolean) {
  const root = document.documentElement;
  if (dark) root.classList.add('dark');
  else root.classList.remove('dark');
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    /* ignore */
  }
}

export default function ThemeToggle({
  className,
  variant = 'marketing',
}: {
  className?: string;
  variant?: 'marketing' | 'portal';
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.storageArea !== localStorage) return;
      const next = e.newValue === 'dark';
      applyMode(next);
      setDark(next);
    };
    const onSync = (e: Event) => {
      const ce = e as CustomEvent<{ dark?: boolean }>;
      if (typeof ce.detail?.dark === 'boolean') setDark(ce.detail.dark);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(SYNC_EVENT, onSync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SYNC_EVENT, onSync);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    applyMode(next);
    setDark(next);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { dark: next } }));
  }, []);

  const portalClasses =
    'wa-inline-flex wa-h-10 wa-w-10 wa-items-center wa-justify-center wa-rounded-lg wa-border wa-border-slate-300 wa-bg-white wa-text-slate-900 wa-transition-colors hover:wa-bg-slate-50 focus-visible:wa-outline-none focus-visible:wa-ring-2 focus-visible:wa-ring-brand-accent focus-visible:wa-ring-offset-2 dark:wa-border-slate-600 dark:wa-bg-slate-800 dark:wa-text-white dark:hover:wa-bg-slate-700';
  const marketingClasses =
    'wa-inline-flex wa-h-10 wa-w-10 wa-items-center wa-justify-center wa-rounded-full wa-border wa-border-slate-300 wa-bg-white/95 wa-p-1.5 wa-text-slate-900 wa-transition-colors hover:wa-bg-white focus-visible:wa-outline-none focus-visible:wa-ring-2 focus-visible:wa-ring-white focus-visible:wa-ring-offset-2 focus-visible:wa-ring-offset-[#111] dark:wa-border-white/20 dark:wa-bg-white/10 dark:wa-text-white dark:hover:wa-bg-white/20';

  return (
    <button
      type="button"
      onClick={toggle}
      className={className ?? (variant === 'portal' ? portalClasses : marketingClasses)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? (
        <Sun size={20} strokeWidth={2} className="wa-shrink-0" aria-hidden />
      ) : (
        <Moon size={20} strokeWidth={2} className="wa-shrink-0 wa-text-slate-900 dark:wa-text-white" aria-hidden />
      )}
    </button>
  );
}
