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

  const fallbackLink = (
    <a href={url} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', marginLeft: '0.5rem' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: '4px' }} aria-hidden="true">open_in_new</span>
      Open link
    </a>
  );

  return (
    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void copy()} aria-label={state === 'copied' ? 'Copied referral link' : state === 'err' ? 'Copy failed — try again' : 'Copy referral link'}>
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
      {state === 'err' && fallbackLink}
    </div>
  );
}
