import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

type BaseProps = {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
};

export function PortalInput({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  const inputId = id ?? props.name;
  const describedById = hint || error ? `${inputId ?? 'portal-input'}__hint` : undefined;
  return (
    <label className={clsx('portal-field', className)}>
      {label ? <span className="portal-field__label">{label}</span> : null}
      <input
        id={inputId}
        className={clsx('portal-input', error && 'portal-input--error')}
        aria-invalid={!!error}
        aria-describedby={describedById}
        {...props}
      />
      {hint || error ? (
        <span id={describedById} className={clsx('portal-field__hint', error && 'portal-field__hint--error')}>
          {error ?? hint}
        </span>
      ) : null}
    </label>
  );
}

export function PortalTextarea({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>) {
  const inputId = id ?? props.name;
  const describedById = hint || error ? `${inputId ?? 'portal-textarea'}__hint` : undefined;
  return (
    <label className={clsx('portal-field', className)}>
      {label ? <span className="portal-field__label">{label}</span> : null}
      <textarea
        id={inputId}
        className={clsx('portal-input portal-textarea', error && 'portal-input--error')}
        aria-invalid={!!error}
        aria-describedby={describedById}
        {...props}
      />
      {hint || error ? (
        <span id={describedById} className={clsx('portal-field__hint', error && 'portal-field__hint--error')}>
          {error ?? hint}
        </span>
      ) : null}
    </label>
  );
}

