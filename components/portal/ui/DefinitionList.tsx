import type { ReactNode } from 'react';

interface DefinitionRowProps {
  label: string;
  value: string | null | boolean | Date | ReactNode;
  mono?: boolean;
}

function DefinitionRow({ label, value, mono }: DefinitionRowProps) {
  let display: ReactNode;
  if (typeof value === 'boolean') display = value ? 'Active' : 'Inactive';
  else if (value instanceof Date) display = value.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  else display = value != null && String(value).trim() ? String(value) : '—';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '1rem',
        padding: '0.625rem 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--color-on-surface-variant)',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '0.875rem',
          color: 'var(--color-on-surface)',
          fontFamily: mono ? 'ui-monospace, monospace' : undefined,
          wordBreak: 'break-all',
          textAlign: 'right',
        }}
      >
        {display}
      </span>
    </div>
  );
}

interface DefinitionListProps {
  children: ReactNode;
}

function DefinitionList({ children }: DefinitionListProps) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>{children}</div>;
}

export { DefinitionList, DefinitionRow };
export type { DefinitionRowProps, DefinitionListProps };
