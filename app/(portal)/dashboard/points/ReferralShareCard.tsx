'use client';

import { useEffect, useState } from 'react';
import { Users, Copy, Check } from 'lucide-react';
import { trackMemberReferralShare } from '@/lib/analytics/events';
import { postMemberEvent } from '@/lib/events/client';
import { safeParseResponseJson } from '@/lib/http/safeFetchJson';
import { POINT_VALUES } from '@/lib/member/pointsConfig';
import { CardHead } from '@/components/portal/kit';

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
      trackMemberReferralShare('copy_link');
      void postMemberEvent({
        eventName: 'member_referral_link_copied',
        entityType: 'member_referral',
        metadata: { action: 'copy_link' },
        sourcePage: '/dashboard/points',
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the input is selectable as a fallback */
    }
  }

  return (
    <section className="wa-kit-card">
      <CardHead title="Invite a friend" />
      <div className="wa-flex wa-items-center wa-gap-3" style={{ marginBottom: 14, marginTop: -4 }}>
        <div
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--wa-radius-sm)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'color-mix(in srgb, var(--wa-gold) 14%, transparent)',
            color: 'var(--wa-gold)',
          }}
        >
          <Users size={18} />
        </div>
        <p style={{ margin: 0, color: 'var(--wa-muted)', lineHeight: 1.6, fontSize: '0.875rem' }}>
          Share your link. When a friend joins and enrolls in a program, you earn{' '}
          <strong style={{ color: 'var(--wa-text)' }}>{referrerReward} points</strong> and they start with{' '}
          <strong style={{ color: 'var(--wa-text)' }}>{refereeReward}</strong>.
        </p>
      </div>

      <div className="wa-flex wa-gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          readOnly
          value={data ? shareUrl : 'Generating your link…'}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Your referral link"
          style={{
            flex: '1 1 16rem',
            minWidth: 0,
            padding: '0.6rem 0.75rem',
            borderRadius: 'var(--wa-radius-sm)',
            border: '1px solid var(--wa-border)',
            background: 'var(--wa-surface-2)',
            color: 'var(--wa-text)',
            fontSize: '0.85rem',
          }}
        />
        <button
          type="button"
          onClick={copy}
          disabled={!data}
          className="wa-kit-focus enabled:hover:wa-opacity-90 enabled:active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            minHeight: 40,
            padding: '8px 16px',
            background: 'var(--wa-accent)',
            color: 'var(--wa-on-accent)',
            fontWeight: 700,
            fontSize: 13,
            borderRadius: 999,
            border: 'none',
            cursor: data ? 'pointer' : 'not-allowed',
            opacity: data ? 1 : 0.6,
          }}
        >
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          <span aria-live="polite">{copied ? 'Copied!' : 'Copy link'}</span>
        </button>
      </div>

      {data && data.rewardedCount > 0 ? (
        <p style={{ margin: '0.85rem 0 0', fontSize: '0.85rem', color: 'var(--wa-muted)' }}>
          {data.rewardedCount} friend{data.rewardedCount === 1 ? '' : 's'} you referred {data.rewardedCount === 1 ? 'has' : 'have'} enrolled. Thank you!
        </p>
      ) : null}
    </section>
  );
}
