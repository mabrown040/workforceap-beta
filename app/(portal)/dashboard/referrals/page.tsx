import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isReadOnlyPortalAuditHeader } from '@/lib/audit/readOnlyPortalAudit';
import { DesignSurface, PageOpener } from '@/components/portal/kit';
import ReferralShareCard from '../points/ReferralShareCard';
import styles from '../points/ReferralShareCard.module.css';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({ title: 'Invite a friend', description: 'Share WorkforceAP career training and support with someone you know.', path: '/dashboard/referrals' });
}

export default async function ReferralsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/referrals');
  const readOnlyAudit = isReadOnlyPortalAuditHeader(await headers());
  return (
    <DesignSurface surface="warm">
      <section className={styles.page}>
        <PageOpener kicker="Your community" title="Invite a friend" lede="Help someone take their next career step." />
        {readOnlyAudit ? <p data-portal-audit-suppressed="member-referral-code-mint">Referral link generation is paused in read-only review.</p> : <ReferralShareCard />}
      </section>
    </DesignSurface>
  );
}
