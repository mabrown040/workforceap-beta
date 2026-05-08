import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
}

export function FormField({ label, children, required }: FormFieldProps) {
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--color-on-surface-variant)',
          marginBottom: '0.35rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--color-error)', marginLeft: '0.25rem' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '0.5rem 0.75rem',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-container-low)',
        color: 'var(--color-on-surface)',
        fontSize: '0.875rem',
        ...(props.style || {}),
      }}
    />
  );
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        width: '100%',
        padding: '0.5rem 0.75rem',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-container-low)',
        color: 'var(--color-on-surface)',
        fontSize: '0.875rem',
        ...(props.style || {}),
      }}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        width: '100%',
        padding: '0.5rem 0.75rem',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-container-low)',
        color: 'var(--color-on-surface)',
        fontSize: '0.875rem',
        minHeight: '5rem',
        resize: 'vertical',
        ...(props.style || {}),
      }}
    />
  );
}
