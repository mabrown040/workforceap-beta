'use client';

import { useState } from 'react';

export default function PartnerCopyTextButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied!',
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'err'>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      window.setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('err');
      window.setTimeout(() => setState('idle'), 3000);
    }
  };

  return (
    <button type="button" className="btn btn-muted btn-sm" onClick={() => void copy()}>
      <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        {state === 'copied' ? (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden>
              check
            </span>
            {copiedLabel}
          </>
        ) : state === 'err' ? (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden>
              error
            </span>
            Copy failed
          </>
        ) : (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden>
              content_copy
            </span>
            {label}
          </>
        )}
      </span>
    </button>
  );
}
