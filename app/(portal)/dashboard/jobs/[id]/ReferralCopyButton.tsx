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
      className="btn btn-outline"
      style={{ fontSize: '0.85rem' }}
      onClick={() => void handleCopy()}
    >
      <span aria-live="polite">{copied ? 'Copied ✓' : 'Copy message'}</span>
    </button>
  );
}
