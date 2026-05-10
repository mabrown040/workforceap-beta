import { cloneElement, isValidElement, type ReactElement, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  /** Associates the label with a control and wires aria-describedby for hint/error. */
  id?: string;
  hint?: ReactNode;
  error?: string;
}

export function FormField({ label, children, required, id, hint, error }: FormFieldProps) {
  const hintId = id && hint ? `${id}-hint` : undefined;
  const errorId = id && error ? `${id}-error` : undefined;
  const describedParts = [hintId, errorId].filter(Boolean) as string[];
  const describedBy = describedParts.length > 0 ? describedParts.join(' ') : undefined;

  let control: ReactNode = children;
  if (id && isValidElement(children)) {
    const child = children as ReactElement<
      { style?: React.CSSProperties; className?: string; [key: string]: unknown }
    >;
    const { style: prevStyle, className: prevClass, ...rest } = child.props;
    control = cloneElement(child, {
      ...rest,
      id,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy,
      'aria-required': required ? true : undefined,
      className: [prevClass, error ? 'portal-form-control--invalid' : ''].filter(Boolean).join(' ') || undefined,
      style: {
        ...prevStyle,
        ...(error
          ? {
              borderColor: 'var(--color-error)',
              boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-error) 22%, transparent)',
            }
          : {}),
      },
    } as never);
  }

  return (
    <div className="portal-form-field" style={{ marginBottom: '1rem' }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--color-on-surface)',
          marginBottom: '0.4rem',
          lineHeight: 1.35,
        }}
      >
        {label}
        {required ? (
          <abbr title="Required" className="form-required-abbr">
            *
          </abbr>
        ) : null}
      </label>
      {hint ? (
        <p id={hintId} className="form-hint portal-form-field__hint">
          {hint}
        </p>
      ) : null}
      {control}
      {error ? (
        <span id={errorId} className="form-error" role="alert" style={{ marginTop: '0.375rem' }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '0.6rem 0.85rem',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-container-low)',
        color: 'var(--color-on-surface)',
        fontSize: '0.875rem',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
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
        padding: '0.6rem 0.85rem',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-container-low)',
        color: 'var(--color-on-surface)',
        fontSize: '0.875rem',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
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
        padding: '0.6rem 0.85rem',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-container-low)',
        color: 'var(--color-on-surface)',
        fontSize: '0.875rem',
        minHeight: '5rem',
        resize: 'vertical',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        ...(props.style || {}),
      }}
    />
  );
}
