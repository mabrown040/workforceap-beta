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
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void copy()}>
        {state === 'copied' ? 'Copied!' : state === 'err' ? 'Copy failed — try again' : 'Copy link'}
      </button>
    </div>
  );
}
