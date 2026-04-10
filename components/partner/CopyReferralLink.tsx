'use client';

import { useState } from 'react';

export default function CopyReferralLink({ url }: { url: string }) {
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
    <div style={{ marginTop: '0.75rem' }}>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void copy()} aria-label="Copy referral link">
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
      </button>
    </div>
  );
}
