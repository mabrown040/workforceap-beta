'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  full?: boolean;
  children?: ReactNode; // pass a <select> etc. instead of the default input
}

/** Labeled input/select field. Mockup: profile/settings forms. */
export function FormField({ label, full, children, ...inputProps }: FormFieldProps) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : undefined}>
      <label className="wa-kit-stat-label">{label}</label>
      {children ?? (
        <input
          {...inputProps}
          className="wa-kit-focus"
          style={{
            marginTop: 4,
            width: '100%',
            fontSize: 14,
            border: '1px solid var(--wa-border)',
            borderRadius: 'var(--wa-radius-sm)',
            padding: '10px 12px',
            outline: 'none',
            background: 'var(--wa-surface)',
            color: 'var(--wa-text)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        />
      )}
    </div>
  );
}

interface ToggleProps {
  checked?: boolean;
  onChange?: (v: boolean) => void;
  label?: string;
}

/** Crimson switch. Mockup: notification preference toggles. */
export function Toggle({ checked = false, onChange, label }: ToggleProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 12 }}>
      {label ? <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span> : null}
      <span style={{ position: 'relative', display: 'inline-block', width: 40, height: 24, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          aria-label={label}
          className="wa-kit-focus"
          style={{ position: 'absolute', inset: 0, margin: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', borderRadius: 999 }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 999,
            background: checked ? 'var(--wa-accent)' : 'var(--wa-border)',
            transition: 'background-color .15s',
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: 2,
            top: 2,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: 'var(--wa-surface)',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform .15s',
          }}
        />
      </span>
    </label>
  );
}
