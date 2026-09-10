'use client';

import { useRef } from 'react';
import { CardHead } from '@/components/portal/kit';
import CopyReferralLink from '@/components/partner/CopyReferralLink';
import styles from './PartnerReferralShare.module.css';

/** Existing attribution, brought into the default journey; copying never sends. */
export default function PartnerReferralShare({
  url,
  referralCode,
}: {
  url: string;
  referralCode: string;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  return (
    <section className={`wa-kit-card ${styles.panel}`} aria-label="Share your referral link">
      <header className={styles.intro}>
        <CardHead title="Share your referral link" />
        <p>Use this link to connect applications to your organization.</p>
      </header>
      <CopyReferralLink url={url} onCopyError={() => { if (details.current) details.current.open = true; }} />
      <details ref={details} className={styles.details}>
        <summary className="wa-kit-focus">View link and referral code</summary>
        <a href={url} className={`wa-kit-focus ${styles.link}`}>{url}</a>
        <p className={styles.code}>Referral code: {referralCode}</p>
      </details>
    </section>
  );
}
