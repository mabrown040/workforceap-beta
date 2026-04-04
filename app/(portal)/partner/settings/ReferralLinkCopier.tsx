'use client';

import { useState } from 'react';

export default function ReferralLinkCopier({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the input
      const el = document.getElementById('referral-link-input') as HTMLInputElement | null;
      el?.select();
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        id="referral-link-input"
        readOnly
        value={link}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '0.5rem 0.75rem',
          fontSize: '0.8rem',
          fontFamily: 'ui-monospace, monospace',
          background: 'var(--surface-container-low, var(--surface-container))',
          color: 'var(--color-on-surface)',
          border: '1px solid var(--outline-variant)',
          borderRadius: '0.375rem',
          outline: 'none',
        }}
        onFocus={e => e.target.select()}
      />
      <button
        type="button"
        onClick={handleCopy}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          borderRadius: '0.375rem',
          border: 'none',
          cursor: 'pointer',
          background: copied ? 'var(--color-success, #16a34a)' : 'var(--color-accent, var(--md-sys-color-primary))',
          color: '#fff',
          whiteSpace: 'nowrap',
          transition: 'background 0.2s',
        }}
      >
        {copied ? '✓ Copied' : 'Copy link'}
      </button>
    </div>
  );
}
