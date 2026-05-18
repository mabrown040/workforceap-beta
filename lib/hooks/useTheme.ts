'use client';

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'wap-theme';
const SYNC_EVENT = 'wap-theme-change';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    /* ignore */
  }
  return 'system';
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  } else {
    root.classList.remove('dark');
    root.removeAttribute('data-theme');
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent<{ theme: Theme }>(SYNC_EVENT, { detail: { theme } }));
}

/**
 * Read, write, and sync the portal theme preference.
 *
 * `theme`    – stored preference ('light' | 'dark' | 'system')
 * `resolved` – actual applied appearance ('light' | 'dark'), accounting for system preference
 * `setTheme` – update preference and apply immediately
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    setResolved(stored === 'system' ? getSystemTheme() : stored);

    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage || e.key !== STORAGE_KEY) return;
      const next: Theme = (e.newValue as Theme | null) ?? 'system';
      if (next === 'light' || next === 'dark' || next === 'system') {
        applyTheme(next);
        setThemeState(next);
        setResolved(next === 'system' ? getSystemTheme() : next);
      }
    };

    const onSync = (e: Event) => {
      const ce = e as CustomEvent<{ theme?: Theme }>;
      const next = ce.detail?.theme;
      if (next) {
        setThemeState(next);
        setResolved(next === 'system' ? getSystemTheme() : next);
      }
    };

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = () => {
      setThemeState((prev) => {
        if (prev === 'system') setResolved(getSystemTheme());
        return prev;
      });
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(SYNC_EVENT, onSync);
    mql.addEventListener('change', onMediaChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SYNC_EVENT, onSync);
      mql.removeEventListener('change', onMediaChange);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
    setResolved(next === 'system' ? getSystemTheme() : next);
  }, []);

  return { theme, resolved, setTheme };
}
