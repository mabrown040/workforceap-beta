'use client';

import { useState, useEffect } from 'react';
import { Mail, X, AlertCircle, Info } from 'lucide-react';

const MAX_SUBJECT = 200;
const MAX_BODY = 8000;

const TEMPLATE_VARS = [
  { key: 'firstName', example: "Maria" },
  { key: 'fullName', example: "Maria Garcia" },
  { key: 'email', example: "maria@email.com" },
  { key: 'programName', example: "Data Analytics" },
];

type Props = {
  open: boolean;
  memberIds: string[];
  onClose: () => void;
  onSent: (result: { sent: number; messagesCreated: number; total: number; errors: string[] }) => void;
};

export default function BulkEmailModal({ open, memberIds, onClose, onSent }: Props) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendAsEmail, setSendAsEmail] = useState(true);
  const [createMessage, setCreateMessage] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSubject('');
      setBody('');
      setSendAsEmail(true);
      setCreateMessage(true);
      setError(null);
      setSending(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) { setError('Subject is required.'); return; }
    if (!body.trim()) { setError('Message body is required.'); return; }
    if (!sendAsEmail && !createMessage) { setError('Choose at least one delivery method.'); return; }

    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/members/bulk-email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberIds,
          subject: subject.trim(),
          body: body.trim(),
          sendAsEmail,
          createMessage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Send failed. Please try again.');
        return;
      }
      onSent(data);
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-email-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-lg, 1rem)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-xl, 0 20px 40px rgba(0,0,0,0.25))',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--outline-variant, #e5e0dc)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={20} style={{ color: 'var(--color-accent)' }} />
            <h2 id="bulk-email-title" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
              Bulk Email
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{
              padding: '0.625rem 0.875rem',
              borderRadius: '0.625rem',
              background: 'rgba(173,44,77,0.1)',
              color: 'var(--color-accent)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div style={{
            padding: '0.625rem 0.875rem',
            borderRadius: '0.625rem',
            background: 'rgba(88,65,68,0.06)',
            color: 'var(--color-on-surface-variant)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}>
            <Info size={16} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
            <div>
              <strong>{memberIds.length}</strong> member{memberIds.length === 1 ? '' : 's'} selected.
              Use template variables in subject and body:
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                {TEMPLATE_VARS.map((v) => (
                  <code key={v.key} style={{
                    background: 'var(--color-white)',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    border: '1px solid var(--outline-variant)',
                  }}>
                    {'{'}{v.key}{'}'}
                  </code>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="bulkemailmodal-subject-field" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '0.375rem' }}>
              Subject
            </label>
            <input id="bulkemailmodal-subject-field"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick check-in, {firstName}"
              maxLength={MAX_SUBJECT}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--outline-variant)',
                background: 'var(--surface-container)',
                color: 'var(--color-on-surface)',
                fontSize: '0.875rem',
              }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', textAlign: 'right', marginTop: '0.25rem' }}>
              {subject.length}/{MAX_SUBJECT}
            </div>
          </div>

          <div>
            <label htmlFor="bulkemailmodal-message-field" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '0.375rem' }}>
              Message
            </label>
            <textarea id="bulkemailmodal-message-field"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {firstName},&#10;&#10;Just checking in on your progress with {programName}. Let us know if you need anything!"
              rows={6}
              maxLength={MAX_BODY}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--outline-variant)',
                background: 'var(--surface-container)',
                color: 'var(--color-on-surface)',
                fontSize: '0.875rem',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', textAlign: 'right', marginTop: '0.25rem' }}>
              {body.length}/{MAX_BODY}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sendAsEmail}
                onChange={(e) => setSendAsEmail(e.target.checked)}
              />
              Send as email
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={createMessage}
                onChange={(e) => setCreateMessage(e.target.checked)}
              />
              Post to member message threads
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={sending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={sending} aria-busy={sending}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {sending && (
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }} aria-hidden="true">
                    progress_activity
                  </span>
                )}
                {sending ? 'Sending…' : 'Send'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
