'use client';

import { useState } from 'react';

/**
 * Copy-to-clipboard button for the referral/warm-intro message template on
 * the job detail page (server-rendered text lives in page.tsx — this is just
 * the client-side affordance to copy it with "copied" feedback).
 */
export default function ReferralCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the text is still visible to select manually */
    }
  }

  return (
    <button
      type="button"
      className="wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
      style={{
        minHeight: 44,
        padding: '10px 16px',
        background: 'transparent',
        color: 'var(--wa-accent)',
        border: '1px solid var(--wa-border)',
        fontWeight: 600,
        fontSize: 14,
        borderRadius: 999,
        cursor: 'pointer',
      }}
      onClick={() => void handleCopy()}
    >
      <span aria-live="polite">{copied ? 'Copied' : 'Copy message'}</span>
    </button>
  );
}
