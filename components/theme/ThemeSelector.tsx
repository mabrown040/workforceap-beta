'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { useTheme, type Theme } from '@/lib/hooks/useTheme';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
];

/**
 * Appearance picker (profile settings) — Astryx SegmentedControl over the
 * app's own theme system (`useTheme` still owns the html.dark/data-theme
 * flip); the control's colors resolve through the shared token names, so it
 * follows the brand accent and dark mode automatically.
 */
export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <SegmentedControl value={theme} onChange={(v) => setTheme(v as Theme)} label="Appearance" size="md">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <SegmentedControlItem key={value} value={value} label={label} icon={<Icon size={16} strokeWidth={2} aria-hidden />} />
      ))}
    </SegmentedControl>
  );
}
