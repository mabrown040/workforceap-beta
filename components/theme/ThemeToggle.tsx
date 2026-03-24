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

  const base =
    variant === 'portal'
      ? 'theme-toggle-btn theme-toggle-btn--surface'
      : 'theme-toggle-btn';

  return (
    <button
      type="button"
      onClick={toggle}
      className={className ?? base}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun size={20} strokeWidth={2} aria-hidden /> : <Moon size={20} strokeWidth={2} aria-hidden />}
    </button>
  );
}
