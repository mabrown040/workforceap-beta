'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { cloneElement, isValidElement, useId } from 'react';
import { Field } from '@astryxdesign/core/Field';
import { Switch } from '@astryxdesign/core/Switch';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  full?: boolean;
  children?: ReactNode; // pass a <select> etc. instead of the default input
}

/** Labeled input/select field — Astryx `Field` + `FieldLabel`. */
export function FormField({ label, full, children, id, ...inputProps }: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const labeledChild = isValidElement<{ id?: string; className?: string }>(children)
    ? cloneElement(children, {
        id: children.props.id ?? fieldId,
        className: ['wa-kit-focus', children.props.className].filter(Boolean).join(' '),
      })
    : children;

  return (
    <Field label={label} inputID={fieldId} style={full ? { gridColumn: '1 / -1' } : undefined}>
      {labeledChild ?? (
        <input
          {...inputProps}
          id={fieldId}
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
    </Field>
  );
}

interface ToggleProps {
  checked?: boolean;
  onChange?: (v: boolean) => void;
  label?: string;
}

/** Settings toggle — Astryx `Switch`. */
export function Toggle({ checked = false, onChange, label = 'Toggle setting' }: ToggleProps) {
  return <Switch label={label} value={checked} onChange={(v) => onChange?.(v)} />;
}
