'use client';

import { useState } from 'react';

export default function RequestHelpButton() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleClick() {
    if (state === 'sending' || state === 'sent') return;
    setState('sending');
    try {
      const res = await fetch('/api/member/request-help', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      setState('sent');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  const label =
    state === 'sending' ? 'Sending…' :
    state === 'sent' ? 'Request sent' :
    state === 'error' ? 'Failed — try again' :
    'Request Help';

  const icon =
    state === 'sent' ? 'check_circle' :
    state === 'error' ? 'error' :
    'support_agent';

  return (
    <button
      onClick={handleClick}
      disabled={state === 'sending' || state === 'sent'}
      className="btn btn-outline"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.8125rem',
        fontWeight: 700,
        cursor: state === 'sent' ? 'default' : 'pointer',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span aria-live="polite">{label}</span>
    </button>
  );
}
