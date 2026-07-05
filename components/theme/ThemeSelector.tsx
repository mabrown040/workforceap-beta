'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/hooks/useTheme';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: active
                ? '1.5px solid var(--color-accent, #2563eb)'
                : '1.5px solid var(--wa-border, #e2e8f0)',
              background: active
                ? 'color-mix(in srgb, var(--color-accent, #2563eb) 10%, transparent)'
                : 'transparent',
              color: active
                ? 'var(--color-accent, #2563eb)'
                : 'var(--wa-text, #334155)',
              transition: 'border-color 150ms, background 150ms, color 150ms',
            }}
          >
            <Icon size={16} strokeWidth={2} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
