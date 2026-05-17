'use client';

import { useState } from 'react';

export default function CopyReferralLink({
  url,
  referralCodeDisplay,
}: {
  url: string;
  /** Shown beside actions so partners can read their code aloud or type it elsewhere. */
  referralCodeDisplay?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'err'>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
      window.setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('err');
      window.setTimeout(() => setState('idle'), 3000);
    }
  };

  return (
    <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
      {referralCodeDisplay ? (
        <span
          className="partner-referral-code-chip"
          title="Applicants can also cite this code during intake."
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '999px',
            border: '1px solid rgba(173,44,77,0.22)',
            background: 'rgba(173,44,77,0.06)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            fontFamily: 'ui-monospace, monospace',
            color: 'var(--color-on-surface)',
          }}
        >
          <span style={{ opacity: 0.75, fontWeight: 600, fontFamily: 'inherit' }}>Code</span>
          {referralCodeDisplay}
        </span>
      ) : null}
      <button type="button" className="btn btn-muted btn-sm" onClick={() => void copy()}>
        <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {state === 'copied' ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: '4px' }} aria-hidden="true">check</span>
              Copied!
            </>
          ) : state === 'err' ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: '4px' }} aria-hidden="true">error</span>
              Copy failed — try again
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: '4px' }} aria-hidden="true">link</span>
              Copy link
            </>
          )}
        </span>
      </button>
    </div>
  );
}
