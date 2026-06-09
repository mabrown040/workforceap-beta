'use client';

import { useState } from 'react';
import type { Program } from '@/lib/content/programs';

export default function WaitlistSection({ program }: { program: Program }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), programSlug: program.slug }),
      });
      const data = await res.json().catch(() => ({ error: 'Unknown error' }));
      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'You have been added to the waitlist.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          borderRadius: '12px',
          background: 'rgba(34, 139, 34, 0.08)',
          border: '1px solid rgba(34, 139, 34, 0.25)',
          textAlign: 'center',
        }}
      >
        <p
          className="material-symbols-outlined"
          style={{ fontSize: '2rem', color: '#228b22', marginBottom: '0.5rem' }}
          aria-hidden="true"
        >
          check_circle
        </p>
        <p style={{ fontWeight: 700, color: '#228b22', marginBottom: '0.25rem' }}>
          You&apos;re on the list
        </p>
        <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
          {message}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        padding: '1.5rem',
        borderRadius: '12px',
        background: 'var(--surface-container-low)',
        border: '1px solid var(--outline-variant)',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <p className="text-label-upper" style={{ color: 'var(--color-accent)', margin: '0 0 0.4rem' }}>
          Waitlist
        </p>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-on-surface)' }}>
          Notify me when this program opens
        </h2>
      </div>
      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.6 }}>
        No application needed. We&apos;ll email you as soon as a spot becomes available.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          required
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'submitting'}
          style={{
            flex: '1 1 200px',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--outline-variant)',
            background: 'var(--surface-container)',
            color: 'var(--color-on-surface)',
            fontSize: '0.95rem',
          }}
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="btn btn-primary"
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(234, 88, 12, 0.15)',
            color: '#ea580c',
            border: '1px solid rgba(234, 88, 12, 0.35)',
          }}
        >
          {status === 'submitting' ? 'Submitting…' : 'Notify Me'}
        </button>
      </form>
      {status === 'error' && (
        <p role="alert" style={{ marginTop: '0.75rem', color: '#dc2626', fontSize: '0.85rem' }}>
          {message}
        </p>
      )}
    </div>
  );
}
