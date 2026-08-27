'use client';

import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { cloneElement, isValidElement, useId } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  full?: boolean;
  children?: ReactNode; // pass a <select> etc. instead of the default input
  ref?: Ref<HTMLInputElement>;
}

const CONTROL_STYLE = {
  marginTop: 4,
  width: '100%',
  fontSize: 14,
  border: '1px solid var(--wa-border)',
  borderRadius: 'var(--wa-radius-sm)',
  padding: '10px 12px',
  outline: 'none',
  background: 'var(--wa-surface)',
  color: 'var(--wa-text)',
} as const;

/** Labeled input/select field — kit-native `.wa-kit-field-label` on `--wa-*`. */
export function FormField({ label, full, children, id, ref, ...inputProps }: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const labeledChild = isValidElement<{ id?: string; className?: string }>(children)
    ? cloneElement(children, {
        id: children.props.id ?? fieldId,
        className: ['wa-kit-focus', children.props.className].filter(Boolean).join(' '),
      })
    : children;

  return (
    <div style={full ? { gridColumn: '1 / -1' } : undefined}>
      <label htmlFor={fieldId} className="wa-kit-field-label">
        {label}
      </label>
      {labeledChild ?? (
        <input
          {...inputProps}
          id={fieldId}
          ref={ref}
          className="wa-kit-focus"
          style={CONTROL_STYLE}
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

/** Settings toggle — kit-native track on `--wa-*`. */
export function Toggle({ checked = false, onChange, label = 'Toggle setting' }: ToggleProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="wa-kit-toggle" data-checked={checked ? 'true' : 'false'}>
      <input
        id={id}
        type="checkbox"
        className="wa-kit-toggle-input"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="wa-kit-toggle-track" aria-hidden="true">
        <span className="wa-kit-toggle-thumb" />
      </span>
      <span className="wa-kit-toggle-label">{label}</span>
    </label>
  );
}
