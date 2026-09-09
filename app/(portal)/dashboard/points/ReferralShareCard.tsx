'use client';

import { useEffect, useState } from 'react';
import { Copy, Share2 } from 'lucide-react';
import { trackMemberReferralShare } from '@/lib/analytics/events';
import { postMemberEvent } from '@/lib/events/client';
import { safeParseResponseJson } from '@/lib/http/safeFetchJson';
import { POINT_VALUES } from '@/lib/member/pointsConfig';
import { buildReferralInvitation, ReferralShareDataSchema, type ReferralShareData } from '@/lib/member/referralSharing';
import { CardHead, FormField } from '@/components/portal/kit';

/** Own referral link and aggregate rewards; copying/sharing never sends an email. */
export default function ReferralShareCard() {
  const [data, setData] = useState<ReferralShareData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [actionError, setActionError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [nativeShare, setNativeShare] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setNativeShare(typeof navigator.share === 'function');
    setLoadError(false);
    (async () => {
      try {
        const res = await fetch('/api/member/referral', { signal: controller.signal });
        const parsed = await safeParseResponseJson(res);
        const result = ReferralShareDataSchema.safeParse(parsed.data);
        if (!res.ok || !parsed.ok || !result.success) throw new Error('Referral details unavailable');
        if (active) setData(result.data);
      } catch {
        if (active) setLoadError(true);
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [attempt]);

  const shareUrl = data ? `${window.location.origin}${data.sharePath}` : '';
  const message = buildReferralInvitation(shareUrl);

  async function copy(kind: 'link' | 'message') {
    setFeedback(''); setActionError('');
    try {
      await navigator.clipboard.writeText(kind === 'link' ? shareUrl : message);
      setFeedback(kind === 'link' ? 'Link copied.' : 'Invitation message copied. Paste it into your own message when you are ready.');
      if (kind === 'link') {
        trackMemberReferralShare('copy_link');
        void postMemberEvent({ eventName: 'member_referral_link_copied', entityType: 'member_referral', metadata: { action: 'copy_link' }, sourcePage: window.location.pathname });
      }
    } catch {
      setActionError(`Copying is unavailable in this browser. Select the ${kind === 'link' ? 'link' : 'invitation message'} below and copy it manually.`);
    }
  }

  async function share() {
    setFeedback(''); setActionError(''); setSharing(true);
    try {
      await navigator.share({ title: 'Explore WorkforceAP', text: message });
      setFeedback('Sharing completed.');
    } catch (error) {
      if (!(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')) {
        setActionError('Sharing is unavailable right now. Copy the link or invitation message instead.');
      }
    } finally { setSharing(false); }
  }

  return (
    <section className="wa-kit-card wa-space-y-4" aria-label="Invite a friend">
      <CardHead title="Share an opportunity" />
      <p style={{ color: 'var(--wa-muted)', fontSize: 'var(--wa-type-body)', lineHeight: 1.6 }}>
        Know someone considering a career change? Send them a link to explore WorkforceAP. Their application and training details stay private.
      </p>
      {loadError ? (
        <div className="wa-space-y-3">
          <p role="alert">We could not load your referral link. Please try again.</p>
          <button type="button" className="wa-kit-cta wa-kit-focus" onClick={() => setAttempt(value => value + 1)}>Retry loading link</button>
        </div>
      ) : !data ? <p role="status">Loading your referral link…</p> : (
        <>
          <div className="wa-flex wa-flex-wrap wa-gap-3">
            <button type="button" className="wa-kit-cta wa-kit-focus" onClick={() => copy('link')}><Copy size={16} aria-hidden />Copy link</button>
            <button type="button" className="wa-kit-cta wa-kit-cta--ghost wa-kit-focus" onClick={() => copy('message')}>Copy invitation message</button>
            {nativeShare && <button type="button" className="wa-kit-cta wa-kit-cta--ghost wa-kit-focus" onClick={share} disabled={sharing}><Share2 size={16} aria-hidden />{sharing ? 'Opening share options…' : 'Share…'}</button>}
          </div>
          <p role="status" aria-live="polite" style={{ color: 'var(--wa-muted)' }}>{feedback}</p>
          {actionError && <p role="alert">{actionError}</p>}
          <FormField label="Your referral link" readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} />
          <FormField label="Invitation message">
            <textarea readOnly value={message} rows={5} onFocus={event => event.currentTarget.select()} className="wa-kit-control" style={{ width: '100%', resize: 'vertical', padding: 'var(--wa-pad-sm)', border: '1px solid var(--wa-border)', borderRadius: 'var(--wa-radius-sm)', background: 'var(--wa-surface)', color: 'var(--wa-text)', fontSize: 'var(--wa-type-body)', lineHeight: 1.6 }} />
          </FormField>
          <p style={{ color: 'var(--wa-muted)', fontSize: 'var(--wa-type-meta)' }}>Copying creates a message for you to send. WorkforceAP does not contact anyone from this page.</p>
          <p><strong>{data.rewardedCount}</strong> recorded referral reward{data.rewardedCount === 1 ? '' : 's'}</p>
          <details>
            <summary className="wa-kit-focus" style={{ cursor: 'pointer', minHeight: '2.75rem', color: 'var(--wa-text)' }}>How referral points work</summary>
            <p style={{ color: 'var(--wa-muted)', lineHeight: 1.6 }}>A recorded referral reward adds {POINT_VALUES.referral_referrer_reward} points for you and {POINT_VALUES.referral_referee_reward} for your friend. Tracking currently requires your friend to use the same browser and enroll through their member dashboard within 30 days; signup or staff-assisted enrollment may not record a reward.</p>
          </details>
        </>
      )}
    </section>
  );
}
