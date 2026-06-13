'use client';

import { useEffect, useState } from 'react';
import { safeParseResponseJson } from '@/lib/http/safeFetchJson';
import { POINT_VALUES } from '@/lib/member/pointsConfig';

type ReferralData = { code: string; sharePath: string; rewardedCount: number };

/**
 * Member referral share card. Lazily mints (on first load) the member's referral
 * code via GET /api/member/referral and offers a copy-to-clipboard share link.
 * Both the referrer and the friend earn points once the friend enrolls.
 */
export default function ReferralShareCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/member/referral');
        if (!res.ok) throw new Error('failed');
        const parsed = await safeParseResponseJson<ReferralData>(res);
        if (active && parsed.ok && parsed.data?.code) setData(parsed.data);
        else if (active) setError(true);
      } catch {
        if (active) setError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (error) return null; // fail quiet — referral is a bonus, never blocks the page

  const shareUrl = data ? `${window.location.origin}${data.sharePath}` : '';
  const referrerReward = POINT_VALUES.referral_referrer_reward ?? 0;
  const refereeReward = POINT_VALUES.referral_referee_reward ?? 0;

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the input is selectable as a fallback */
    }
  }

  return (
    <section className="portal-card portal-card--flat" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>
          group_add
        </span>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Invite a friend</h2>
      </div>
      <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, fontSize: '0.9rem' }}>
        Share your link. When a friend joins and enrolls in a program, you earn{' '}
        <strong>{referrerReward} points</strong> and they start with <strong>{refereeReward}</strong>.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          readOnly
          value={data ? shareUrl : 'Generating your link…'}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Your referral link"
          style={{
            flex: '1 1 16rem',
            minWidth: 0,
            padding: '0.6rem 0.75rem',
            borderRadius: 8,
            border: '1px solid var(--color-outline)',
            background: 'var(--color-surface)',
            color: 'var(--color-on-surface)',
            fontSize: '0.85rem',
          }}
        />
        <button
          type="button"
          onClick={copy}
          disabled={!data}
          className="btn btn-primary"
          style={{ whiteSpace: 'nowrap' }}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      {data && data.rewardedCount > 0 ? (
        <p style={{ margin: '0.85rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
          {data.rewardedCount} friend{data.rewardedCount === 1 ? '' : 's'} you referred {data.rewardedCount === 1 ? 'has' : 'have'} enrolled. Thank you!
        </p>
      ) : null}
    </section>
  );
}
