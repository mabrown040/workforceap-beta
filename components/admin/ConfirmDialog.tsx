'use client';

import { useId, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** Dialog body — plain text or richer markup. */
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive and shows a warning icon. */
  danger?: boolean;
  /** Disables both buttons and swaps the confirm label while the action runs. */
  busy?: boolean;
  /** Dialog card max width in px. Defaults to 420 (previous hardcoded value). */
  maxWidth?: number;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Shared styled confirmation dialog for admin/portal flows — replaces native
 * `window.confirm()`. Focus-trapped (Tab cycles inside, Escape cancels via
 * useFocusTrap, focus returns to the trigger on close); backdrop click cancels.
 * Follows the confirmAction dialog pattern in MembersTable.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  maxWidth = 420,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const close = () => {
    if (!busy) onCancel();
  };
  const trapRef = useFocusTrap(open, close);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal, 1100)',
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        ref={trapRef as React.RefObject<HTMLDivElement>}
        style={{
          background: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-lg, 1rem)',
          width: '100%',
          maxWidth: `${maxWidth}px`,
          boxShadow: 'var(--shadow-xl, 0 20px 40px rgba(0,0,0,0.25))',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--outline-variant, #e5e0dc)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {danger && <AlertTriangle size={20} style={{ color: 'var(--wa-danger, #dc2626)', flexShrink: 0 }} aria-hidden />}
          <h2 id={titleId} style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
            {title}
          </h2>
        </div>
        <div style={{ padding: '1.25rem 1.5rem' }}>
          {typeof body === 'string' ? (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>{body}</p>
          ) : (
            body
          )}
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--outline-variant, #e5e0dc)', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn' : 'btn btn-primary'}
            style={danger ? { background: 'var(--wa-danger, #dc2626)', color: '#fff', border: 'none' } : undefined}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
